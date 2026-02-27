"""
main.py — FastAPI Gateway
Orchestrates the four-layer pipeline:
  CV Processor → YOLOv8 Detector → LLM Reasoning Agent → Pricing Engine

Endpoints:
  POST /api/analyze            — Upload images and trigger full analysis
  GET  /api/estimate/{id}      — Retrieve stored claim result
  GET  /api/claims             — List recent claims
  GET  /api/health             — Liveness check
  Static /static/heatmaps      — Serve heatmap PNGs
"""
from __future__ import annotations

import logging
import os
import time
import uuid
from pathlib import Path
from typing import List, Optional

import aiofiles
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

# Load .env before importing modules that read env vars
load_dotenv()

import cv_processor
import database
import detector
import llm_agent
import pricing_service
from models import (
    ClaimAnalysisResponse,
    PricingMode,
    VehicleClass,
    WorkshopType,
)

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("main")

# ── Directories ───────────────────────────────────────────────────────────────
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
HEATMAP_DIR = os.getenv("HEATMAP_DIR", "uploads/heatmaps")
Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
Path(HEATMAP_DIR).mkdir(parents=True, exist_ok=True)

# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Motor Claim Estimator API",
    description=(
        "AI-powered motor insurance claim estimation: "
        "OpenCV → YOLOv8 → Gemini Vision → Deterministic Pricing Engine"
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ───────────────────────────────────────────────────────────────────────
origins = os.getenv(
    "CORS_ORIGINS", "http://localhost:5173,http://localhost:3000"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Serve heatmap images ──────────────────────────────────────────────────────
app.mount("/static", StaticFiles(directory=UPLOAD_DIR), name="static")


# ── Startup ────────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    database.init_db()
    logger.info("Motor Claim Estimator API started.")
    logger.info(f"Approval threshold: ₹{pricing_service.APPROVAL_THRESHOLD:,.0f}")
    logger.info(f"GST rate: {pricing_service.GST_RATE * 100:.0f}%")


# ── Health ─────────────────────────────────────────────────────────────────────
@app.get("/api/health", tags=["System"])
async def health():
    return {
        "status": "ok",
        "version": "1.0.0",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
    }


# ── Main Analysis Endpoint ────────────────────────────────────────────────────
@app.post(
    "/api/analyze",
    response_model=ClaimAnalysisResponse,
    status_code=status.HTTP_200_OK,
    tags=["Claims"],
    summary="Upload vehicle damage images for instant AI estimate",
)
async def analyze_claim(
    images: List[UploadFile] = File(..., description="1–6 vehicle damage images"),
    vehicle_class: str = Form("hatchback", description="hatchback | sedan | suv | luxury"),
    workshop_type: str = Form("independent", description="independent | showroom"),
    pricing_mode: str = Form("aftermarket", description="oem | aftermarket"),
    vehicle_make: Optional[str] = Form(None, description="Vehicle make e.g. maruti, hyundai"),
):
    """
    Full pipeline:
      1. Validate + decode images
      2. CV Processor (normalize, denoise, enhance, POI, heatmap)
      3. YOLOv8 Detection (parts + damage types)
      4. Gemini LLM Reasoning (REPAIR / REPLACE + severity)
      5. Pricing Engine (deterministic cost lookup + GST + pre-approval)
      6. Persist to DB and return response
    """
    t_start = time.time()
    claim_id = f"CLM-{time.strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}-HYD"
    errors: list[str] = []

    # ── Validate inputs ────────────────────────────────────────────────────────
    try:
        v_class = VehicleClass(vehicle_class.lower())
        w_type = WorkshopType(workshop_type.lower())
        p_mode = PricingMode(pricing_mode.lower())
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if not images:
        raise HTTPException(status_code=422, detail="At least one image is required.")
    if len(images) > 6:
        raise HTTPException(status_code=422, detail="Maximum 6 images per claim.")

    # ── Read all image bytes ──────────────────────────────────────────────────
    images_bytes: list[bytes] = []
    for img_file in images:
        content_type = img_file.content_type or ""
        if not content_type.startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail=f"File '{img_file.filename}' is not an image.",
            )
        raw = await img_file.read()
        if len(raw) < 1024:
            raise HTTPException(
                status_code=400,
                detail=f"File '{img_file.filename}' appears to be empty or corrupt.",
            )
        images_bytes.append(raw)

    # ── Use first image as primary (largest damage area) ─────────────────────
    # Future: merge across multiple images — currently process primary + extend detections
    primary_bytes = images_bytes[0]

    # ══════════════════════════════════════════════════════════════════════════
    # LAYER 1: CV Processor
    # ══════════════════════════════════════════════════════════════════════════
    logger.info(f"[{claim_id}] Layer 1: CV Processing")
    try:
        perception = cv_processor.process_image(
            primary_bytes,
            heatmap_dir=HEATMAP_DIR,
            claim_id=claim_id,
        )
    except Exception as exc:
        logger.error(f"[{claim_id}] CV Processor failed: {exc}")
        raise HTTPException(status_code=400, detail=f"Image processing failed: {exc}")

    # Validate image quality
    if perception.image_metrics.blur_score < 20:
        errors.append(
            f"Image may be blurry (blur_score={perception.image_metrics.blur_score:.1f}). "
            "Results may be less accurate."
        )

    # ══════════════════════════════════════════════════════════════════════════
    # LAYER 2: YOLOv8 Detection
    # ══════════════════════════════════════════════════════════════════════════
    logger.info(f"[{claim_id}] Layer 2: YOLO Detection ({len(images_bytes)} images)")
    try:
        detection_result = detector.detect_damage(primary_bytes, perception)

        # If multiple images: run detection on each and merge detections
        if len(images_bytes) > 1:
            for extra_bytes in images_bytes[1:]:
                try:
                    extra_perc = cv_processor.process_image(
                        extra_bytes, heatmap_dir=HEATMAP_DIR, claim_id=f"{claim_id}-x"
                    )
                    extra_det = detector.detect_damage(extra_bytes, extra_perc)
                    # Merge: add any parts not yet in primary detection
                    existing_keys = {d.part_key for d in detection_result.detections}
                    for det in extra_det.detections:
                        if det.part_key not in existing_keys:
                            detection_result.detections.append(det)
                            existing_keys.add(det.part_key)
                except Exception as e:
                    logger.warning(f"[{claim_id}] Extra image processing failed: {e}")

    except Exception as exc:
        logger.error(f"[{claim_id}] Detection failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Detection engine failed: {exc}")

    if not detection_result.detections:
        raise HTTPException(
            status_code=422,
            detail=(
                "No damage detected in the uploaded image(s). "
                "Please upload clearer exterior vehicle photos."
            ),
        )

    # ══════════════════════════════════════════════════════════════════════════
    # LAYER 3: LLM Reasoning Agent
    # ══════════════════════════════════════════════════════════════════════════
    logger.info(f"[{claim_id}] Layer 3: LLM Reasoning ({len(detection_result.detections)} parts)")
    try:
        llm_result = llm_agent.reason_repairs(
            detection_result.detections, perception
        )
        if llm_result.model_used == "heuristic-fallback":
            errors.append(
                "LLM API unavailable — repair decisions based on CV heuristics. "
                "Configure GEMINI_API_KEY for full AI reasoning."
            )
    except Exception as exc:
        logger.error(f"[{claim_id}] LLM Agent failed: {exc}")
        raise HTTPException(status_code=503, detail=f"LLM reasoning failed: {exc}")

    # ══════════════════════════════════════════════════════════════════════════
    # LAYER 4: Pricing Engine
    # ══════════════════════════════════════════════════════════════════════════
    logger.info(f"[{claim_id}] Layer 4: Pricing Engine")
    try:
        estimate = pricing_service.compute_estimate(
            llm_result,
            vehicle_class=v_class,
            workshop_type=w_type,
            pricing_mode=p_mode,
        )
    except FileNotFoundError as exc:
        logger.error(f"[{claim_id}] Pricing catalog error: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        logger.error(f"[{claim_id}] Pricing engine failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Pricing computation failed: {exc}")

    # ── Build heatmap URL ──────────────────────────────────────────────────────
    heatmap_filename = f"{claim_id}_heatmap.png"
    heatmap_url = f"/static/heatmaps/{heatmap_filename}"

    # ── Assemble response ─────────────────────────────────────────────────────
    elapsed_ms = round((time.time() - t_start) * 1000, 1)
    logger.info(
        f"[{claim_id}] Analysis complete in {elapsed_ms}ms | "
        f"₹{estimate.grand_total_inr:,.0f} | {estimate.approval_status.value}"
    )

    response = ClaimAnalysisResponse(
        claim_id=claim_id,
        status="success",
        perception=perception,
        detections=detection_result,
        repair_decisions=llm_result,
        estimate=estimate,
        heatmap_url=heatmap_url,
        processing_time_ms=elapsed_ms,
        errors=errors,
    )

    # ── Persist to database ───────────────────────────────────────────────────
    try:
        database.save_claim(
            claim_id=claim_id,
            status=estimate.approval_status.value,
            payload=response.model_dump(mode="json"),
        )
    except Exception as exc:
        logger.warning(f"[{claim_id}] DB save failed (non-fatal): {exc}")

    return response


# ── Retrieve Stored Estimate ──────────────────────────────────────────────────
@app.get(
    "/api/estimate/{claim_id}",
    tags=["Claims"],
    summary="Retrieve a stored claim estimate by ID",
)
async def get_estimate(claim_id: str):
    payload = database.get_claim(claim_id)
    if payload is None:
        raise HTTPException(status_code=404, detail=f"Claim '{claim_id}' not found.")
    return payload


# ── List Claims ───────────────────────────────────────────────────────────────
@app.get("/api/claims", tags=["Claims"], summary="List recent claims")
async def list_claims(limit: int = 20):
    return database.list_claims(limit=limit)


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
