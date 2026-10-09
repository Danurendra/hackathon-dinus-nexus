from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.session import Base


class Task(Base):
    __tablename__ = "tasks"

    task_id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    run_id: Mapped[str] = mapped_column(
        String(36),
        nullable=False,
        unique=True,
        default=lambda: str(uuid4()),
    )
    worker: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    device_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    requested_action: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )
    status: Mapped[str] = mapped_column(String(40), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    steps: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    result: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
    )
    error: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
    )
    approval: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
    )

    # LLM usage metadata (nullable: populated only when the LLM step runs).
    llm_model: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    input_tokens: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    output_tokens: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    runs: Mapped[list["TaskRun"]] = relationship(
        back_populates="task",
        cascade="all, delete-orphan",
        order_by="TaskRun.created_at",
    )


class TaskRun(Base):
    """Normalized execution record for a single workflow run of a task."""

    __tablename__ = "task_runs"

    run_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    task_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("tasks.task_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    worker: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    task: Mapped[Task] = relationship(back_populates="runs")
    steps: Mapped[list["ExecutionStep"]] = relationship(
        back_populates="run",
        cascade="all, delete-orphan",
        order_by="ExecutionStep.order_index",
    )


class ExecutionStep(Base):
    """Normalized, ordered step belonging to a :class:`TaskRun`."""

    __tablename__ = "execution_steps"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )
    run_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("task_runs.run_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    step_key: Mapped[str | None] = mapped_column(String(64), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    source_ids: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    error: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    usage: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    run: Mapped[TaskRun] = relationship(back_populates="steps")