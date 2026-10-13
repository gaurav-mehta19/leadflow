from collections.abc import AsyncIterator
from typing import Annotated
from zoneinfo import ZoneInfo

from fastapi import Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import Clock
from app.core.config import Settings
from app.core.database import Database
from app.core.timezone import parse_timezone
from app.services.health_service import HealthService
from app.services.lead_service import LeadService


def get_settings_from_app(request: Request) -> Settings:
    settings: Settings = request.app.state.settings
    return settings


def get_clock(request: Request) -> Clock:
    clock: Clock = request.app.state.clock
    return clock


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    database: Database = request.app.state.database
    async with database.sessionmaker() as session:
        yield session


SettingsDep = Annotated[Settings, Depends(get_settings_from_app)]
ClockDep = Annotated[Clock, Depends(get_clock)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


def get_timezone(
    settings: SettingsDep,
    x_timezone: Annotated[
        str | None,
        Header(description="IANA time zone used to decide what 'today' means, e.g. Asia/Kolkata"),
    ] = None,
) -> ZoneInfo:
    if x_timezone is None:
        return settings.default_zone
    return parse_timezone(x_timezone)


TimezoneDep = Annotated[ZoneInfo, Depends(get_timezone)]


def get_health_service(session: SessionDep) -> HealthService:
    return HealthService(session)


HealthServiceDep = Annotated[HealthService, Depends(get_health_service)]


def get_lead_service(session: SessionDep, clock: ClockDep) -> LeadService:
    return LeadService(session, clock)


LeadServiceDep = Annotated[LeadService, Depends(get_lead_service)]
