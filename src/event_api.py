"""Event task routes wired to the existing task/run persistence helpers."""

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.exc import SQLAlchemyError

from src.auth import require_api_key
from src.db.models import Task, TaskRun
from src.db.session import SessionLocal
from src.workflows.event_planning import EventPlanInput, EventStepError, event_graph


class EventHelpdeskInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    device_id: str = Field(min_length=1, max_length=100)


def event_router(serialize_task, persist_run, persist_failed_task, create_helpdesk):
    router = APIRouter()

    @router.post("/api/event-plans", status_code=201, dependencies=[Depends(require_api_key)])
    def assess_event(payload: EventPlanInput):
        task = Task(task_id=str(uuid4()), run_id=str(uuid4()), worker="campus_operations",
                    description=f"Event assessment: {payload.name.strip()}", status="queued",
                    created_at=datetime.now(timezone.utc), steps=[],
                    result={"event_input": payload.model_dump(), "data_label": "SYNTHETIC"})
        try:
            with SessionLocal() as db:
                db.add(task)
                db.commit()
                task_id, run_id = task.task_id, task.run_id
        except SQLAlchemyError as exc:
            raise HTTPException(status_code=503, detail="Database unavailable; event task could not be saved.") from exc

        try:
            with SessionLocal() as db:
                saved = db.get(Task, task_id)
                saved.status = "running"
                db.commit()
                for update in event_graph.stream({"input": payload.model_dump(), "records": {}, "forecast": {}, "result": {}, "steps": []}, stream_mode="updates"):
                    for output in update.values():
                        saved.steps = output["steps"]
                        if output.get("result"):
                            saved.result = output["result"]
                            analysis = saved.result.get("analysis") or {}
                            usage = analysis.get("usage") or {}
                            saved.llm_model = analysis.get("model")
                            saved.input_tokens = usage.get("input_tokens")
                            saved.output_tokens = usage.get("output_tokens")
                        persist_run(db, saved, saved.steps)
                        db.flush()
                        # The shared helper finalizes runs; these intermediate
                        # snapshots are still running, so do not claim a finish.
                        db.get(TaskRun, run_id).finished_at = None
                        db.commit()
                saved.status = "completed"
                persist_run(db, saved, saved.steps)
                db.commit()
                db.refresh(saved)
                return serialize_task(saved)
        except Exception as exc:
            steps = exc.steps if isinstance(exc, EventStepError) else None
            persist_failed_task(task_id, steps, "EVENT_ASSESSMENT_FAILED", "Event assessment could not complete.")
            raise HTTPException(status_code=500, detail={"task_id": task_id, "run_id": run_id,
                                "error": {"code": "EVENT_ASSESSMENT_FAILED", "message": "Event assessment could not complete."}}) from exc

    @router.post("/api/event-plans/{task_id}/helpdesk", status_code=201, dependencies=[Depends(require_api_key)])
    def investigate_event_device(task_id: str, payload: EventHelpdeskInput):
        try:
            with SessionLocal() as db:
                event_task = db.get(Task, task_id)
                if event_task is None or event_task.worker != "campus_operations":
                    raise HTTPException(status_code=404, detail="Event task not found.")
                if event_task.status != "completed":
                    raise HTTPException(status_code=409, detail="Event assessment is not completed.")
                device = next((item["record"] for item in (event_task.result or {}).get("facts", [])
                               if item["dataset"] == "devices" and item["record"]["id"] == payload.device_id), None)
                if device is None or device.get("type") != "access-point" or device.get("status") == "online":
                    raise HTTPException(status_code=422, detail="Device is not an unavailable AP in this event's evidence.")
                description = f"Investigasi Wi-Fi sebelum event: {device['name']} ({device['id']}) tidak online dalam dataset sintetis. Sumber event task: {task_id}. Verifikasi status dan insiden; jangan eksekusi perubahan perangkat."
                zone_id = device["zoneId"]
        except SQLAlchemyError as exc:
            raise HTTPException(status_code=503, detail="Database unavailable.") from exc
        return create_helpdesk(description, zone_id)

    return router
