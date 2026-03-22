"""add workstation/printer/camera/phone to devicetype, container to prefixstatus

Revision ID: f6a0c3d4e5b7
Revises: e5f9b2c3d4a6
Create Date: 2026-03-22

"""
from alembic import op

revision = 'f6a0c3d4e5b7'
down_revision = 'e5f9b2c3d4a6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new values to devicetype enum
    op.execute("ALTER TYPE devicetype ADD VALUE IF NOT EXISTS 'workstation'")
    op.execute("ALTER TYPE devicetype ADD VALUE IF NOT EXISTS 'printer'")
    op.execute("ALTER TYPE devicetype ADD VALUE IF NOT EXISTS 'camera'")
    op.execute("ALTER TYPE devicetype ADD VALUE IF NOT EXISTS 'phone'")
    # Add container to prefixstatus enum
    op.execute("ALTER TYPE prefixstatus ADD VALUE IF NOT EXISTS 'container'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values natively.
    # To downgrade, recreate the enum types without the new values.
    pass
