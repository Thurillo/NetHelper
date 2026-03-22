from __future__ import annotations

from ipaddress import IPv4Network, IPv6Network, ip_address as parse_ip, ip_network
from typing import Union

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.models.ip_address import IpAddress
from app.models.ip_prefix import IpPrefix
from app.schemas.ip_prefix import IpPrefixCreate, IpPrefixUpdate, PrefixUtilization


class CRUDIpPrefix(CRUDBase[IpPrefix, IpPrefixCreate, IpPrefixUpdate]):

    async def get(self, db: AsyncSession, id: int) -> IpPrefix | None:
        result = await db.execute(
            select(IpPrefix)
            .options(selectinload(IpPrefix.site), selectinload(IpPrefix.vlan))
            .where(IpPrefix.id == id)
        )
        return result.scalar_one_or_none()

    async def get_multi(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        **filters,
    ) -> list[IpPrefix]:
        stmt = (
            select(IpPrefix)
            .options(selectinload(IpPrefix.site), selectinload(IpPrefix.vlan))
        )
        for field, value in filters.items():
            if value is not None and hasattr(IpPrefix, field):
                stmt = stmt.where(getattr(IpPrefix, field) == value)
        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_prefix(self, db: AsyncSession, prefix: str) -> IpPrefix | None:
        result = await db.execute(
            select(IpPrefix).where(IpPrefix.prefix == prefix)
        )
        return result.scalar_one_or_none()

    async def get_used_counts(self, db: AsyncSession, prefix_ids: list[int]) -> dict[int, int]:
        """Return {prefix_id: assigned_ip_count} for the given prefix IDs (single query)."""
        if not prefix_ids:
            return {}
        result = await db.execute(
            select(IpAddress.prefix_id, func.count(IpAddress.id))
            .where(IpAddress.prefix_id.in_(prefix_ids))
            .group_by(IpAddress.prefix_id)
        )
        return {row[0]: row[1] for row in result.all()}

    async def get_utilization(
        self, db: AsyncSession, prefix_id: int
    ) -> PrefixUtilization | None:
        prefix_obj = await self.get(db, prefix_id)
        if prefix_obj is None:
            return None

        try:
            network: Union[IPv4Network, IPv6Network] = ip_network(
                prefix_obj.prefix, strict=False
            )
        except ValueError:
            return None

        if isinstance(network, IPv4Network):
            total = max(network.num_addresses - 2, 0) if network.prefixlen < 31 else network.num_addresses
        else:
            total = network.num_addresses

        result = await db.execute(
            select(IpAddress).where(IpAddress.prefix_id == prefix_id)
        )
        used_ips = list(result.scalars().all())
        used = len(used_ips)
        free = max(total - used, 0)
        utilization_pct = round((used / total * 100) if total > 0 else 0.0, 2)

        return PrefixUtilization(
            prefix=prefix_obj.prefix,
            total=total,
            used=used,
            free=free,
            utilization_pct=utilization_pct,
        )

    async def get_available_ips(
        self, db: AsyncSession, prefix_id: int, limit: int = 50
    ) -> list[str]:
        prefix_obj = await self.get(db, prefix_id)
        if prefix_obj is None:
            return []

        try:
            network = ip_network(prefix_obj.prefix, strict=False)
        except ValueError:
            return []

        result = await db.execute(
            select(IpAddress.address).where(IpAddress.prefix_id == prefix_id)
        )
        assigned_raw = {row[0] for row in result.all()}
        assigned = set()
        for a in assigned_raw:
            try:
                assigned.add(str(parse_ip(a.split("/")[0])))
            except ValueError:
                pass

        available: list[str] = []
        hosts = list(network.hosts()) if network.version == 4 else list(network.hosts())
        for host in hosts:
            if str(host) not in assigned:
                available.append(str(host))
            if len(available) >= limit:
                break

        return available

    async def get_by_site(self, db: AsyncSession, site_id: int) -> list[IpPrefix]:
        result = await db.execute(
            select(IpPrefix).where(IpPrefix.site_id == site_id)
        )
        return list(result.scalars().all())


crud_ip_prefix = CRUDIpPrefix(IpPrefix)
