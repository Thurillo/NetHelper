"""dashboard_snapshots + site floor_plan + cabinet map_x/map_y

Revision ID: b2c3d4e5f6a7
Revises: f6a0c3d4e5b7
Create Date: 2026-03-24

"""
from alembic import op
import sqlalchemy as sa

revision = 'b2c3d4e5f6a7'
down_revision = 'f6a0c3d4e5b7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Dashboard snapshots table
    op.create_table(
        'dashboard_snapshot',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('recorded_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('devices_total', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('devices_active', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('sites_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('ip_addresses_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('prefixes_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('pending_conflicts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('scan_jobs_24h', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_dashboard_snapshot_id', 'dashboard_snapshot', ['id'])
    op.create_index('ix_dashboard_snapshot_recorded_at', 'dashboard_snapshot', ['recorded_at'])

    # Site: floor plan
    op.add_column('site', sa.Column('floor_plan', sa.Text(), nullable=True))
    op.add_column('site', sa.Column('floor_plan_name', sa.String(255), nullable=True))

    # Cabinet: map position
    op.add_column('cabinet', sa.Column('map_x', sa.Float(), nullable=True))
    op.add_column('cabinet', sa.Column('map_y', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('cabinet', 'map_y')
    op.drop_column('cabinet', 'map_x')
    op.drop_column('site', 'floor_plan_name')
    op.drop_column('site', 'floor_plan')
    op.drop_index('ix_dashboard_snapshot_recorded_at', table_name='dashboard_snapshot')
    op.drop_index('ix_dashboard_snapshot_id', table_name='dashboard_snapshot')
    op.drop_table('dashboard_snapshot')
