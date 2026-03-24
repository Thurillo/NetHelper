from __future__ import annotations

import asyncio
from datetime import datetime, timezone, timedelta

from sqlalchemy import func, select, text

from app.database import AsyncSessionLocal
from app.models.dashboard_snapshot import DashboardSnapshot
from app.models.device import Device, DeviceStatus
from app.models.ip_address import IpAddress
from app.models.ip_prefix import IpPrefix
from app.models.scan_job import ScanJob
from app.models.scan_conflict import ScanConflict
from app.models.site import Site
from app.tasks.celery_app import celery_app


async def _take_snapshot() -> None:
    async with AsyncSessionLocal() as db:
        async with db.begin():
            now = datetime.now(timezone.utc)
            since_24h = now - timedelta(hours=24)

            # Skip if snapshot already taken today (same UTC date)
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            existing = await db.execute(
                select(func.count(DashboardSnapshot.id))
                .where(DashboardSnapshot.recorded_at >= today_start)
            )
            if existing.scalar_one() > 0:
                return

            results = await asyncio.gather(
                db.execute(select(func.count(Device.id))),
                db.execute(select(func.count(Device.id)).where(Device.status == DeviceStatus.active)),
                db.execute(select(func.count(Site.id))),
                db.execute(select(func.count(IpAddress.id))),
                db.execute(select(func.count(IpPrefix.id))),
                db.execute(select(func.count(ScanConflict.id)).where(
                    ScanConflict.status == "pending"
                )),
                db.execute(select(func.count(ScanJob.id)).where(
                    ScanJob.started_at >= since_24h
                )),
            )

            values = [r.scalar_one() for r in results]
            snap = DashboardSnapshot(
                recorded_at=now,
                devices_total=values[0],
                devices_active=values[1],
                sites_count=values[2],
                ip_addresses_count=values[3],
                prefixes_count=values[4],
                pending_conflicts=values[5],
                scan_jobs_24h=values[6],
            )
            db.add(snap)


@celery_app.task(name="app.tasks.snapshot_tasks.take_daily_snapshot", bind=True, max_retries=3)
def take_daily_snapshot(self):
    try:
        asyncio.run(_take_snapshot())
    except Exception as exc:
        raise self.retry(exc=exc, countdown=300)
