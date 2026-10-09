import asyncio

import pytest

from src.llm.adapter import LLMResponse
from src.llm.litellm_client import FallbackLLMClient


class _Provider:
    def __init__(self, model: str, error: Exception | None = None):
        self.model = model
        self.error = error
        self.calls = 0

    async def chat_completion(self, messages, **kwargs):
        self.calls += 1
        if self.error:
            raise self.error
        return LLMResponse(content="ok", model=self.model)

    async def get_usage(self, response):
        return {}


def test_fallback_uses_openai_only_after_primary_failure():
    primary = _Provider("primary", RuntimeError("primary unavailable"))
    fallback = _Provider("gpt-5-nano")
    client = FallbackLLMClient(primary, fallback)

    response = asyncio.run(client.chat_completion([]))

    assert response.model == "gpt-5-nano"
    assert primary.calls == 1
    assert fallback.calls == 1


def test_primary_is_preferred_when_available():
    primary = _Provider("primary")
    fallback = _Provider("gpt-5-nano")
    client = FallbackLLMClient(primary, fallback)

    response = asyncio.run(client.chat_completion([]))

    assert response.model == "primary"
    assert primary.calls == 1
    assert fallback.calls == 0


def test_no_provider_returns_safe_error():
    client = FallbackLLMClient(None, None)

    with pytest.raises(RuntimeError, match="No configured LLM provider"):
        asyncio.run(client.chat_completion([]))
