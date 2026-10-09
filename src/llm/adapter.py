from abc import ABC, abstractmethod
from typing import Dict, List, Any
from pydantic import BaseModel

class LLMResponse(BaseModel):
    content: str
    usage: Dict[str, Any] | None = None
    model: str | None = None

class LLMAdapter(ABC):
    """Abstract base class for LLM adapters"""
    
    @abstractmethod
    async def chat_completion(self, messages: List[Dict[str, str]], **kwargs) -> LLMResponse:
        """Generate chat completion from messages"""
        pass
    
    @abstractmethod
    async def get_usage(self, response: Any) -> Dict[str, Any]:
        """Extract usage information from response"""
        pass