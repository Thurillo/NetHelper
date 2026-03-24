from __future__ import annotations

from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DashboardSnapshot(Base):
    __tablename__ = "dashboard_snapshot"

    id: Mapped[int] = mapped_column(sa.Integer, primary_key=True, index=True)
    recorded_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        index=True,
        server_default=sa.func.now(),
    )
    devices_total: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)
    devices_active: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)
    sites_count: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)
    ip_addresses_count: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)
    prefixes_count: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)
    pending_conflicts: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)
    scan_jobs_24h: Mapped[int] = mapped_column(sa.Integer, nullable=False, default=0)
