from sqlalchemy import exists, select, text

from app.models import Lead
from app.repositories.base import Repository


class MaintenanceRepository(Repository[Lead]):
    async def has_leads(self) -> bool:
        return bool(await self._session.scalar(select(exists().where(Lead.id.is_not(None)))))

    async def truncate_all(self) -> None:
        await self._session.execute(text("TRUNCATE TABLE activities, leads"))
