import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Literal, TypedDict
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError

from src.auth import require_api_key
from src.data_adapter import search_helpdesk
from src.db.models import Task
from src.db.session import Base, SessionLocal, engine
from src.llm.analysis import LLMAnalysisError, analyze_findings


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


def cors_origins() -> list[str]:
    raw = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    )
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


# Allow the frontend (served from another origin) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
    analysis: dict
    result: dict


class StepFailedError(RuntimeError):
    """Raised by a workflow node that fails after recording a failed step."""

    def __init__(self, steps: list[dict], code: str, message: str):
        super().__init__(message)
        self.steps = steps
        self.code = code
        self.message = message


def llm_enabled() -> bool:
    """Whether the optional LLM analysis step should run."""
    return os.getenv("LLM_ENABLED", "false").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


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
        "llm_model": task.llm_model,
        "input_tokens": task.input_tokens,
        "output_tokens": task.output_tokens,
    }


def extract_usage(result: dict | None) -> tuple[str | None, int | None, int | None]:
    """Pull ``(model, input_tokens, output_tokens)`` from a workflow result."""
    analysis = (result or {}).get("analysis") or {}
    model = analysis.get("model")
    usage = analysis.get("usage") or {}
    if not isinstance(usage, dict):
        return model, None, None
    return (
        model,
        usage.get("input_tokens"),
        usage.get("output_tokens"),
    )


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


def analyze_evidence(state: WorkflowState) -> dict:
    """Optional LLM step. Disabled by default (LLM_ENABLED=false)."""
    steps = state["steps"]

    if not llm_enabled():
        return {
            "status": "running",
            "analysis": {},
            "steps": steps + [
                {
                    "step_id": "analyze_evidence",
                    "name": "Analyze evidence with LLM",
                    "status": "skipped",
                    "detail": "LLM analysis disabled (LLM_ENABLED is not set).",
                }
            ],
        }

    try:
        analysis = analyze_findings(
            state["description"],
            state["findings"],
            location=state.get("location"),
            device_type=state.get("device_type"),
        )
    except LLMAnalysisError as exc:
        # Record the failed step and let create_task persist a failed task.
        # Never let a failed LLM step be reported as completed.
        failed_step = {
            "step_id": "analyze_evidence",
            "name": "Analyze evidence with LLM",
            "status": "failed",
            "error": {
                "code": "LLM_ANALYSIS_FAILED",
                "message": "The language model analysis failed.",
            },
        }
        raise StepFailedError(
            steps=steps + [failed_step],
            code="LLM_ANALYSIS_FAILED",
            message="The language model analysis failed.",
        ) from exc

    return {
        "status": "running",
        "analysis": analysis,
        "steps": steps + [
            {
                "step_id": "analyze_evidence",
                "name": "Analyze evidence with LLM",
                "status": "completed",
                "model": analysis.get("model"),
                "usage": analysis.get("usage"),
            }
        ],
    }


def prepare_result(state: WorkflowState) -> dict:
    findings = state["findings"]
    analysis = state.get("analysis") or {}

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

    interpretation = [
        f"Found {len(facts)} matching records in synthetic datasets."
    ]
    uncertainty = [
        "These records are synthetic and do not represent verified live campus conditions."
    ]
    recommendations = [
        "Verify the relevant device and incident details before taking action."
    ]

    if analysis:
        if analysis.get("summary"):
            interpretation.append(analysis["summary"])
        uncertainty.extend(analysis.get("uncertainty", []))
        recommendations.extend(analysis.get("recommendations", []))

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
            "evidence": evidence,
            "analysis": analysis or None,
            "interpretation": interpretation,
            "uncertainty": uncertainty,
            "recommendations": recommendations,
            "data_label": "SYNTHETIC",
        },
    }


workflow = StateGraph(WorkflowState)
workflow.add_node("inspect_report", inspect_report)
workflow.add_node("analyze_evidence", analyze_evidence)
workflow.add_node("prepare_result", prepare_result)
workflow.add_edge(START, "inspect_report")
workflow.add_edge("inspect_report", "analyze_evidence")
workflow.add_edge("analyze_evidence", "prepare_result")
workflow.add_edge("prepare_result", END)

helpdesk_graph = workflow.compile()


def _persist_failed_task(
    task_id: str,
    steps: list[dict] | None,
    code: str,
    message: str,
) -> None:
    """Best-effort persistence of a failed task without masking the original error."""
    try:
        with SessionLocal() as db:
            saved_task = db.get(Task, task_id)
            if saved_task is None:
                return
            saved_task.status = "failed"
            if steps is not None:
                saved_task.steps = steps
            saved_task.error = {"code": code, "message": message}
            db.commit()
    except SQLAlchemyError:
        pass


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
            "analysis": {},
            "result": {},
        })

        with SessionLocal() as db:
            saved_task = db.get(Task, task_id)
            if saved_task is None:
                raise RuntimeError("Task disappeared from database.")

            model, input_tokens, output_tokens = extract_usage(output.get("result"))
            saved_task.status = output["status"]
            saved_task.steps = output["steps"]
            saved_task.result = output["result"]
            saved_task.llm_model = model
            saved_task.input_tokens = input_tokens
            saved_task.output_tokens = output_tokens
            db.commit()
            db.refresh(saved_task)
            return serialize_task(saved_task)

    except StepFailedError as exc:
        _persist_failed_task(task_id, exc.steps, exc.code, exc.message)
        raise HTTPException(
            status_code=500,
            detail={
                "task_id": task_id,
                "run_id": run_id,
                "error": {"code": exc.code, "message": exc.message},
            },
        ) from exc
    except Exception as exc:
        _persist_failed_task(
            task_id,
            None,
            "WORKFLOW_FAILED",
            "The workflow could not complete.",
        )
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


@app.get("/api/metrics/tokens")
def get_token_metrics(
    _: None = Depends(require_api_key),
):
    """Aggregate LLM token usage across all persisted tasks."""
    try:
        with SessionLocal() as db:
            total_tasks = db.scalar(select(func.count()).select_from(Task)) or 0

            input_total, output_total, tasks_with_usage = db.execute(
                select(
                    func.coalesce(func.sum(Task.input_tokens), 0),
                    func.coalesce(func.sum(Task.output_tokens), 0),
                    func.count(Task.input_tokens),
                )
            ).one()

            by_model = [
                {
                    "model": model,
                    "tasks": tasks,
                    "input_tokens": input_sum or 0,
                    "output_tokens": output_sum or 0,
                }
                for model, tasks, input_sum, output_sum in db.execute(
                    select(
                        Task.llm_model,
                        func.count(),
                        func.coalesce(func.sum(Task.input_tokens), 0),
                        func.coalesce(func.sum(Task.output_tokens), 0),
                    )
                    .where(Task.llm_model.isnot(None))
                    .group_by(Task.llm_model)
                ).all()
            ]

            items = [
                {
                    "task_id": task.task_id,
                    "model": task.llm_model,
                    "input_tokens": task.input_tokens,
                    "output_tokens": task.output_tokens,
                    "created_at": task.created_at.isoformat(),
                }
                for task in db.scalars(
                    select(Task)
                    .where(Task.input_tokens.isnot(None))
                    .order_by(Task.created_at.desc())
                ).all()
            ]
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable.",
        ) from exc

    return {
        "totals": {
            "tasks": int(total_tasks),
            "tasks_with_usage": int(tasks_with_usage),
            "input_tokens": int(input_total),
            "output_tokens": int(output_total),
            "unavailable": int(total_tasks) - int(tasks_with_usage),
        },
        "by_model": by_model,
        "items": items,
    }
