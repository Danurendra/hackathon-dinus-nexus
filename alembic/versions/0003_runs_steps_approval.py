"""add approval fields and normalized run/step tables

Revision ID: 0003_runs_steps_approval
Revises: 0002_add_token_usage
Create Date: 2026-10-09

- tasks: add ``requested_action`` and ``approval`` (human-in-the-loop gate)
- task_runs: one normalized row per workflow run
- execution_steps: ordered normalized steps per run

The existing ``tasks.steps`` JSON column is kept for backward compatibility;
the normalized tables are the queryable store.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003_runs_steps_approval"
down_revision: Union[str, None] = "0002_add_token_usage"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "tasks",
        sa.Column("requested_action", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "tasks",
        sa.Column("approval", sa.JSON(), nullable=True),
    )

    op.create_table(
        "task_runs",
        sa.Column("run_id", sa.String(length=36), nullable=False),
        sa.Column("task_id", sa.String(length=36), nullable=False),
        sa.Column("worker", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["task_id"], ["tasks.task_id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("run_id"),
    )
    op.create_index("ix_task_runs_task_id", "task_runs", ["task_id"])

    op.create_table(
        "execution_steps",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("run_id", sa.String(length=36), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("step_key", sa.String(length=64), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("source_ids", sa.JSON(), nullable=True),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("error", sa.JSON(), nullable=True),
        sa.Column("model", sa.String(length=100), nullable=True),
        sa.Column("usage", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(
            ["run_id"], ["task_runs.run_id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_execution_steps_run_id", "execution_steps", ["run_id"])


def downgrade() -> None:
    op.drop_index("ix_execution_steps_run_id", table_name="execution_steps")
    op.drop_table("execution_steps")
    op.drop_index("ix_task_runs_task_id", table_name="task_runs")
    op.drop_table("task_runs")
    op.drop_column("tasks", "approval")
    op.drop_column("tasks", "requested_action")