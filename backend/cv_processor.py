"""
cv_processor.py — Perception Layer
Responsibilities:
  1. Image normalization (resize, color space)
  2. Noise reduction via GaussianBlur
  3. Contrast enhancement via CLAHE
  4. Clock Dial Orientation Mapping (12=Front, 3=Right, 6=Rear, 9=Left)
  5. Point of Impact (POI) extraction via Canny edge centroids
  6. Damage heatmap generation (JET colormap on gradient magnitude)

Output: PerceptionResult (see models.py)
"""
from __future__ import annotations

import base64
import logging
import os
import uuid
from pathlib import Path
from typing import Tuple

import cv2
import numpy as np

from models import (
    DamageRegion,
    ImageMetrics,
    Orientation,
    PerceptionResult,
)

logger = logging.getLogger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────────
TARGET_WIDTH = 1024
TARGET_HEIGHT = 768
GAUSSIAN_KERNEL = (5, 5)
CLAHE_CLIP_LIMIT = 2.0
CLAHE_TILE_GRID = (8, 8)
CANNY_LOW = 50
CANNY_HIGH = 150
MIN_CONTOUR_AREA = 200   # px² — discard noise contours


# ── Public Entry Point ────────────────────────────────────────────────────────

def process_image(
    image_bytes: bytes,
    heatmap_dir: str = "uploads/heatmaps",
    claim_id: str | None = None,
) -> PerceptionResult:
    """
    Full perception pipeline: normalize → denoise → enhance → orient → heatmap.

    Args:
        image_bytes: Raw bytes from uploaded file.
        heatmap_dir: Directory to write heatmap PNG.
        claim_id: Optional claim ID for heatmap filename.

    Returns:
        PerceptionResult with all perception layer outputs.
    """
    if not claim_id:
        claim_id = str(uuid.uuid4())[:8]

    # ── Decode ────────────────────────────────────────────────────────────────
    nparr = np.frombuffer(image_bytes, np.uint8)
    img_raw = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img_raw is None:
        raise ValueError("Unable to decode image — ensure it is a valid JPEG/PNG.")

    # ── Step 1: Normalize ─────────────────────────────────────────────────────
    img_normalized = _normalize(img_raw)

    # ── Step 2: GaussianBlur noise reduction ──────────────────────────────────
    img_denoised = cv2.GaussianBlur(img_normalized, GAUSSIAN_KERNEL, 0)

    # ── Step 3: CLAHE contrast enhancement ───────────────────────────────────
    img_enhanced = _apply_clahe(img_denoised)

    # ── Step 4: Compute image metrics ─────────────────────────────────────────
    metrics = _compute_image_metrics(img_enhanced)

    # ── Step 5: Canny edge detection → damage regions ────────────────────────
    gray = cv2.cvtColor(img_enhanced, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, CANNY_LOW, CANNY_HIGH)
    damage_regions = _extract_damage_regions(edges)

    # ── Step 6: Clock Dial Orientation → POI ─────────────────────────────────
    h, w = img_enhanced.shape[:2]
    poi, orientation_code = _clock_dial_poi(damage_regions, w, h)

    # ── Step 7: Heatmap overlay generation ───────────────────────────────────
    heatmap_path = _generate_heatmap(
        img_enhanced, edges, heatmap_dir, claim_id
    )

    # ── Step 8: Base64 encode enhanced image for LLM ─────────────────────────
    _, buffer = cv2.imencode(".jpg", img_enhanced, [cv2.IMWRITE_JPEG_QUALITY, 85])
    img_b64 = base64.b64encode(buffer).decode("utf-8")

    return PerceptionResult(
        poi=poi,
        orientation=orientation_code,
        damage_regions=damage_regions,
        image_metrics=metrics,
        normalized_image_b64=img_b64,
        heatmap_path=heatmap_path,
    )


# ── Private Helpers ───────────────────────────────────────────────────────────

def _normalize(img: np.ndarray) -> np.ndarray:
    """Resize to target resolution preserving aspect ratio with letterboxing."""
    h, w = img.shape[:2]
    scale = min(TARGET_WIDTH / w, TARGET_HEIGHT / h)
    new_w, new_h = int(w * scale), int(h * scale)
    resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

    # Create canvas and center the image
    canvas = np.zeros((TARGET_HEIGHT, TARGET_WIDTH, 3), dtype=np.uint8)
    y_off = (TARGET_HEIGHT - new_h) // 2
    x_off = (TARGET_WIDTH - new_w) // 2
    canvas[y_off : y_off + new_h, x_off : x_off + new_w] = resized
    return canvas


def _apply_clahe(img_bgr: np.ndarray) -> np.ndarray:
    """Apply CLAHE to luminance channel (LAB color space)."""
    lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(
        clipLimit=CLAHE_CLIP_LIMIT, tileGridSize=CLAHE_TILE_GRID
    )
    l_enhanced = clahe.apply(l_channel)
    lab_enhanced = cv2.merge([l_enhanced, a_channel, b_channel])
    return cv2.cvtColor(lab_enhanced, cv2.COLOR_LAB2BGR)


def _compute_image_metrics(img: np.ndarray) -> ImageMetrics:
    """Compute brightness, blur score, contrast."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    brightness = float(np.mean(gray) / 255.0)
    blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    contrast_score = float(np.std(gray.astype(np.float32)) / 128.0)
    contrast_score = min(contrast_score, 1.0)
    h, w = img.shape[:2]
    return ImageMetrics(
        brightness=round(brightness, 4),
        blur_score=round(blur_score, 2),
        resolution=[w, h],
        contrast_score=round(contrast_score, 4),
    )


def _extract_damage_regions(edges: np.ndarray) -> list[DamageRegion]:
    """Find contours in edge map — each significant contour = damage region."""
    contours, _ = cv2.findContours(
        edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    regions = []
    for idx, cnt in enumerate(contours):
        area = int(cv2.contourArea(cnt))
        if area < MIN_CONTOUR_AREA:
            continue
        m = cv2.moments(cnt)
        if m["m00"] == 0:
            continue
        cx = m["m10"] / m["m00"]
        cy = m["m01"] / m["m00"]
        x, y, bw, bh = cv2.boundingRect(cnt)
        # Gradient intensity = normalised area relative to edge density
        grad_intensity = min(area / 50000.0, 1.0)
        regions.append(
            DamageRegion(
                region_id=len(regions) + 1,
                area_px=area,
                centroid=[round(cx, 1), round(cy, 1)],
                bounding_box=[x, y, x + bw, y + bh],
                gradient_intensity=round(grad_intensity, 4),
            )
        )
    # Sort by area descending
    return sorted(regions, key=lambda r: r.area_px, reverse=True)[:10]


def _clock_dial_poi(
    regions: list[DamageRegion], img_w: int, img_h: int
) -> Tuple[str, str]:
    """
    Map damage centroid to clock-dial orientation.

    Quadrant mapping:
        cy_norm < 0.4              → 12 (Front)
        cy_norm > 0.6              → 6  (Rear)
        cx_norm < 0.4              → 9  (Left)
        cx_norm > 0.6              → 3  (Right)

    Compound (e.g. cx<0.4 AND cy<0.4) → Front-Left

    Returns: (poi_label, clock_code)
    """
    if not regions:
        return Orientation.UNKNOWN.value, "?"

    # Weighted centroid by area across all regions
    total_area = sum(r.area_px for r in regions)
    wx = sum(r.centroid[0] * r.area_px for r in regions) / total_area
    wy = sum(r.centroid[1] * r.area_px for r in regions) / total_area

    cx_norm = wx / img_w
    cy_norm = wy / img_h

    # Horizontal sector
    if cx_norm < 0.4:
        h_sector = "Left"
        h_clock = "9"
    elif cx_norm > 0.6:
        h_sector = "Right"
        h_clock = "3"
    else:
        h_sector = "Center"
        h_clock = "C"

    # Vertical sector
    if cy_norm < 0.4:
        v_sector = "Front"
        v_clock = "12"
    elif cy_norm > 0.6:
        v_sector = "Rear"
        v_clock = "6"
    else:
        v_sector = "Mid"
        v_clock = "M"

    # Compound POI
    if v_sector == "Mid" and h_sector == "Center":
        poi = "Center"
        code = "C"
    elif v_sector == "Mid":
        poi = h_sector
        code = h_clock
    elif h_sector == "Center":
        poi = v_sector
        code = v_clock
    else:
        poi = f"{v_sector}-{h_sector}"
        code = f"{v_clock}-{h_clock}"

    return poi, code


def _generate_heatmap(
    img: np.ndarray,
    edges: np.ndarray,
    heatmap_dir: str,
    claim_id: str,
) -> str:
    """
    Produce a JET colormap overlay of the gradient magnitude onto the image.
    Saves to heatmap_dir/<claim_id>_heatmap.png and returns the path.
    """
    Path(heatmap_dir).mkdir(parents=True, exist_ok=True)

    # Compute gradient magnitude using Sobel
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    grad_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    magnitude = np.sqrt(grad_x**2 + grad_y**2)
    magnitude = np.uint8(255 * magnitude / (magnitude.max() + 1e-6))

    # Apply Gaussian smoothing for smooth heatmap blobs
    magnitude_smooth = cv2.GaussianBlur(magnitude, (21, 21), 0)

    # JET colormap
    heatmap_colored = cv2.applyColorMap(magnitude_smooth, cv2.COLORMAP_JET)

    # Alpha blend with original
    alpha = 0.45
    overlay = cv2.addWeighted(img, 1 - alpha, heatmap_colored, alpha, 0)

    # Draw damage region bounding boxes on overlay
    damage_regions = _extract_damage_regions(edges)
    for region in damage_regions[:5]:
        x1, y1, x2, y2 = region.bounding_box
        cv2.rectangle(overlay, (x1, y1), (x2, y2), (0, 255, 255), 2)
        cv2.putText(
            overlay,
            f"Region {region.region_id}",
            (x1, max(y1 - 6, 10)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (0, 255, 255),
            1,
            cv2.LINE_AA,
        )

    filename = f"{claim_id}_heatmap.png"
    filepath = os.path.join(heatmap_dir, filename)
    cv2.imwrite(filepath, overlay)
    logger.info(f"Heatmap saved → {filepath}")
    return filepath
