from __future__ import annotations

"""
connections.py
--------------
Provides a flat, paginated view of network connection paths:
  Point A (end device) → [Point B (patch panel)] → Point C (switch)

The response is built by walking all cables and building chains of up to 2
hops via patch panel interfaces.
"""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.cable import Cable
from app.models.device import Device, DeviceType
from app.models.interface import Interface
from app.schemas.pagination import PaginatedResponse

router = APIRouter(prefix="/connections", tags=["connections"])


class DeviceMinimal(BaseModel):
    id: int
    name: str
    device_type: str
    primary_ip: str | None = None

    model_config = {"from_attributes": True}


class ConnectionPath(BaseModel):
    """Represents a full A→[B]→C connection path."""

    # Point A — end device (non-switch, non-patch-panel)
    device_id: int | None = None
    device_name: str | None = None
    device_type: str | None = None
    device_ip: str | None = None
    iface_a_id: int | None = None
    iface_a_name: str | None = None

    # Point B — patch panel (optional intermediate)
    pp_id: int | None = None
    pp_name: str | None = None
    pp_cabinet: str | None = None
    iface_b_pp_side: int | None = None   # PP interface facing the end device
    iface_b_sw_side: int | None = None   # PP interface facing the switch
    cable_ab_id: int | None = None       # cable between A and PP

    # Point C — switch / uplink device
    switch_id: int | None = None
    switch_name: str | None = None
    switch_ip: str | None = None
    iface_c_id: int | None = None
    iface_c_name: str | None = None
    cable_bc_id: int | None = None       # cable between PP (or A) and switch

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

# Types that act as Point C (uplink / aggregation device in the topology view).
# Only pure switches: routers, APs and other end devices connect TO switches
# and appear as Point A.
_SWITCH_TYPES = {DeviceType.switch}
_PP_TYPES = {DeviceType.patch_panel}
# Alias kept for clarity in end-device checks
_UPLINK_ONLY_TYPES = _SWITCH_TYPES


async def _build_paths(db: AsyncSession) -> list[ConnectionPath]:
    """Load all cables and build connection paths."""

    # Load all cables with both interface IDs
    cables_result = await db.execute(select(Cable))
    all_cables = cables_result.scalars().all()

    # Load all interfaces keyed by id
    ifaces_result = await db.execute(select(Interface))
    ifaces: dict[int, Interface] = {i.id: i for i in ifaces_result.scalars().all()}

    # Load all devices keyed by id
    devs_result = await db.execute(select(Device))
    devs: dict[int, Device] = {d.id: d for d in devs_result.scalars().all()}

    # Build quick lookup: interface_id → cable(s) — each interface can have at
    # most one cable per the DB constraint but we store as list for safety
    iface_to_cable: dict[int, list[Cable]] = {}
    for cable in all_cables:
        iface_to_cable.setdefault(cable.interface_a_id, []).append(cable)
        iface_to_cable.setdefault(cable.interface_b_id, []).append(cable)

    def get_device(iface_id: int) -> Device | None:
        iface = ifaces.get(iface_id)
        if not iface:
            return None
        return devs.get(iface.device_id)

    def other_end(cable: Cable, iface_id: int) -> int:
        return cable.interface_b_id if cable.interface_a_id == iface_id else cable.interface_a_id

    # Iterate cables where one side is on a switch/router (Point C)
    paths: list[ConnectionPath] = []
    seen_cable_bc: set[int] = set()   # avoid duplicate paths from same switch-side cable
    seen_cable_ab: set[int] = set()   # avoid reusing the same device-side cable for multiple switch ports

    for cable in all_cables:
        for sw_iface_id, other_iface_id in [
            (cable.interface_a_id, cable.interface_b_id),
            (cable.interface_b_id, cable.interface_a_id),
        ]:
            sw_dev = get_device(sw_iface_id)
            if not sw_dev or sw_dev.device_type not in _SWITCH_TYPES:
                continue

            # This cable's other end is either PP or end-device
            other_dev = get_device(other_iface_id)
            if not other_dev:
                continue

            sw_iface = ifaces.get(sw_iface_id)
            other_iface = ifaces.get(other_iface_id)

            if other_dev.device_type in _PP_TYPES:
                # cable BC: switch ↔ PP
                cable_bc = cable
                if cable_bc.id in seen_cable_bc:
                    continue
                seen_cable_bc.add(cable_bc.id)

                # Find cable AB: PP ↔ end-device (the other PP interface)
                # Look for another cable on the same PP device
                ab_path: ConnectionPath | None = None
                pp_ifaces = [i for i in ifaces.values() if i.device_id == other_dev.id]
                for pp_iface in pp_ifaces:
                    if pp_iface.id == other_iface_id:
                        continue  # skip the side facing the switch
                    ab_cables = iface_to_cable.get(pp_iface.id, [])
                    for ab_cable in ab_cables:
                        if ab_cable.id in seen_cable_ab:
                            continue  # already consumed by another switch-side cable
                        end_iface_id = other_end(ab_cable, pp_iface.id)
                        end_dev = get_device(end_iface_id)
                        if end_dev and end_dev.device_type not in _UPLINK_ONLY_TYPES and end_dev.device_type not in _PP_TYPES:
                            end_iface = ifaces.get(end_iface_id)
                            # Get cabinet name for PP
                            pp_cabinet = None
                            if other_dev.cabinet_id:
                                from app.models.cabinet import Cabinet
                                # simple sync lookup would block; we pre-loaded devices, not cabinets
                                # Just use cabinet_id as string for now
                                pp_cabinet = f"Cabinet #{other_dev.cabinet_id}"

                            ab_path = ConnectionPath(
                                device_id=end_dev.id,
                                device_name=end_dev.name,
                                device_type=end_dev.device_type.value if hasattr(end_dev.device_type, 'value') else str(end_dev.device_type),
                                device_ip=end_dev.primary_ip,
                                iface_a_id=end_iface_id,
                                iface_a_name=end_iface.name if end_iface else None,
                                pp_id=other_dev.id,
                                pp_name=other_dev.name,
                                pp_cabinet=pp_cabinet,
                                iface_b_pp_side=pp_iface.id,
                                iface_b_sw_side=other_iface_id,
                                cable_ab_id=ab_cable.id,
                                switch_id=sw_dev.id,
                                switch_name=sw_dev.name,
                                switch_ip=sw_dev.primary_ip,
                                iface_c_id=sw_iface_id,
                                iface_c_name=sw_iface.name if sw_iface else None,
                                cable_bc_id=cable_bc.id,
                            )
                            seen_cable_ab.add(ab_cable.id)
                            paths.append(ab_path)
                            break
                    if ab_path:
                        break

                # If no end-device found via PP, still show the cable as PP→Switch
                if ab_path is None:
                    paths.append(ConnectionPath(
                        pp_id=other_dev.id,
                        pp_name=other_dev.name,
                        iface_b_sw_side=other_iface_id,
                        switch_id=sw_dev.id,
                        switch_name=sw_dev.name,
                        switch_ip=sw_dev.primary_ip,
                        iface_c_id=sw_iface_id,
                        iface_c_name=sw_iface.name if sw_iface else None,
                        cable_bc_id=cable_bc.id,
                    ))

            elif other_dev.device_type not in _UPLINK_ONLY_TYPES and other_dev.device_type not in _PP_TYPES:
                # Direct A→C cable: end-device ↔ switch
                if cable.id in seen_cable_bc:
                    continue
                seen_cable_bc.add(cable.id)
                paths.append(ConnectionPath(
                    device_id=other_dev.id,
                    device_name=other_dev.name,
                    device_type=other_dev.device_type.value if hasattr(other_dev.device_type, 'value') else str(other_dev.device_type),
                    device_ip=other_dev.primary_ip,
                    iface_a_id=other_iface_id,
                    iface_a_name=other_iface.name if other_iface else None,
                    switch_id=sw_dev.id,
                    switch_name=sw_dev.name,
                    switch_ip=sw_dev.primary_ip,
                    iface_c_id=sw_iface_id,
                    iface_c_name=sw_iface.name if sw_iface else None,
                    cable_bc_id=cable.id,
                ))

    return paths


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.get("/", response_model=PaginatedResponse[ConnectionPath])
async def list_connections(
    _: Annotated[object, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    # Filters
    q: Optional[str] = None,
    switch_id: Optional[int] = None,
    pp_id: Optional[int] = None,
    device_id: Optional[int] = None,
    cabinet_id: Optional[int] = None,
    site_id: Optional[int] = None,
    only_direct: bool = False,   # True → show only A→C (no patch panel)
    page: int = 1,
    size: int = 50,
) -> PaginatedResponse[ConnectionPath]:
    paths = await _build_paths(db)

    # Apply filters
    if q:
        ql = q.lower()
        paths = [
            p for p in paths
            if ql in (p.device_name or "").lower()
            or ql in (p.switch_name or "").lower()
            or ql in (p.pp_name or "").lower()
            or ql in (p.device_ip or "").lower()
            or ql in (p.iface_a_name or "").lower()
            or ql in (p.iface_c_name or "").lower()
        ]
    if switch_id:
        paths = [p for p in paths if p.switch_id == switch_id]
    if pp_id:
        paths = [p for p in paths if p.pp_id == pp_id]
    if device_id:
        paths = [p for p in paths if p.device_id == device_id]
    if only_direct:
        paths = [p for p in paths if p.pp_id is None]

    # For cabinet_id / site_id filtering we need to check device's cabinet
    if cabinet_id or site_id:
        devs_result = await db.execute(select(Device))
        devs = {d.id: d for d in devs_result.scalars().all()}
        if cabinet_id:
            paths = [
                p for p in paths
                if (p.device_id and devs.get(p.device_id) and devs[p.device_id].cabinet_id == cabinet_id)
                or (p.switch_id and devs.get(p.switch_id) and devs[p.switch_id].cabinet_id == cabinet_id)
                or (p.pp_id and devs.get(p.pp_id) and devs[p.pp_id].cabinet_id == cabinet_id)
            ]
        if site_id:
            from app.models.cabinet import Cabinet
            cabs_result = await db.execute(select(Cabinet).where(Cabinet.site_id == site_id))
            cab_ids = {c.id for c in cabs_result.scalars().all()}
            paths = [
                p for p in paths
                if (p.device_id and devs.get(p.device_id) and devs[p.device_id].cabinet_id in cab_ids)
                or (p.switch_id and devs.get(p.switch_id) and devs[p.switch_id].cabinet_id in cab_ids)
            ]

    total = len(paths)
    start = (page - 1) * size
    page_paths = paths[start: start + size]

    return PaginatedResponse.build(page_paths, total=total, page=page, size=size)
