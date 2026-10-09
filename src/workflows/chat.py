"""Chat workflow implementation using LangGraph"""

from typing import Dict, List, Any, TypedDict
from langgraph.graph import StateGraph, END, START
from src.conversations.models import Message, MessageRole
from src.conversations.store import add_message, get_messages
from src.llm.prompts import HELPDESK_SYSTEM_PROMPT
from src.data_adapter import search_helpdesk
from src.workflows.intent import detect_intent
import json

class ChatState(TypedDict):
    """State for chat workflow"""
    conversation_id: str
    messages: List[Dict[str, Any]]
    intent: str
    context: Dict[str, Any]
    response: str

async def detect_intent_node(state: ChatState) -> Dict[str, Any]:
    """Detect intent from user message"""
    # Get latest user message
    if not state["messages"]:
        return {"intent": "other"}
    
    latest_message = state["messages"][-1]
    if latest_message["role"] != "user":
        return {"intent": "other"}
    
    # Simple intent detection based on content
    intent = await detect_intent(latest_message["content"])
    return {"intent": intent}

async def search_context_node(state: ChatState) -> Dict[str, Any]:
    """Search for relevant context based on intent"""
    # Extract context from messages if available
    context = {}
    
    # Look for location and device type in messages
    for msg in state["messages"]:
        if msg["role"] == "user" and "location" in msg["content"].lower():
            # Extract location from message (simple implementation)
            pass
        if msg["role"] == "user" and "device" in msg["content"].lower():
            # Extract device type from message
            pass
    
    return {"context": context}

async def generate_response_node(state: ChatState) -> Dict[str, Any]:
    """Generate response based on context and intent"""
    # For now, we'll use a simple approach
    # In future, this would integrate with LLM
    
    # Get latest user message
    if not state["messages"]:
        return {"response": "Maaf, saya tidak memahami pesan Anda."}
    
    latest_message = state["messages"][-1]
    
    # Simple response generation based on intent
    if state["intent"] == "helpdesk_query":
        # This would normally call the LLM with context
        response = f"Saya akan membantu Anda dengan masalah: {latest_message['content']}"
        
        # Search for relevant data
        search_result = search_helpdesk(
            latest_message["content"],
            zone_id=state["context"].get("location"),
            device_type=state["context"].get("device_type")
        )
        
        # Add some context to response
        if search_result["matches"]:
            response += "\n\nData yang ditemukan:"
            for dataset, records in search_result["matches"].items():
                if records:
                    response += f"\n- {dataset}: {len(records)} item"
        
        return {"response": response}
    else:
        return {"response": "Saya menerima pesan Anda. Bagaimana saya bisa membantu?"}

async def save_response_node(state: ChatState) -> Dict[str, Any]:
    """Save the response to conversation"""
    # Create response message
    response_msg = Message(
        message_id=f"msg_{len(state['messages']) + 1}",
        conversation_id=state["conversation_id"],
        role=MessageRole.ASSISTANT,
        content=state["response"],
        created_at=state["messages"][-1]["created_at"] if state["messages"] else None,
        metadata={}
    )
    
    # Add to store
    add_message(response_msg)
    
    return {}

# Create the workflow graph
def create_chat_workflow():
    workflow = StateGraph(ChatState)
    workflow.add_node("detect_intent", detect_intent_node)
    workflow.add_node("search_context", search_context_node)
    workflow.add_node("generate_response", generate_response_node)
    workflow.add_node("save_response", save_response_node)
    
    workflow.add_edge(START, "detect_intent")
    workflow.add_edge("detect_intent", "search_context")
    workflow.add_edge("search_context", "generate_response")
    workflow.add_edge("generate_response", "save_response")
    workflow.add_edge("save_response", END)
    
    return workflow.compile()