from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Literal, TypedDict
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from src.auth import require_api_key
from src.data_adapter import search_helpdesk
from src.db.models import Task
from src.db.session import Base, SessionLocal, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Convenience untuk pengembangan lokal.
    # Untuk deployment, gunakan migrasi Alembic.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="DinusNexus API",
    version="0.1.0",
    lifespan=lifespan,
)


class CreateTaskInput(BaseModel):
    worker: Literal["it_helpdesk"] = "it_helpdesk"
    description: str = Field(min_length=5, max_length=2000)
    location: str | None = None
    device_type: str | None = None


class WorkflowState(TypedDict):
    task_id: str
    description: str
    location: str | None
    device_type: str | None
    status: str
    steps: list[dict]
    findings: dict
    result: dict


def serialize_task(task: Task) -> dict[str, Any]:
    return {
        "task_id": task.task_id,
        "run_id": task.run_id,
        "worker": task.worker,
        "description": task.description,
        "location": task.location,
        "device_type": task.device_type,
        "status": task.status,
        "created_at": task.created_at.isoformat(),
        "steps": task.steps,
        "result": task.result,
        "error": task.error,
    }


def inspect_report(state: WorkflowState) -> dict:
    findings = search_helpdesk(
        state["description"],
        zone_id=state.get("location"),
        device_type=state.get("device_type"),
    )

    source_ids = [
        record["id"]
        for records in findings["matches"].values()
        for record in records
        if "id" in record
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
        {"dataset": dataset_name, "record": record}
        for dataset_name, records in findings["matches"].items()
        for record in records
    ]

    evidence = [
        {"source_id": record["id"], "dataset": dataset_name}
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
def create_task(
    payload: CreateTaskInput,
    _: None = Depends(require_api_key),
):
    task = Task(
        task_id=str(uuid4()),
        run_id=str(uuid4()),
        worker=payload.worker,
        description=payload.description,
        location=payload.location,
        device_type=payload.device_type,
        status="queued",
        created_at=datetime.now(timezone.utc),
        steps=[],
        result=None,
        error=None,
    )

    # Simpan task terlebih dahulu agar task tercatat di database.
    try:
        with SessionLocal() as db:
            db.add(task)
            db.commit()
            db.refresh(task)
            task_id = task.task_id
            run_id = task.run_id
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable; task could not be saved.",
        ) from exc

    try:
        output = helpdesk_graph.invoke({
            "task_id": task_id,
            "description": payload.description,
            "location": payload.location,
            "device_type": payload.device_type,
            "status": "queued",
            "steps": [],
            "findings": {},
            "result": {},
        })

        with SessionLocal() as db:
            saved_task = db.get(Task, task_id)
            if saved_task is None:
                raise RuntimeError("Task disappeared from database.")

            saved_task.status = output["status"]
            saved_task.steps = output["steps"]
            saved_task.result = output["result"]
            db.commit()
            db.refresh(saved_task)
            return serialize_task(saved_task)

    except Exception as exc:
        try:
            with SessionLocal() as db:
                saved_task = db.get(Task, task_id)
                if saved_task is not None:
                    saved_task.status = "failed"
                    saved_task.error = {
                        "code": "WORKFLOW_FAILED",
                        "message": "The workflow could not complete.",
                    }
                    db.commit()
        except SQLAlchemyError:
            pass

        raise HTTPException(
            status_code=500,
            detail={
                "task_id": task_id,
                "run_id": run_id,
                "error": {
                    "code": "WORKFLOW_FAILED",
                    "message": "The workflow could not complete.",
                },
            },
        ) from exc


@app.get("/api/tasks/{task_id}")
def get_task(
    task_id: str,
    _: None = Depends(require_api_key),
):
    try:
        with SessionLocal() as db:
            task = db.get(Task, task_id)
            if task is None:
                raise HTTPException(
                    status_code=404,
                    detail="Task not found",
                )
            return serialize_task(task)
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable.",
        ) from exc


@app.get("/api/history")
def get_history(
    _: None = Depends(require_api_key),
):
    try:
        with SessionLocal() as db:
            statement = select(Task).order_by(Task.created_at.desc())
            tasks = db.scalars(statement).all()
            return {
                "items": [serialize_task(task) for task in tasks]
            }
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable.",
        ) from exc
