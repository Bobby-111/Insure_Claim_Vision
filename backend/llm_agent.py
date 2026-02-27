"""
llm_agent.py — Gemini 1.5 Pro Vision Reasoning Agent
Responsibilities:
  1. Accept normalized image (base64) + detection list + perception signal
  2. Issue a structured prompt to Gemini 1.5 Pro Vision
  3. LLM outputs ONLY: REPAIR | REPLACE per part + severity 1–6 + justification
  4. LLM does NOT output any prices
  5. Validate + parse JSON response with Pydantic
  6. Guard: LLM cannot invent parts not present in detection list

Severity Scale:
  1 = Cosmetic (minor scratch, no structural impact)
  2 = Light surface damage
  3 = Moderate damage — panel affected
  4 = Significant damage — structural concern
  5 = Severe damage — part beyond repair threshold
  6 = Total destruction / safety hazard
"""
from __future__ import annotations

import json
import logging
import os
import re
from typing import List

import google.generativeai as genai
from google.generativeai.types import HarmBlockThreshold, HarmCategory

from models import (
    DamageType,
    Detection,
    LLMResult,
    PartDecision,
    PerceptionResult,
    RepairDecision,
)

logger = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────
GEMINI_MODEL = "gemini-1.5-pro"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Severity threshold above which REPLACE is mandated regardless of LLM
SEVERITY_REPLACE_THRESHOLD = 4

# ── System Prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """
You are a certified vehicle damage assessment analyst for an Indian motor insurance company.

You will be given:
1. A normalized photograph of a damaged vehicle
2. A list of detected damaged parts with bounding boxes and damage types (from computer vision)
3. Point of Impact (POI) information from the CV pipeline

Your ONLY job is to assess repair vs. replacement decisions for each detected part.

STRICT OUTPUT RULES:
- Output ONLY a valid JSON array — no markdown, no explanation, no preamble
- Each element must have EXACTLY these fields:
  {
    "part": "<exact part label from the provided list>",
    "part_key": "<exact part_key from the provided list>",
    "decision": "REPAIR" or "REPLACE",
    "severity_score": <integer 1 to 6>,
    "justification": "<single sentence, max 25 words, technical language>"
  }
- DO NOT invent parts that are not in the provided detection list
- DO NOT output prices, costs, or any monetary values
- DO NOT add any field other than the five specified above
- severity_score 1-3 → prefer REPAIR; severity_score 4-6 → prefer REPLACE
- A crack or deformation with severity ≥ 4 MUST be REPLACE

Severity Scale:
  1 = Cosmetic scratch, no structural damage
  2 = Light surface damage, paint affected
  3 = Moderate dent or scratch, panel deformed
  4 = Significant crack or deep dent, structural concern
  5 = Severe damage, part non-functional
  6 = Catastrophic damage or safety hazard
"""


# ── Public Entry Point ────────────────────────────────────────────────────────

def reason_repairs(
    detections: List[Detection],
    perception: PerceptionResult,
) -> LLMResult:
    """
    Send normalized image + detection context to Gemini 1.5 Pro Vision.
    Returns validated LLMResult with per-part repair decisions.

    Falls back to heuristic-only decisions if API key is missing or API fails.
    """
    if not GEMINI_API_KEY:
        logger.warning(
            "GEMINI_API_KEY not set — using heuristic fallback for repair decisions."
        )
        return _heuristic_fallback(detections)

    genai.configure(api_key=GEMINI_API_KEY)

    try:
        return _call_gemini(detections, perception)
    except Exception as exc:
        logger.error(f"Gemini API call failed: {exc} — falling back to heuristics.")
        return _heuristic_fallback(detections)


# ── Gemini API Call ───────────────────────────────────────────────────────────

def _call_gemini(
    detections: List[Detection],
    perception: PerceptionResult,
) -> LLMResult:
    """Construct prompt, call Gemini, parse and validate response."""
    model = genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        system_instruction=SYSTEM_PROMPT,
    )

    # Build detection context for the prompt
    detection_context = _build_detection_context(detections, perception)

    # Build image part from base64
    image_part = {
        "mime_type": "image/jpeg",
        "data": perception.normalized_image_b64,
    }

    user_message = f"""
Analyse the vehicle damage in the attached image.

Point of Impact (from CV analysis): {perception.poi}
Image metrics: brightness={perception.image_metrics.brightness}, 
               blur_score={perception.image_metrics.blur_score:.1f},
               contrast={perception.image_metrics.contrast_score}

Detected damaged parts (from computer vision — you must ONLY assess these):
{detection_context}

Output the JSON array assessment for each part listed above.
"""

    response = model.generate_content(
        contents=[image_part, user_message],
        generation_config=genai.types.GenerationConfig(
            temperature=0.1,      # Near-deterministic for structured output
            top_p=0.9,
            max_output_tokens=2048,
            response_mime_type="application/json",
        ),
        safety_settings={
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
        },
    )

    raw_text = response.text.strip()
    logger.debug(f"Gemini raw response: {raw_text[:500]}")

    # Parse and validate
    decisions = _parse_and_validate(raw_text, detections)

    # Token usage if available
    prompt_tokens = None
    try:
        prompt_tokens = response.usage_metadata.total_token_count
    except Exception:
        pass

    return LLMResult(
        decisions=decisions,
        model_used=GEMINI_MODEL,
        prompt_tokens=prompt_tokens,
    )


# ── Prompt Construction ───────────────────────────────────────────────────────

def _build_detection_context(
    detections: List[Detection], perception: PerceptionResult
) -> str:
    """Build a numbered list of detections for the LLM prompt."""
    lines = []
    for i, det in enumerate(detections, 1):
        lines.append(
            f'{i}. part="{det.part}" | part_key="{det.part_key}" | '
            f'damage_type="{det.damage_type.value}" | '
            f'confidence={det.confidence:.2f} | '
            f'area_px={det.area_px}'
        )
    return "\n".join(lines)


# ── Response Parsing & Validation ─────────────────────────────────────────────

def _parse_and_validate(
    raw_text: str, detections: List[Detection]
) -> List[PartDecision]:
    """
    Parse LLM JSON output and validate:
    - Only parts present in detections are accepted
    - Severity and decision consistency
    - Missing parts get heuristic fallback entry
    """
    allowed_keys = {d.part_key for d in detections}
    key_to_detection = {d.part_key: d for d in detections}

    # Strip markdown code blocks if present
    cleaned = re.sub(r"```(?:json)?", "", raw_text).strip()
    if cleaned.startswith("["):
        json_text = cleaned
    else:
        # Try to extract JSON array from text
        match = re.search(r"\[.*\]", cleaned, re.DOTALL)
        json_text = match.group(0) if match else "[]"

    try:
        raw_list = json.loads(json_text)
    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse error: {e} — using heuristic fallback.")
        return _heuristic_decisions(detections)

    decisions = []
    seen_keys = set()

    for item in raw_list:
        part_key = item.get("part_key", "")
        if part_key not in allowed_keys:
            logger.warning(f"LLM invented or misidentified part '{part_key}' — skipping.")
            continue

        det = key_to_detection[part_key]
        severity = int(item.get("severity_score", 3))
        severity = max(1, min(6, severity))
        decision_str = str(item.get("decision", "REPAIR")).upper()

        # Enforce the severity → decision rule
        if severity >= SEVERITY_REPLACE_THRESHOLD and det.damage_type in (
            DamageType.CRACK, DamageType.DEFORMATION
        ):
            decision_str = "REPLACE"

        try:
            decision = RepairDecision(decision_str)
        except ValueError:
            decision = RepairDecision.REPAIR

        decisions.append(
            PartDecision(
                part=item.get("part", det.part),
                part_key=part_key,
                decision=decision,
                severity_score=severity,
                justification=item.get("justification", "Assessment based on visual damage pattern.")[:200],
                damage_type=det.damage_type,
            )
        )
        seen_keys.add(part_key)

    # For any detected part the LLM omitted — apply heuristic
    for det in detections:
        if det.part_key not in seen_keys:
            logger.warning(
                f"LLM omitted '{det.part_key}' — applying heuristic decision."
            )
            decisions.append(_heuristic_single(det))

    return decisions


# ── Heuristic Fallback ────────────────────────────────────────────────────────

def _heuristic_fallback(detections: List[Detection]) -> LLMResult:
    """
    Deterministic repair/replace decisions when LLM is unavailable.
    Based on damage type + confidence score — no random values.
    """
    decisions = [_heuristic_single(d) for d in detections]
    return LLMResult(
        decisions=decisions,
        model_used="heuristic-fallback",
        prompt_tokens=None,
    )


def _heuristic_single(det: Detection) -> PartDecision:
    """
    Deterministic decision for one detection.
    Rules:
      Crack + confidence > 0.65 → REPLACE, severity 5
      Crack + confidence <= 0.65 → REPLACE, severity 4
      Deformation             → REPLACE, severity 5
      Dent + confidence > 0.70 → REPLACE, severity 4
      Dent + confidence <= 0.70 → REPAIR, severity 3
      Scratch                  → REPAIR, severity 2
      Paint Damage             → REPAIR, severity 2
      Unknown                  → REPAIR, severity 2
    """
    d = det.damage_type
    conf = det.confidence

    if d == DamageType.CRACK:
        severity = 5 if conf > 0.65 else 4
        decision = RepairDecision.REPLACE
        justification = "Crack detected with structural implication — replacement required."
    elif d == DamageType.DEFORMATION:
        severity = 5
        decision = RepairDecision.REPLACE
        justification = "Deformation exceeds geometric repair tolerance."
    elif d == DamageType.DENT:
        if conf > 0.70:
            severity = 4
            decision = RepairDecision.REPLACE
            justification = "Deep dent detected with high confidence — replacement recommended."
        else:
            severity = 3
            decision = RepairDecision.REPAIR
            justification = "Moderate dent within panel repair threshold."
    elif d == DamageType.SCRATCH:
        severity = 2
        decision = RepairDecision.REPAIR
        justification = "Surface scratch — sanding and repainting sufficient."
    else:
        severity = 2
        decision = RepairDecision.REPAIR
        justification = "Minor damage — repair viable based on visual assessment."

    return PartDecision(
        part=det.part,
        part_key=det.part_key,
        decision=decision,
        severity_score=severity,
        justification=justification,
        damage_type=det.damage_type,
    )


def _heuristic_decisions(detections: List[Detection]) -> List[PartDecision]:
    return [_heuristic_single(d) for d in detections]
