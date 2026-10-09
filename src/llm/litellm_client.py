import httpx
import asyncio
from typing import Dict, List, Any, Optional
from pydantic import BaseModel
from src.llm.adapter import LLMAdapter, LLMResponse
from src.config.settings import LLMSettings

class LiteLLMClient(LLMAdapter):
    """LiteLLM client for CBN Hackathon"""
    
    def __init__(self, settings: LLMSettings):
        self.client = httpx.AsyncClient(
            base_url=settings.base_url,
            headers={"Authorization": f"Bearer {settings.api_key}"},
            timeout=30.0
        )
        self.model = settings.model
    
    async def chat_completion(self, messages: List[Dict[str, str]], **kwargs) -> LLMResponse:
        """Generate chat completion from messages"""
        try:
            response = await self.client.post(
                "/chat/completions",
                json={
                    "model": self.model,
                    "messages": messages,
                    "temperature": kwargs.get("temperature", 0.7),
                    "max_tokens": kwargs.get("max_tokens", 1000),
                }
            )
            response.raise_for_status()
            data = response.json()
            
            # Extract usage if available
            usage = None
            if "usage" in data:
                usage = data["usage"]
            
            return LLMResponse(
                content=data["choices"][0]["message"]["content"],
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