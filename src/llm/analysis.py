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
import os
import random
import time
from typing import Any

from openai import APIConnectionError
from pydantic import BaseModel

from src.llm.client import MODEL_NAME, get_client

logger = logging.getLogger(__name__)

# Bound how much evidence reaches the provider (token efficiency).
MAX_RECORDS_PER_DATASET = 6
MAX_FIELD_CHARS = 200

# Bounded retry policy for transient provider errors.
MAX_ATTEMPTS_LIMIT = 5
RETRYABLE_STATUS_CODES = {408, 409, 429}

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


def max_attempts() -> int:
    """Bounded number of provider attempts (1..MAX_ATTEMPTS_LIMIT)."""
    try:
        value = int(os.getenv("LLM_MAX_ATTEMPTS", "3"))
    except ValueError:
        value = 3
    return max(1, min(value, MAX_ATTEMPTS_LIMIT))


def _timeout_seconds() -> float:
    try:
        value = float(os.getenv("LLM_TIMEOUT_SECONDS", "30"))
    except ValueError:
        value = 30.0
    return value if value > 0 else 30.0


def _retry_base_delay() -> float:
    try:
        value = float(os.getenv("LLM_RETRY_BASE_DELAY", "0.5"))
    except ValueError:
        value = 0.5
    return value if value >= 0 else 0.5


def _is_transient(exc: Exception) -> bool:
    """Only retry errors that can plausibly succeed on a later attempt."""
    if isinstance(exc, APIConnectionError):
        return True
    status = getattr(exc, "status_code", None)
    if isinstance(status, int):
        return status in RETRYABLE_STATUS_CODES or 500 <= status < 600
    return False


def _backoff_delay(attempt: int) -> float:
    delay = _retry_base_delay() * (2 ** (attempt - 1))
    return delay + random.uniform(0, delay * 0.25)


def _request_with_retry(prompt: str) -> Any:
    """Call the provider with bounded exponential backoff + jitter."""
    attempts = max_attempts()
    for attempt in range(1, attempts + 1):
        try:
            return get_client().responses.parse(
                model=MODEL_NAME,
                instructions=INSTRUCTIONS,
                input=prompt,
                text_format=AnalysisOutput,
                max_output_tokens=700,
                timeout=_timeout_seconds(),
            )
        except Exception as exc:
            if not _is_transient(exc) or attempt == attempts:
                logger.warning(
                    "LLM request failed after %d attempt(s): %s",
                    attempt,
                    type(exc).__name__,
                )
                raise LLMAnalysisError(
                    "The language model request failed."
                ) from exc
            delay = _backoff_delay(attempt)
            logger.warning(
                "Transient LLM error %s; retrying %d/%d in %.2fs",
                type(exc).__name__,
                attempt + 1,
                attempts,
                delay,
            )
            time.sleep(delay)

    # Unreachable: the loop always returns or raises.
    raise LLMAnalysisError("The language model request failed.")


def analyze_findings(
    description: str,
    findings: dict,
    location: str | None = None,
    device_type: str | None = None,
) -> dict[str, Any]:
    """Analyze retrieved records with the LLM and return a validated result."""
    prompt = build_prompt(description, findings, location, device_type)
    response = _request_with_retry(prompt)

    parsed = getattr(response, "output_parsed", None)
    if parsed is None:
        # Structural failure: retrying the same prompt would not help.
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