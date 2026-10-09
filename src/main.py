from datetime import datetime, timezone
from typing import Literal, TypedDict
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field


app = FastAPI(title="DinusNexus API", version="0.1.0")

# Temporary storage for local development.
# PostgreSQL persistence will replace this in the next phase.
TASKS: dict[str, dict] = {}


class CreateTaskInput(BaseModel):
    worker: Literal["it_helpdesk"] = "it_helpdesk"
    description: str = Field(min_length=5, max_length=2000)
    location: str | None = None
    device_type: str | None = None


class WorkflowState(TypedDict):
    task_id: str
    description: str
    status: str
    steps: list[dict]
    result: dict


def inspect_report(state: WorkflowState) -> dict:
    return {
        "status": "running",
        "steps": [
            {
                "step_id": "inspect_report",
                "name": "Inspect incident report",
                "status": "completed",
                "source_ids": [],
            }
        ],
    }


def prepare_result(state: WorkflowState) -> dict:
    return {
        "status": "completed",
        "steps": state["steps"] + [
            {
                "step_id": "prepare_result",
                "name": "Prepare initial result",
                "status": "completed",
                "source_ids": [],
            }
        ],
        "result": {
            "facts": [],
            "interpretation": [
                "The incident report was received and recorded."
            ],
            "uncertainty": [
                "No device lookup or external data source has been connected."
            ],
            "recommendations": [
                "Connect an approved helpdesk data tool before diagnosing the incident."
            ],
            "evidence": [],
            "data_label": "PROTOTYPE",
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
