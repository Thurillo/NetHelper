"""add port_cable_conflict to conflicttype enum

Revision ID: e5f9b2c3d4a6
Revises: d4f8a1b2c3e5
Create Date: 2026-03-22

"""
from alembic import op

revision = 'e5f9b2c3d4a6'
down_revision = 'd4f8a1b2c3e5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PostgreSQL ALTER TYPE ADD VALUE must run outside a transaction
    op.execute(
        "ALTER TYPE conflicttype ADD VALUE IF NOT EXISTS 'port_cable_conflict'"
    )


def downgrade() -> None:
    # PostgreSQL does not support removing enum values; downgrade is a no-op
    pass
