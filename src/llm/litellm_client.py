import httpx
import logging
from typing import Dict, List, Any, Optional
from pydantic import BaseModel
from src.llm.adapter import LLMAdapter, LLMResponse
from src.config.settings import LLMSettings

class LiteLLMClient(LLMAdapter):
    """LiteLLM client for CBN Hackathon"""
    
    def __init__(self, settings: LLMSettings):
        if not settings.base_url or not settings.api_key:
            raise RuntimeError("Primary LLM provider is not configured.")
        self.client = httpx.AsyncClient(
            base_url=settings.base_url,
            headers={"Authorization": f"Bearer {settings.api_key}"},
            timeout=30.0
        )
        self.model = settings.model
    
    async def chat_completion(self, messages: List[Dict[str, str]], **kwargs) -> LLMResponse:
        """Generate chat completion from messages"""
        try:
            request = {
                "model": self.model,
                "messages": messages,
            }
            if self.model.startswith("gpt-5"):
                request["max_completion_tokens"] = kwargs.get("max_tokens", 2000)
                request["reasoning_effort"] = "low"
            else:
                request["temperature"] = kwargs.get("temperature", 0.7)
                request["max_tokens"] = kwargs.get("max_tokens", 1000)
            response = await self.client.post(
                "/chat/completions",
                json=request,
            )
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"].get("content", "")
            if not content.strip():
                raise RuntimeError("LLM returned an empty response.")
            
            # Extract usage if available
            usage = None
            if "usage" in data:
                usage = data["usage"]
            
            return LLMResponse(
                content=content,
                usage=usage,
                model=data.get("model")
            )
        except Exception as e:
            # Handle errors gracefully
            raise Exception(f"LLM request failed: {str(e)}")
    
    async def get_usage(self, response: Any) -> Dict[str, Any]:
        """Extract usage information from response"""
        if hasattr(response, 'usage'):
            return response.usage or {}
        return {}
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


class OpenAIChatClient(LiteLLMClient):
    """OpenAI-compatible chat client used as the optional fallback provider."""


class FallbackLLMClient(LLMAdapter):
    """Try the configured primary provider, then OpenAI when it is available."""

    def __init__(
        self,
        primary: LLMAdapter | None,
        fallback: LLMAdapter | None,
    ):
        self.primary = primary
        self.fallback = fallback

    async def chat_completion(
        self, messages: List[Dict[str, str]], **kwargs
    ) -> LLMResponse:
        errors: list[Exception] = []
        for provider in (self.primary, self.fallback):
            if provider is None:
                continue
            try:
                return await provider.chat_completion(messages, **kwargs)
            except Exception as exc:
                provider_name = type(provider).__name__
                logging.getLogger(__name__).warning(
                    "LLM provider %s failed: %s",
                    provider_name,
                    type(exc).__name__,
                )
                errors.append(exc)

        raise RuntimeError(
            "No configured LLM provider could complete the request."
        ) from (errors[-1] if errors else None)

    async def get_usage(self, response: Any) -> Dict[str, Any]:
        return await self._provider_for_response(response).get_usage(response)

    def _provider_for_response(self, response: Any) -> LLMAdapter:
        model = getattr(response, "model", None)
        if self.fallback and model == getattr(self.fallback, "model", None):
            return self.fallback
        if self.primary:
            return self.primary
        if self.fallback:
            return self.fallback
        raise RuntimeError("No configured LLM provider.")

    async def close(self):
        for provider in (self.primary, self.fallback):
            close = getattr(provider, "close", None)
            if close:
                await close()