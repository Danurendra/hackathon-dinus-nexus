"""DinusNexus API authentication.

The API key here is a backend-to-client credential, separate from any LLM
provider key. It is read from the ``DINUSNEXUS_API_KEY`` environment variable
and sent by clients through the ``X-API-Key`` header.
"""

import os
import secrets

from fastapi import Header, HTTPException, status

API_KEY_HEADER = "X-API-Key"
API_KEY_ENV = "DINUSNEXUS_API_KEY"


def require_api_key(
    x_api_key: str | None = Header(default=None, alias=API_KEY_HEADER),
) -> None:
    """FastAPI dependency that rejects missing or invalid API keys."""
    expected = os.getenv(API_KEY_ENV)

    if not expected:
        # Fail closed: never expose protected endpoints when auth is unconfigured.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server API key is not configured.",
        )

    if x_api_key is None or not secrets.compare_digest(x_api_key, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key.",
        )