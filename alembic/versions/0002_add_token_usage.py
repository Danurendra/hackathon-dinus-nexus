"""add token usage columns to tasks

Revision ID: 0002_add_token_usage
Revises: 0001_create_tasks
Create Date: 2026-10-09

Persists per-task LLM usage for the token metrics endpoint. Columns are
nullable so the deterministic (no-LLM) path is unaffected.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002_add_token_usage"
down_revision: Union[str, None] = "0001_create_tasks"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "tasks", sa.Column("llm_model", sa.String(length=100), nullable=True)
    )
    op.add_column(
        "tasks", sa.Column("input_tokens", sa.Integer(), nullable=True)
    )
    op.add_column(
        "tasks", sa.Column("output_tokens", sa.Integer(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("tasks", "output_tokens")
    op.drop_column("tasks", "input_tokens")
    op.drop_column("tasks", "llm_model")