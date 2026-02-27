"""
models.py — Pydantic schemas for all inter-layer data contracts.
Each layer reads from and writes to these validated models.
"""
from __future__ import annotations
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


# ── Enumerations ──────────────────────────────────────────────────────────────

class DamageType(str, Enum):
    DENT = "Dent"
    SCRATCH = "Scratch"
    CRACK = "Crack"
    DEFORMATION = "Deformation"
    PAINT_DAMAGE = "Paint Damage"
    UNKNOWN = "Unknown"


class RepairDecision(str, Enum):
    REPAIR = "REPAIR"
    REPLACE = "REPLACE"


class ApprovalStatus(str, Enum):
    AUTO_APPROVE = "AUTO_APPROVE"
    MANUAL_REVIEW = "MANUAL_REVIEW"


class VehicleClass(str, Enum):
    HATCHBACK = "hatchback"
    SEDAN = "sedan"
    SUV = "suv"
    LUXURY = "luxury"


class WorkshopType(str, Enum):
    INDEPENDENT = "independent"
    SHOWROOM = "showroom"


class PricingMode(str, Enum):
    OEM = "oem"
    AFTERMARKET = "aftermarket"


class Orientation(str, Enum):
    FRONT = "Front"
    REAR = "Rear"
    LEFT = "Left"
    RIGHT = "Right"
    FRONT_LEFT = "Front-Left"
    FRONT_RIGHT = "Front-Right"
    REAR_LEFT = "Rear-Left"
    REAR_RIGHT = "Rear-Right"
    UNKNOWN = "Unknown"


# ── CV Perception Layer Outputs ───────────────────────────────────────────────

class DamageRegion(BaseModel):
    region_id: int
    area_px: int
    centroid: List[float] = Field(..., min_length=2, max_length=2)
    bounding_box: List[int] = Field(..., description="[x1, y1, x2, y2]")
    gradient_intensity: float = Field(..., ge=0.0, le=1.0)


class ImageMetrics(BaseModel):
    brightness: float = Field(..., ge=0.0, le=1.0)
    blur_score: float = Field(..., description="Laplacian variance — higher = sharper")
    resolution: List[int] = Field(..., description="[width, height]")
    contrast_score: float = Field(..., ge=0.0, le=1.0)


class PerceptionResult(BaseModel):
    poi: str = Field(..., description="Point of Impact — e.g. Front-Left")
    orientation: str = Field(..., description="Clock dial composite — e.g. 12-9")
    damage_regions: List[DamageRegion]
    image_metrics: ImageMetrics
    normalized_image_b64: Optional[str] = Field(None, description="Base64 normalized image for LLM")
    heatmap_path: Optional[str] = None


# ── Detection Engine Outputs ──────────────────────────────────────────────────

class Detection(BaseModel):
    part: str = Field(..., description="Vehicle part label")
    part_key: str = Field(..., description="Normalized part key e.g. front_bumper")
    damage_type: DamageType
    bbox: List[int] = Field(..., description="[x1, y1, x2, y2] in pixels")
    confidence: float = Field(..., ge=0.0, le=1.0)
    area_px: int


class DetectionResult(BaseModel):
    model_config = {"protected_namespaces": ()}
    detections: List[Detection]
    model_used: str
    image_shape: List[int]


# ── LLM Agent Outputs ─────────────────────────────────────────────────────────

class PartDecision(BaseModel):
    part: str
    part_key: str
    decision: RepairDecision
    severity_score: int = Field(..., ge=1, le=6, description="1=minor, 6=total loss")
    justification: str = Field(..., max_length=200)
    damage_type: DamageType


class LLMResult(BaseModel):
    model_config = {"protected_namespaces": ()}
    decisions: List[PartDecision]
    model_used: str
    prompt_tokens: Optional[int] = None


# ── Pricing Engine Outputs ────────────────────────────────────────────────────

class EstimateLineItem(BaseModel):
    part: str
    part_key: str
    action: RepairDecision
    severity_score: int
    part_cost_inr: float
    labor_cost_inr: float
    subtotal_inr: float
    gst_inr: float
    total_inr: float
    pricing_mode: PricingMode
    workshop_type: WorkshopType
    is_estimated_cost: bool = Field(False, description="True if exact part not in catalog")
    justification: str


class EstimateResult(BaseModel):
    line_items: List[EstimateLineItem]
    subtotal_inr: float
    gst_inr: float
    grand_total_inr: float
    approval_status: ApprovalStatus
    approval_threshold_inr: float
    gst_rate: float
    vehicle_class: VehicleClass
    pricing_mode: PricingMode
    workshop_type: WorkshopType


# ── Full Claim Response ───────────────────────────────────────────────────────

class ClaimAnalysisResponse(BaseModel):
    claim_id: str
    status: str
    perception: PerceptionResult
    detections: DetectionResult
    repair_decisions: LLMResult
    estimate: EstimateResult
    heatmap_url: Optional[str] = None
    processing_time_ms: Optional[float] = None
    errors: List[str] = Field(default_factory=list)


class ClaimAnalysisRequest(BaseModel):
    vehicle_class: VehicleClass = VehicleClass.HATCHBACK
    workshop_type: WorkshopType = WorkshopType.INDEPENDENT
    pricing_mode: PricingMode = PricingMode.AFTERMARKET
    vehicle_make: Optional[str] = None
