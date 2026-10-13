from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select, tuple_

from app.domain.cursor import Keyset
from app.models import Activity
from app.repositories.base import Repository


class ActivityRepository(Repository[Activity]):
    async def get(self, lead_id: UUID, activity_id: UUID) -> Activity | None:
        statement = select(Activity).where(Activity.id == activity_id, Activity.lead_id == lead_id)
        return (await self._session.execute(statement)).scalar_one_or_none()

    async def latest(self, lead_id: UUID) -> Activity | None:
        statement = (
            select(Activity)
            .where(Activity.lead_id == lead_id)
            .order_by(Activity.occurred_at.desc(), Activity.id.desc())
            .limit(1)
        )
        return (await self._session.execute(statement)).scalar_one_or_none()

    async def latest_occurred_at(self, lead_id: UUID) -> datetime | None:
        statement = select(func.max(Activity.occurred_at)).where(Activity.lead_id == lead_id)
        return (await self._session.execute(statement)).scalar_one_or_none()

    async def list_page(self, lead_id: UUID, after: Keyset | None, limit: int) -> list[Activity]:
        statement = select(Activity).where(Activity.lead_id == lead_id)
        if after is not None:
            statement = statement.where(
                tuple_(Activity.occurred_at, Activity.id) < tuple_(after.at, after.id)
            )
        statement = statement.order_by(Activity.occurred_at.desc(), Activity.id.desc()).limit(limit)
        return list((await self._session.execute(statement)).scalars().all())
