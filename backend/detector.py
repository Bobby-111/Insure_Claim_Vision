"""
detector.py — YOLOv8 Detection Engine
Responsibilities:
  1. Load YOLOv8n-seg (auto-download on first run)
  2. Run inference on the normalized image
  3. Map COCO detections + spatial position → vehicle part labels
  4. Classify damage type (Dent / Scratch / Crack) via contour geometry
  5. Gate output by confidence threshold
  6. Return DetectionResult with structured part annotations

Part Zone Mapping Strategy (position-based heuristics on vehicle bbox):
  Normalised position of detection bbox within outermost vehicle bounding box:
  ┌─────────────────────────────────┐
  │  Hood (top 30%)                 │
  │  Headlamps (top 25%, LR thirds) │
  │  Front Bumper (top 35%, bot 15%)│
  │  Doors (middle 35–75%)          │
  │  Fenders (sides, 20–55%)        │
  │  Rear Bumper (bottom 15%)       │
  │  Tail Lamps (bottom 25%, LR)    │
  └─────────────────────────────────┘
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import List, Optional

import cv2
import numpy as np
from ultralytics import YOLO

from models import (
    Detection,
    DamageType,
    DetectionResult,
    PerceptionResult,
)

logger = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────
YOLO_MODEL_PATH = os.getenv("YOLO_MODEL_PATH", "yolov8n-seg.pt")
CONF_THRESHOLD = float(os.getenv("YOLO_CONF_THRESHOLD", "0.15"))

# COCO class IDs that indicate a vehicle is present
VEHICLE_CLASS_IDS = {2, 5, 7}  # car, bus, truck

# ── Module-level model singleton ──────────────────────────────────────────────
_model: Optional[YOLO] = None


def _get_model() -> YOLO:
    global _model
    if _model is None:
        logger.info(f"Loading YOLO model: {YOLO_MODEL_PATH}")
        _model = YOLO(YOLO_MODEL_PATH)
    return _model


# ── Public Entry Point ────────────────────────────────────────────────────────

def detect_damage(
    image_bytes: bytes,
    perception: PerceptionResult,
) -> DetectionResult:
    """
    Run YOLOv8 inference on image + overlay damage heuristics.

    Args:
        image_bytes: Raw image bytes (will be decoded internally).
        perception: PerceptionResult from cv_processor (used for POI context).

    Returns:
        DetectionResult with per-part damage annotations.
    """
    model = _get_model()

    # Decode image
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image for YOLO detection.")

    img_h, img_w = img.shape[:2]

    # Run YOLOv8 inference
    results = model(img, conf=CONF_THRESHOLD, verbose=False)
    result = results[0]

    detections: List[Detection] = []

    # ── Locate outermost vehicle bounding box ─────────────────────────────────
    vehicle_bbox = _find_vehicle_bbox(result, img_w, img_h)

    # ── Process each detection: map to part + classify damage ────────────────
    for box in result.boxes:
        cls_id = int(box.cls[0])
        confidence = float(box.conf[0])

        if confidence < CONF_THRESHOLD:
            continue

        x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]
        area_px = (x2 - x1) * (y2 - y1)

        # Map spatial position to vehicle part
        part_key, part_label = _map_bbox_to_part(
            x1, y1, x2, y2, vehicle_bbox, perception.poi
        )

        # Classify damage type from bbox geometry + image region
        damage_type = _classify_damage(img, x1, y1, x2, y2)

        detections.append(
            Detection(
                part=part_label,
                part_key=part_key,
                damage_type=damage_type,
                bbox=[x1, y1, x2, y2],
                confidence=round(confidence, 4),
                area_px=area_px,
            )
        )

    # ── Deduplicate: keep highest-confidence detection per part ───────────────
    detections = _deduplicate_parts(detections)

    # ── If YOLO found no vehicles but CV found damage regions ────────────────
    # Synthesize detections from CV damage regions + POI
    if not detections and perception.damage_regions:
        logger.warning(
            "YOLO found no vehicle detections above threshold. "
            "Synthesising detections from CV damage regions."
        )
        detections = _synthesise_from_cv(perception, img_w, img_h)

    logger.info(f"Detection complete — {len(detections)} parts identified.")
    return DetectionResult(
        detections=detections,
        model_used=Path(YOLO_MODEL_PATH).stem,
        image_shape=[img_h, img_w],
    )


# ── Part Zone Mapping ─────────────────────────────────────────────────────────

def _find_vehicle_bbox(result, img_w: int, img_h: int) -> List[int]:
    """Return bounding box of the whole vehicle, or full image as fallback."""
    if result.boxes is None or len(result.boxes) == 0:
        return [0, 0, img_w, img_h]
    # Use the largest detection bbox as the vehicle envelope
    max_area = 0
    best_bbox = [0, 0, img_w, img_h]
    for box in result.boxes:
        x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]
        area = (x2 - x1) * (y2 - y1)
        if area > max_area:
            max_area = area
            best_bbox = [x1, y1, x2, y2]
    return best_bbox


def _map_bbox_to_part(
    x1: int, y1: int, x2: int, y2: int,
    veh_bbox: List[int],
    poi: str,
) -> tuple[str, str]:
    """
    Map a detection bounding box to a vehicle part label using normalized
    position within the vehicle bounding box.

    Returns (part_key, part_label).
    """
    vx1, vy1, vx2, vy2 = veh_bbox
    vw = max(vx2 - vx1, 1)
    vh = max(vy2 - vy1, 1)

    # Centre of detection bbox normalised to vehicle bbox
    cx_n = ((x1 + x2) / 2 - vx1) / vw
    cy_n = ((y1 + y2) / 2 - vy1) / vh
    width_n = (x2 - x1) / vw

    # Determine left/right from POI context
    is_left_impact = "Left" in poi
    is_right_impact = "Right" in poi
    is_front = "Front" in poi or poi == "Center"
    is_rear = "Rear" in poi

    side = _side_from_cx(cx_n, is_left_impact, is_right_impact)

    # ── Part zone rules (vertical bands) ──────────────────────────────────────

    # Hood: top 30% of vehicle height, centre X zone
    if cy_n < 0.30 and 0.2 < cx_n < 0.8:
        return "hood", "Hood"

    # Front bumper: top 40%, wide X
    if cy_n < 0.40 and width_n > 0.3:
        return "front_bumper", "Front Bumper"

    # Headlamps: top 28%, outer thirds
    if cy_n < 0.28 and (cx_n < 0.30 or cx_n > 0.70):
        if cx_n < 0.5:
            return "headlamp_left", "Headlamp (Left)"
        else:
            return "headlamp_right", "Headlamp (Right)"

    # Tail lamps: bottom 25%, outer thirds
    if cy_n > 0.75 and (cx_n < 0.30 or cx_n > 0.70):
        if cx_n < 0.5:
            return "tail_lamp_left", "Tail Lamp (Left)"
        else:
            return "tail_lamp_right", "Tail Lamp (Right)"

    # Rear bumper: bottom 20%, centre
    if cy_n > 0.80 and 0.2 < cx_n < 0.8:
        return "rear_bumper", "Rear Bumper"

    # Fenders: middle vertical band, outer thirds
    if 0.15 < cy_n < 0.55 and (cx_n < 0.25 or cx_n > 0.75):
        if cx_n < 0.5:
            return "fender_left", "Fender (Left)"
        else:
            return "fender_right", "Fender (Right)"

    # Doors: middle vertical band, inner X
    if 0.30 < cy_n < 0.80 and 0.15 < cx_n < 0.85:
        # Front vs rear door split at cy_n 0.50
        if cy_n < 0.55:
            return f"door_front_{side}", f"Front Door ({side.capitalize()})"
        else:
            return f"door_rear_{side}", f"Rear Door ({side.capitalize()})"

    # Quarter panel: lower sides
    if cy_n > 0.55 and (cx_n < 0.25 or cx_n > 0.75):
        if cx_n < 0.5:
            return "quarter_panel_left", "Quarter Panel (Left)"
        else:
            return "quarter_panel_right", "Quarter Panel (Right)"

    # Windshield front fallback
    if cy_n < 0.50 and is_front and 0.15 < cx_n < 0.85:
        return "windshield_front", "Windshield (Front)"

    # Default — use POI orientation to pick best part
    return _default_part_from_poi(poi)


def _side_from_cx(cx_n: float, is_left: bool, is_right: bool) -> str:
    if cx_n < 0.5:
        return "left"
    return "right"


def _default_part_from_poi(poi: str) -> tuple[str, str]:
    """Fallback — return the most-likely dominant part for this POI."""
    poi_lower = poi.lower()
    if "front" in poi_lower:
        return "front_bumper", "Front Bumper"
    if "rear" in poi_lower:
        return "rear_bumper", "Rear Bumper"
    if "left" in poi_lower:
        return "fender_left", "Fender (Left)"
    if "right" in poi_lower:
        return "fender_right", "Fender (Right)"
    return "hood", "Hood"


# ── Damage Classification ─────────────────────────────────────────────────────

def _classify_damage(
    img: np.ndarray, x1: int, y1: int, x2: int, y2: int
) -> DamageType:
    """
    Classify damage type using contour geometry of the region-of-interest.

    Rules:
      - Low circularity (< 0.35) → Crack (elongated shape)
      - High gradient magnitude, small area → Scratch
      - Large low-circularity blobs → Deformation
      - Otherwise → Dent
    """
    roi = img[max(y1, 0):y2, max(x1, 0):x2]
    if roi.size == 0:
        return DamageType.DENT

    gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray_roi, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(
        thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    if not contours:
        return DamageType.DENT

    # Largest contour in ROI
    largest = max(contours, key=cv2.contourArea)
    area = cv2.contourArea(largest)
    perimeter = cv2.arcLength(largest, True) + 1e-6

    if area < 1:
        return DamageType.SCRATCH

    circularity = (4 * np.pi * area) / (perimeter**2)
    roi_area = roi.shape[0] * roi.shape[1]
    area_ratio = area / roi_area

    # Gradient magnitude in ROI
    sobelx = cv2.Sobel(gray_roi, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(gray_roi, cv2.CV_64F, 0, 1, ksize=3)
    grad_mean = float(np.mean(np.sqrt(sobelx**2 + sobely**2)))

    if circularity < 0.35 and area_ratio > 0.15:
        return DamageType.CRACK
    if grad_mean > 60 and area_ratio < 0.10:
        return DamageType.SCRATCH
    if area_ratio > 0.50:
        return DamageType.DEFORMATION
    return DamageType.DENT


# ── Deduplication ─────────────────────────────────────────────────────────────

def _deduplicate_parts(detections: List[Detection]) -> List[Detection]:
    """Keep the highest-confidence detection per part_key."""
    seen: dict[str, Detection] = {}
    for det in detections:
        if det.part_key not in seen or det.confidence > seen[det.part_key].confidence:
            seen[det.part_key] = det
    return list(seen.values())


# ── CV Fallback Synthesis ─────────────────────────────────────────────────────

def _synthesise_from_cv(
    perception: PerceptionResult, img_w: int, img_h: int
) -> List[Detection]:
    """
    When YOLO produces no detections, derive damage annotations from
    CV damage regions and the Point of Impact string.
    This ensures the pipeline never returns empty detections when CV
    clearly found edge/gradient activity.
    """
    detections = []
    poi = perception.poi
    part_key, part_label = _default_part_from_poi(poi)

    for i, region in enumerate(perception.damage_regions[:3]):
        x1, y1, x2, y2 = region.bounding_box
        # Guard against ROI going outside image bounds
        x1 = max(0, x1); y1 = max(0, y1)
        x2 = min(img_w, x2); y2 = min(img_h, y2)

        damage_type = DamageType.DENT
        if region.gradient_intensity > 0.7:
            damage_type = DamageType.CRACK
        elif region.gradient_intensity > 0.4:
            damage_type = DamageType.DENT
        else:
            damage_type = DamageType.SCRATCH

        detections.append(
            Detection(
                part=part_label,
                part_key=part_key,
                damage_type=damage_type,
                bbox=[x1, y1, x2, y2],
                confidence=round(0.50 + region.gradient_intensity * 0.3, 4),
                area_px=region.area_px,
            )
        )

    return _deduplicate_parts(detections)
