import asyncio

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ServiceUnavailableError
from app.core.limits import HEALTH_CHECK_TIMEOUT_SECONDS
from app.core.logging import get_logger
from app.repositories.health_repository import HealthRepository

logger = get_logger("app.health")


class HealthService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repository = HealthRepository(session)

    async def check_database(self) -> None:
        try:
            async with asyncio.timeout(HEALTH_CHECK_TIMEOUT_SECONDS), self._session.begin():
                await self._repository.ping()
        except (SQLAlchemyError, OSError, TimeoutError) as error:
            logger.warning("health.database_unreachable", error=type(error).__name__)
            raise ServiceUnavailableError("The database is unreachable.") from error
