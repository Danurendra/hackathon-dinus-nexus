"""LLM-backed evidence analysis for the IT Helpdesk workflow.

Design rules (see docs/ARCHITECTURE.md):

- The model only receives a **bounded digest** of already-retrieved records.
- The model never produces source IDs; ``facts`` and ``evidence`` stay fully
  derived from the data adapter, so records cannot be invented.
- Output is enforced with OpenAI Structured Outputs and validated with Pydantic.
- Provider/validation failures raise :class:`LLMAnalysisError`; the workflow then
  records the task as ``failed`` rather than ``completed``.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from pydantic import BaseModel

from src.llm.client import MODEL_NAME, get_client

logger = logging.getLogger(__name__)

# Bound how much evidence reaches the provider (token efficiency).
MAX_RECORDS_PER_DATASET = 6
MAX_FIELD_CHARS = 200

# Only these fields are ever sent to the provider, per dataset.
_ALLOWED_FIELDS: dict[str, tuple[str, ...]] = {
    "devices": ("id", "name", "type", "zoneId", "status"),
    "incidents": ("id", "title", "description", "status", "priority", "zoneId"),
    "zones": ("id", "name", "buildingId", "type"),
    "buildings": ("id", "name"),
}

INSTRUCTIONS = (
    "You are an IT helpdesk analysis assistant for a campus prototype. "
    "You receive a user report and a bounded set of SYNTHETIC campus records. "
    "Rules:\n"
    "1. Use ONLY the provided records. Never invent device IDs, incidents, "
    "locations, or facts that are not present in the records.\n"
    "2. The records are synthetic; never claim live, real-time, or verified "
    "campus conditions.\n"
    "3. Separate what is known from what is uncertain. If the evidence is "
    "insufficient, state that in `uncertainty`.\n"
    "4. `recommendations` are advisory next steps only. Never state or imply "
    "that any action has already been executed.\n"
    "5. Be concise and answer in the language of the user report."
)


class AnalysisOutput(BaseModel):
    """Structured output schema enforced through Structured Outputs.

    All fields are required so the generated JSON schema is strict.
    """

    summary: str
    findings: list[str]
    recommendations: list[str]
    uncertainty: list[str]


class LLMAnalysisError(RuntimeError):
    """Raised when the provider fails or returns unparsable output."""


def _compact_record(dataset: str, record: dict[str, Any]) -> dict[str, Any]:
    fields = _ALLOWED_FIELDS.get(dataset, tuple(record.keys()))
    compact: dict[str, Any] = {}
    for field in fields:
        if field not in record:
            continue
        value = record[field]
        if isinstance(value, str):
            value = value[:MAX_FIELD_CHARS]
        compact[field] = value
    return compact


def build_evidence_digest(findings: dict) -> list[str]:
    """Return a bounded, per-record digest of retrieved synthetic records."""
    lines: list[str] = []
    for dataset, records in findings.get("matches", {}).items():
        for record in records[:MAX_RECORDS_PER_DATASET]:
            compact = _compact_record(dataset, record)
            lines.append(
                f"[{dataset}] {json.dumps(compact, ensure_ascii=False)}"
            )
    return lines


def build_prompt(
    description: str,
    findings: dict,
    location: str | None,
    device_type: str | None,
) -> str:
    lines = [
        f"User report: {description}",
        f"Requested location (zone id): {location or 'not specified'}",
        f"Requested device type: {device_type or 'not specified'}",
        "Synthetic records retrieved:",
    ]
    digest = build_evidence_digest(findings)
    if digest:
        lines.extend(f"- {line}" for line in digest)
    else:
        lines.append("- (no matching records were found)")
    return "\n".join(lines)


def _extract_usage(response: Any) -> dict[str, Any]:
    usage = getattr(response, "usage", None)
    if usage is None:
        return {"status": "unavailable"}
    return {
        "input_tokens": getattr(usage, "input_tokens", None),
        "output_tokens": getattr(usage, "output_tokens", None),
    }


def analyze_findings(
    description: str,
    findings: dict,
    location: str | None = None,
    device_type: str | None = None,
) -> dict[str, Any]:
    """Analyze retrieved records with the LLM and return a validated result."""
    prompt = build_prompt(description, findings, location, device_type)

    try:
        response = get_client().responses.parse(
            model=MODEL_NAME,
            instructions=INSTRUCTIONS,
            input=prompt,
            text_format=AnalysisOutput,
            max_output_tokens=700,
        )
    except Exception as exc:  # auth, quota, rate limit, network, schema errors
        # Log the error type only; never the prompt or credentials.
        logger.warning("LLM request failed: %s", type(exc).__name__)
        raise LLMAnalysisError("The language model request failed.") from exc

    parsed = getattr(response, "output_parsed", None)
    if parsed is None:
        raise LLMAnalysisError(
            "The language model returned no parsable analysis."
        )

    return {
        "summary": parsed.summary,
        "findings": list(parsed.findings),
        "recommendations": list(parsed.recommendations),
        "uncertainty": list(parsed.uncertainty),
        "model": MODEL_NAME,
        "usage": _extract_usage(response),
    }