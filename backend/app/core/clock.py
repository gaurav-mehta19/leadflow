from datetime import UTC, datetime, timedelta
from typing import Protocol


class Clock(Protocol):
    def now(self) -> datetime: ...


class SystemClock:
    def now(self) -> datetime:
        return datetime.now(UTC)


class FixedClock:
    def __init__(self, instant: datetime) -> None:
        self._instant = self._require_aware(instant)

    def now(self) -> datetime:
        return self._instant

    def set(self, instant: datetime) -> None:
        self._instant = self._require_aware(instant)

    def advance(self, delta: timedelta) -> None:
        self._instant = self._instant + delta

    @staticmethod
    def _require_aware(instant: datetime) -> datetime:
        if instant.tzinfo is None:
            raise ValueError("FixedClock needs a timezone-aware datetime")
        return instant.astimezone(UTC)
