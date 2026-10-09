from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional, Dict, Any
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
    worker: str = "it_helpdesk"
    title: Optional[str] = None

class SendMessageRequest(BaseModel):
    content: str
    attachments: Optional[List[str]] = None
    context: Optional[Dict[str, Any]] = None