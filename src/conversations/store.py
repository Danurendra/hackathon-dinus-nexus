"""In-memory storage for conversations (will be replaced with database)"""

from typing import Dict, List, Optional
from datetime import datetime
from src.conversations.models import Conversation, Message
from uuid import uuid4

# In-memory storage
_conversations: Dict[str, Conversation] = {}
_message_store: Dict[str, List[Message]] = {}

def create_conversation(conversation: Conversation) -> Conversation:
    """Create a new conversation"""
    _conversations[conversation.conversation_id] = conversation
    _message_store[conversation.conversation_id] = []
    return conversation

def get_conversation(conversation_id: str) -> Optional[Conversation]:
    """Get a conversation by ID"""
    return _conversations.get(conversation_id)

def update_conversation(conversation_id: str, updated_fields: Dict[str, Any]) -> Optional[Conversation]:
    """Update conversation fields"""
    conv = _conversations.get(conversation_id)
    if conv:
        for key, value in updated_fields.items():
            setattr(conv, key, value)
        conv.updated_at = datetime.now()
        _conversations[conversation_id] = conv
    return conv

def delete_conversation(conversation_id: str) -> bool:
    """Delete a conversation"""
    if conversation_id in _conversations:
        del _conversations[conversation_id]
        if conversation_id in _message_store:
            del _message_store[conversation_id]
        return True
    return False

def add_message(message: Message) -> Message:
    """Add a message to a conversation"""
    if message.conversation_id not in _message_store:
        _message_store[message.conversation_id] = []
    _message_store[message.conversation_id].append(message)
    
    # Update conversation's updated_at
    conv = get_conversation(message.conversation_id)
    if conv:
        update_conversation(message.conversation_id, {"updated_at": datetime.now()})
    
    return message

def get_messages(conversation_id: str) -> List[Message]:
    """Get all messages for a conversation"""
    return _message_store.get(conversation_id, [])

def list_conversations() -> List[Conversation]:
    """List all conversations"""
    return list(_conversations.values())