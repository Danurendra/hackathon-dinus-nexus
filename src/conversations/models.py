from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from enum import Enum

class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class Message(BaseModel):
    message_id: str
    conversation_id: str
    role: MessageRole
    content: str
    created_at: datetime
    metadata: Optional[Dict[str, Any]] = None

class Conversation(BaseModel):
    conversation_id: str
    worker: str = "it_helpdesk"
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[Message]

class CreateConversationRequest(BaseModel):
    worker: Literal["it_helpdesk", "network_operations", "campus_operations"] = "it_helpdesk"
    title: Optional[str] = None

class SendMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=12000)
    attachments: Optional[List[str]] = None
    context: Optional[Dict[str, Any]] = None