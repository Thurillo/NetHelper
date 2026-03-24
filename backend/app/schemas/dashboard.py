from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.schemas.scan_job import ScanJobRead


class SnapshotRead(BaseModel):
    id: int
    recorded_at: datetime
    devices_total: int
    devices_active: int
    sites_count: int
    ip_addresses_count: int
    prefixes_count: int
    pending_conflicts: int
    scan_jobs_24h: int

    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    devices_total: int
    devices_active: int
    sites_count: int
    cabinets_count: int
    interfaces_count: int
    cables_count: int
    vlans_count: int
    prefixes_count: int
    ip_addresses_count: int
    pending_conflicts: int
    recent_scans: list[ScanJobRead]
    suspected_unmanaged_switches: int
    devices_by_type: dict[str, int]
    devices_by_status: dict[str, int]
