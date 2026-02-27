"""
pricing_service.py — Deterministic Financial Engine
Responsibilities:
  1. Load parts_catalog.csv and labor_rates.csv from .agent/skills/pricing/resources/
  2. Look up part cost by vehicle_class + part_key (fuzzy match if needed)
  3. Apply labor cost based on operation + workshop_type
  4. Apply GST (configurable via env)
  5. Compute grand total + pre-approval decision
  6. LLM decisions input — pricing is 100% deterministic, never LLM-driven

Pre-Approval Rule:
  grand_total_inr < APPROVAL_THRESHOLD → AUTO_APPROVE
  grand_total_inr >= APPROVAL_THRESHOLD → MANUAL_REVIEW
"""
from __future__ import annotations

import logging
import os
from functools import lru_cache
from pathlib import Path
from typing import Optional

import pandas as pd

from models import (
    ApprovalStatus,
    EstimateLineItem,
    EstimateResult,
    LLMResult,
    PartDecision,
    PricingMode,
    RepairDecision,
    VehicleClass,
    WorkshopType,
)

logger = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────
APPROVAL_THRESHOLD = float(os.getenv("APPROVAL_THRESHOLD", "50000"))
GST_RATE = float(os.getenv("GST_RATE", "0.18"))

_BASE_DIR = Path(__file__).parent.parent
PRICING_CATALOG_PATH = os.getenv(
    "PRICING_CATALOG_PATH",
    str(_BASE_DIR / ".agent" / "skills" / "pricing" / "resources" / "parts_catalog.csv"),
)
LABOR_RATES_PATH = os.getenv(
    "LABOR_RATES_PATH",
    str(_BASE_DIR / ".agent" / "skills" / "pricing" / "resources" / "labor_rates.csv"),
)

# ── Operation key mapping (part_key prefix → labor operation key) ─────────────
PART_TO_LABOR_OP = {
    "front_bumper": "replace_bumper",
    "rear_bumper": "replace_bumper",
    "hood": "replace_hood",
    "door_front_left": "replace_door",
    "door_front_right": "replace_door",
    "door_rear_left": "replace_door",
    "door_rear_right": "replace_door",
    "headlamp_left": "replace_lamp",
    "headlamp_right": "replace_lamp",
    "tail_lamp_left": "replace_lamp",
    "tail_lamp_right": "replace_lamp",
    "fender_left": "replace_fender",
    "fender_right": "replace_fender",
    "windshield_front": "replace_windshield",
    "windshield_rear": "replace_windshield",
    "quarter_panel_left": "replace_panel",
    "quarter_panel_right": "replace_panel",
    "roof_panel": "replace_panel",
    "grille": "replace_panel",
    "fog_lamp_left": "replace_lamp",
    "fog_lamp_right": "replace_lamp",
}


# ── Catalog Loaders (cached) ──────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _load_parts_catalog() -> pd.DataFrame:
    path = Path(PRICING_CATALOG_PATH)
    if not path.exists():
        raise FileNotFoundError(
            f"Parts catalog not found at: {path}\n"
            "Ensure .agent/skills/pricing/resources/parts_catalog.csv exists."
        )
    df = pd.read_csv(path)
    df["part_name"] = df["part_name"].str.strip().str.lower()
    df["vehicle_class"] = df["vehicle_class"].str.strip().str.lower()
    logger.info(f"Parts catalog loaded: {len(df)} entries from {path}")
    return df


@lru_cache(maxsize=1)
def _load_labor_rates() -> pd.DataFrame:
    path = Path(LABOR_RATES_PATH)
    if not path.exists():
        raise FileNotFoundError(
            f"Labor rates not found at: {path}\n"
            "Ensure .agent/skills/pricing/resources/labor_rates.csv exists."
        )
    df = pd.read_csv(path)
    df["operation"] = df["operation"].str.strip().str.lower()
    logger.info(f"Labor rates loaded: {len(df)} entries from {path}")
    return df


# ── Public Entry Point ────────────────────────────────────────────────────────

def compute_estimate(
    llm_result: LLMResult,
    vehicle_class: VehicleClass = VehicleClass.HATCHBACK,
    workshop_type: WorkshopType = WorkshopType.INDEPENDENT,
    pricing_mode: PricingMode = PricingMode.AFTERMARKET,
) -> EstimateResult:
    """
    Generate a deterministic itemized estimate from LLM repair decisions.

    Args:
        llm_result: Repair/replace decisions from the LLM agent.
        vehicle_class: Vehicle category for part cost lookup.
        workshop_type: independent or showroom (affects labor rate).
        pricing_mode: oem or aftermarket (affects part cost).

    Returns:
        EstimateResult with full line items + grand total + approval status.
    """
    parts_df = _load_parts_catalog()
    labor_df = _load_labor_rates()

    line_items: list[EstimateLineItem] = []
    subtotal = 0.0

    for decision in llm_result.decisions:
        line_item = _price_decision(
            decision, parts_df, labor_df,
            vehicle_class, workshop_type, pricing_mode
        )
        line_items.append(line_item)
        subtotal += line_item.subtotal_inr

    gst_amount = round(subtotal * GST_RATE, 2)
    grand_total = round(subtotal + gst_amount, 2)
    approval = (
        ApprovalStatus.AUTO_APPROVE
        if grand_total < APPROVAL_THRESHOLD
        else ApprovalStatus.MANUAL_REVIEW
    )

    logger.info(
        f"Estimate computed: ₹{grand_total:,.0f} | {approval.value} | "
        f"{len(line_items)} parts | {vehicle_class.value} | {workshop_type.value}"
    )

    return EstimateResult(
        line_items=line_items,
        subtotal_inr=round(subtotal, 2),
        gst_inr=gst_amount,
        grand_total_inr=grand_total,
        approval_status=approval,
        approval_threshold_inr=APPROVAL_THRESHOLD,
        gst_rate=GST_RATE,
        vehicle_class=vehicle_class,
        pricing_mode=pricing_mode,
        workshop_type=workshop_type,
    )


# ── Per-Part Pricing ──────────────────────────────────────────────────────────

def _price_decision(
    decision: PartDecision,
    parts_df: pd.DataFrame,
    labor_df: pd.DataFrame,
    vehicle_class: VehicleClass,
    workshop_type: WorkshopType,
    pricing_mode: PricingMode,
) -> EstimateLineItem:
    """Compute cost for one part decision."""

    # ── Part cost lookup ──────────────────────────────────────────────────────
    part_cost, is_estimated = _lookup_part_cost(
        decision.part_key, vehicle_class.value, pricing_mode.value, parts_df
    )

    # ── Labor cost lookup ─────────────────────────────────────────────────────
    labor_cost = _lookup_labor_cost(
        decision.part_key, decision.decision,
        workshop_type.value, labor_df
    )

    subtotal = round(part_cost + labor_cost, 2)
    gst = round(subtotal * GST_RATE, 2)
    total = round(subtotal + gst, 2)

    return EstimateLineItem(
        part=decision.part,
        part_key=decision.part_key,
        action=decision.decision,
        severity_score=decision.severity_score,
        part_cost_inr=part_cost,
        labor_cost_inr=labor_cost,
        subtotal_inr=subtotal,
        gst_inr=gst,
        total_inr=total,
        pricing_mode=pricing_mode,
        workshop_type=workshop_type,
        is_estimated_cost=is_estimated,
        justification=decision.justification,
    )


# ── Catalog Lookups ───────────────────────────────────────────────────────────

def _lookup_part_cost(
    part_key: str,
    vehicle_class: str,
    pricing_mode: str,
    df: pd.DataFrame,
) -> tuple[float, bool]:
    """
    Find part cost from catalog.

    Returns:
        (cost_inr, is_estimated) — is_estimated=True if exact match not found.
    """
    cost_col = "oem_cost_inr" if pricing_mode == "oem" else "aftermarket_cost_inr"

    # Exact match: vehicle_class + part_name
    mask = (df["vehicle_class"] == vehicle_class) & (df["part_name"] == part_key)
    row = df[mask]

    if not row.empty:
        return float(row.iloc[0][cost_col]), False

    # Fallback 1: any class match for this part
    mask_part = df["part_name"] == part_key
    row_part = df[mask_part]
    if not row_part.empty:
        logger.warning(
            f"Part '{part_key}' not found for class '{vehicle_class}'. "
            f"Using '{row_part.iloc[0]['vehicle_class']}' class average."
        )
        return float(row_part.iloc[0][cost_col]), True

    # Fallback 2: vehicle class average
    mask_class = df["vehicle_class"] == vehicle_class
    class_df = df[mask_class]
    if not class_df.empty:
        avg = float(class_df[cost_col].mean())
        logger.warning(
            f"Part '{part_key}' not found at all. Using class '{vehicle_class}' average: ₹{avg:.0f}."
        )
        return round(avg, 2), True

    # Ultimate fallback — should not reach here
    logger.error(f"No pricing data available for part '{part_key}'. Defaulting to ₹5000.")
    return 5000.0, True


def _lookup_labor_cost(
    part_key: str,
    decision: RepairDecision,
    workshop_type: str,
    labor_df: pd.DataFrame,
) -> float:
    """
    Determine labor cost.

    For REPAIR → use repair_panel or repair_crack operation.
    For REPLACE → use part-specific replace_* operation.
    """
    if decision == RepairDecision.REPAIR:
        op_key = "repair_panel"
    else:
        op_key = PART_TO_LABOR_OP.get(part_key, "replace_panel")

    mask = labor_df["operation"] == op_key
    row = labor_df[mask]

    if row.empty:
        logger.warning(f"Labor operation '{op_key}' not found — using replace_panel fallback.")
        mask = labor_df["operation"] == "replace_panel"
        row = labor_df[mask]

    if row.empty:
        return 1500.0  # Hard fallback

    r = row.iloc[0]
    if workshop_type == "showroom":
        # Use midpoint of min/max showroom range
        labor = (float(r["showroom_min_inr"]) + float(r["showroom_max_inr"])) / 2
    else:
        labor = float(r["workshop_inr"])

    return round(labor, 2)
