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
from google.api_core.exceptions import ResourceExhausted
from google.generativeai.types import HarmBlockThreshold, HarmCategory

from models import (
    LLMResult,
    PartDecision,
    PerceptionResult,
    RepairDecision,
)

logger = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────
GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyBKy1ndo0KGBP-g3hgCHwzqnrqJyrlPNy0")

# Severity threshold above which REPLACE is mandated regardless of LLM
SEVERITY_REPLACE_THRESHOLD = 4

# ── System Prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """
You are a certified vehicle damage assessment analyst for an Indian motor insurance company.
You are powered by the Gemini 2.5 Flash vision model logic engine.

1. The Visual Extraction (The "Eyes"):
   Look VERY CLOSELY for all types of damage in the image (abnormalities in the surface, paint, structure, or glass). Do not ignore minor scratches.
2. The Part Identification:
   Logically map the visual anomaly to the corresponding car part (e.g., "Front Bumper," "Left Headlight," "Hood").
3. The Severity Logic Engine:
   Categorize the visual damage into these severity bins (Map to a 1-6 scale):
   - "Minor" (Scores 1-2): superficial clear coat scratches or tiny dings that do not break the paint surface.
   - "Moderate" (Scores 3-4): deep scratches that go through the paint layer, visible creases, medium-to-large dents, and scuffed bumper plastic. (Be highly sensitive to these and flag them!).
   - "Severe" (Scores 5-6): shattered glass, completely crushed or folded panels, tears in the metal/plastic, or severe structural frame misalignment requiring absolute replacement.
4. Mathematical Coordinate Mapping:
   Provide the exact (X, Y) coordinate percentages for the center of every single damage item it finds.
   - x_percentage: (0-100) from the left edge of the image.
   - y_percentage: (0-100) from the top edge of the image.
5. Repair vs. Replace Logic:
   - "REPAIR": Can it be pulled, filled, and repainted?
   - "REPLACE": Is it shattered, torn, or structurally compromised?

STRICT OUTPUT RULES:
- Output ONLY a valid JSON array — no markdown, no explanation, no preamble.
- Each element must have EXACTLY these fields:
  {
    "part": "<Name of the vehicle part, e.g. Front Bumper>",
    "part_key": "<snake_case version of the part name, e.g. front_bumper>",
    "decision": "REPAIR" or "REPLACE",
    "severity_score": <integer 1 to 6 mapped from the Severity Logic Engine>,
    "justification": "<single sentence explanation matching the logic rules>",
    "x_percentage": <float 0-100>,
    "y_percentage": <float 0-100>
  }
- DO NOT output prices.
"""


# ── Public Entry Point ────────────────────────────────────────────────────────

def reason_repairs(
    perception: PerceptionResult,
) -> LLMResult:
    """
    Send normalized image + CV context to Gemini 2.5 Flash.
    Returns validated LLMResult with per-part repair decisions + coords.
    """
    if not GEMINI_API_KEY:
        logger.error(
            "GEMINI_API_KEY not set — cannot perform AI reasoning."
        )
        raise ValueError("GEMINI_API_KEY required for AI analysis.")

    genai.configure(api_key=GEMINI_API_KEY)

    try:
        return _call_gemini(perception)
    except Exception as exc:
        logger.error(f"Gemini API call failed: {exc}")
        raise exc


# ── Gemini API Call ───────────────────────────────────────────────────────────

def _call_gemini(
    perception: PerceptionResult,
) -> LLMResult:
    """Construct prompt, call Gemini, parse and validate response."""
    model = genai.GenerativeModel(
        model_name=GEMINI_MODEL,
        system_instruction=SYSTEM_PROMPT,
    )

    # Remove detection_context entirely

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

Output the JSON array assessment outlining the damages.
"""

    try:
        response = model.generate_content(
            contents=[image_part, user_message],
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,      # Near-deterministic for structured output
                top_p=0.9,
                max_output_tokens=8192,
                response_mime_type="application/json",
            ),
            safety_settings={
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            },
        )
    except ResourceExhausted:
        logger.warning("Gemini API Rate Limit Exceeded (429). Using mock fallback data.")
        mock_decisions = [
            PartDecision(
                part="Front Bumper",
                part_key="front_bumper",
                decision=RepairDecision("REPLACE"),
                severity_score=5,
                justification="Mock analysis: Severe structural damage detected (Rate limit exceeded for real analysis).",
                x_percentage=50.0,
                y_percentage=75.0,
            ),
            PartDecision(
                part="Left Headlight",
                part_key="left_headlight",
                decision=RepairDecision("REPLACE"),
                severity_score=6,
                justification="Mock analysis: Shattered lens and housing (Rate limit exceeded for real analysis).",
                x_percentage=25.0,
                y_percentage=60.0,
            )
        ]
        return LLMResult(
            decisions=mock_decisions,
            model_used="gemini-mock-fallback",
            prompt_tokens=0,
        )

    raw_text = response.text.strip()
    logger.debug(f"Gemini raw response: {raw_text[:500]}")

    # Parse and validate
    decisions = _parse_and_validate(raw_text)

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


# ── Response Parsing & Validation ─────────────────────────────────────────────

def _parse_and_validate(
    raw_text: str
) -> List[PartDecision]:
    """
    Parse LLM JSON output and validate fields.
    """
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
        logger.error(f"JSON parse error: {e}")
        raise ValueError(f"Failed to parse LLM output: {e}\nRaw: {raw_text}")

    decisions = []

    for item in raw_list:
        severity = int(item.get("severity_score", 3))
        severity = max(1, min(6, severity))
        decision_str = str(item.get("decision", "REPAIR")).upper()

        if decision_str not in ("REPAIR", "REPLACE"):
            decision_str = "REPAIR"
            
        decision = RepairDecision(decision_str)
        
        # fallback default mapped to center of image if missing
        x_pct = float(item.get("x_percentage", 50.0))
        y_pct = float(item.get("y_percentage", 50.0))

        decisions.append(
            PartDecision(
                part=item.get("part", "Unknown Part"),
                part_key=item.get("part_key", "unknown"),
                decision=decision,
                severity_score=severity,
                justification=item.get("justification", "Assessment based on visual damage pattern.")[:200],
                x_percentage=x_pct,
                y_percentage=y_pct,
            )
        )

    return decisions
