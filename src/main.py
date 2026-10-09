from datetime import datetime, timezone
from typing import Literal, TypedDict, List, Optional
from uuid import uuid4
from src.data_adapter import search_helpdesk

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field

# Import new modules
from src.conversations.models import (
    Conversation, 
    Message, 
    CreateConversationRequest, 
    SendMessageRequest,
    MessageRole
)
from src.conversations.store import (
    create_conversation,
    get_conversation,
    update_conversation,
    delete_conversation,
    add_message,
    get_messages,
    list_conversations
)
from src.workflows.chat import create_chat_workflow
from src.llm.litellm_client import LiteLLMClient
from src.config.settings import Settings
from src.llm.prompts import HELPDESK_SYSTEM_PROMPT


app = FastAPI(title="DinusNexus API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# Local frontend development only. Production origins must be configured explicitly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

# Initialize settings and LLM client
settings = Settings()
llm_client = LiteLLMClient(settings.llm)

# Temporary storage for local development.
# PostgreSQL persistence will replace this in the next phase.
TASKS: dict[str, dict] = {}

# Chat workflow
chat_workflow = create_chat_workflow()


class CreateTaskInput(BaseModel):
    worker: Literal["it_helpdesk"] = "it_helpdesk"
    description: str = Field(min_length=5, max_length=2000)
    location: str | None = None
    device_type: str | None = None


class WorkflowState(TypedDict):
    task_id: str
    description: str
    zone_id: str | None
    device_type: str | None
    status: str
    steps: list[dict]
    findings: dict
    result: dict


def inspect_report(state: WorkflowState) -> dict:
    findings = search_helpdesk(
        state["description"],
        zone_id=state["zone_id"],
        device_type=state["device_type"],
    )

    source_ids = [
        item["id"]
        for records in findings["matches"].values()
        for item in records
        if "id" in item
    ]

    return {
        "status": "running",
        "findings": findings,
        "steps": [
            {
                "step_id": "inspect_report",
                "name": "Search synthetic helpdesk data",
                "status": "completed",
                "source_ids": source_ids,
            }
        ],
    }



def prepare_result(state: WorkflowState) -> dict:
    findings = state["findings"]

    facts = [
        {
            "dataset": dataset_name,
            "record": record,
        }
        for dataset_name, records in findings["matches"].items()
        for record in records
    ]

    evidence = [
        {
            "source_id": record["id"],
            "dataset": dataset_name,
        }
        for dataset_name, records in findings["matches"].items()
        for record in records
        if "id" in record
    ]

    return {
        "status": "completed",
        "steps": state["steps"] + [
            {
                "step_id": "prepare_result",
                "name": "Prepare result from synthetic data",
                "status": "completed",
                "source_ids": [
                    item["source_id"] for item in evidence
                ],
            }
        ],
        "result": {
            "facts": facts,
            "interpretation": [
                f"Found {len(facts)} matching records in synthetic datasets."
            ],
            "uncertainty": [
                "These records are synthetic and do not represent verified live campus conditions."
            ],
            "recommendations": [
                "Verify the relevant device and incident details before taking action."
            ],
            "evidence": evidence,
            "data_label": "SYNTHETIC",
        },
    }



workflow = StateGraph(WorkflowState)
workflow.add_node("inspect_report", inspect_report)
workflow.add_node("prepare_result", prepare_result)
workflow.add_edge(START, "inspect_report")
workflow.add_edge("inspect_report", "prepare_result")
workflow.add_edge("prepare_result", END)

helpdesk_graph = workflow.compile()


@app.get("/health")
def health():
    return {"status": "ok", "service": "dinusnexus-api"}


@app.post("/api/tasks", status_code=201)
def create_task(payload: CreateTaskInput):
    task_id = str(uuid4())
    now = datetime.now(timezone.utc).isoformat()

    task = {
        "task_id": task_id,
        "run_id": str(uuid4()),
        "worker": payload.worker,
        "description": payload.description,
        "location": payload.location,
        "device_type": payload.device_type,
        "status": "queued",
        "created_at": now,
        "steps": [],
        "result": None,
    }
    TASKS[task_id] = task

    try:
        output = helpdesk_graph.invoke({
            "task_id": task_id,
            "description": payload.description,
            "zone_id": payload.location,
            "device_type": payload.device_type,
            "status": "queued",
            "steps": [],
            "result": {},
        })
        task.update({
            "status": output["status"],
            "steps": output["steps"],
            "result": output["result"],
        })
    except Exception:
        task["status"] = "failed"
        task["error"] = {
            "code": "WORKFLOW_FAILED",
            "message": "The workflow could not complete.",
        }
        raise HTTPException(
            status_code=500,
            detail={
                "task_id": task_id,
                "error": task["error"],
            },
        )

    return task


@app.get("/api/tasks/{task_id}")
def get_task(task_id: str):
    task = TASKS.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.get("/api/history")
def get_history():
    return {
        "items": sorted(
            TASKS.values(),
            key=lambda task: task["created_at"],
            reverse=True,
        )
    }


# New chat endpoints
@app.post("/api/conversations", status_code=201)
def create_conversation(payload: CreateConversationRequest):
    """Create a new conversation"""
    conversation_id = str(uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    conversation = Conversation(
        conversation_id=conversation_id,
        worker=payload.worker,
        title=payload.title or f"Conversation {conversation_id[:8]}",
        created_at=now,
        updated_at=now,
        messages=[]
    )
    
    create_conversation(conversation)
    return conversation

@app.get("/api/conversations")
def list_conversations():
    """List all conversations"""
    return list_conversations()

@app.get("/api/conversations/{conversation_id}")
def get_conversation_detail(conversation_id: str):
    """Get a specific conversation with all messages"""
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Add messages to conversation
    messages = get_messages(conversation_id)
    conversation.messages = messages
    return conversation

@app.delete("/api/conversations/{conversation_id}")
def delete_conversation_endpoint(conversation_id: str):
    """Delete a conversation"""
    deleted = delete_conversation(conversation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"message": "Conversation deleted successfully"}

@app.post("/api/conversations/{conversation_id}/messages", status_code=201)
async def send_message(conversation_id: str, payload: SendMessageRequest):
    """Send a message in a conversation"""
    # Get conversation
    conversation = get_conversation(conversation_id)
    if conversation is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Create user message
    user_message = Message(
        message_id=str(uuid4()),
        conversation_id=conversation_id,
        role=MessageRole.USER,
        content=payload.content,
        created_at=datetime.now(timezone.utc).isoformat(),
        metadata={
            "attachments": payload.attachments,
            "context": payload.context
        }
    )
    
    # Add user message
    add_message(user_message)
    
    # Prepare messages for chat workflow
    all_messages = get_messages(conversation_id)
    workflow_messages = [
        {
            "role": msg.role.value,
            "content": msg.content,
            "created_at": msg.created_at
        }
        for msg in all_messages
    ]
    
    # Run chat workflow
    try:
        # This is a simplified version - in practice, you'd want to properly
        # integrate with LangGraph workflow
        response = await llm_client.chat_completion([
            {"role": "system", "content": HELPDESK_SYSTEM_PROMPT},
            *workflow_messages
        ])
        
        # Create assistant message
        assistant_message = Message(
            message_id=str(uuid4()),
            conversation_id=conversation_id,
            role=MessageRole.ASSISTANT,
            content=response.content,
            created_at=datetime.now(timezone.utc).isoformat(),
            metadata={
                "tokens_used": response.usage,
                "model": response.model
            }
        )
        
        # Add assistant message
        add_message(assistant_message)
        
        # Return the response
        return assistant_message
        
    except Exception as e:
        # Create error message
        error_message = Message(
            message_id=str(uuid4()),
            conversation_id=conversation_id,
            role=MessageRole.ASSISTANT,
            content=f"Maaf, terjadi kesalahan: {str(e)}",
            created_at=datetime.now(timezone.utc).isoformat(),
            metadata={}
        )
        add_message(error_message)
        raise HTTPException(status_code=500, detail=str(e))
