import os
import subprocess
import sys
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from pathlib import Path

import httpx
import pytest
import pytest_asyncio
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine, AsyncSession, create_async_engine

from app.api.dependencies import get_clock, get_session
from app.core.clock import Clock, FixedClock
from app.core.config import Settings
from app.main import create_app

BACKEND_ROOT = Path(__file__).resolve().parent.parent
FROZEN_NOW = datetime(2026, 5, 4, 6, 30, tzinfo=UTC)
TEST_TIMEZONE = "Asia/Kolkata"


@pytest.fixture(scope="session")
def settings() -> Settings:
    base = Settings()
    if base.test_database_url is None:
        pytest.exit("Set TEST_DATABASE_URL to run the test suite.", returncode=2)
    return base.model_copy(
        update={
            "app_env": "test",
            "database_url": base.test_database_url,
            "log_level": "WARNING",
            "default_timezone": TEST_TIMEZONE,
        }
    )


def _alembic(settings: Settings, *arguments: str) -> None:
    subprocess.run(
        [sys.executable, "-m", "alembic", *arguments],
        cwd=BACKEND_ROOT,
        env={**os.environ, "DATABASE_URL": settings.database_url},
        check=True,
        capture_output=True,
    )


@pytest.fixture(scope="session")
def migrated_database(settings: Settings) -> None:
    _alembic(settings, "downgrade", "base")
    _alembic(settings, "upgrade", "head")


@pytest_asyncio.fixture(scope="session")
async def engine(settings: Settings, migrated_database: None) -> AsyncIterator[AsyncEngine]:
    test_engine = create_async_engine(settings.database_url)
    yield test_engine
    await test_engine.dispose()


@pytest_asyncio.fixture
async def connection(engine: AsyncEngine) -> AsyncIterator[AsyncConnection]:
    async with engine.connect() as test_connection:
        transaction = await test_connection.begin()
        yield test_connection
        await transaction.rollback()


@pytest_asyncio.fixture
async def session(connection: AsyncConnection) -> AsyncIterator[AsyncSession]:
    test_session = AsyncSession(
        bind=connection,
        expire_on_commit=False,
        join_transaction_mode="create_savepoint",
    )
    yield test_session
    await test_session.close()


@pytest.fixture
def clock() -> FixedClock:
    return FixedClock(FROZEN_NOW)


@pytest.fixture
def app(settings: Settings, session: AsyncSession, clock: FixedClock) -> FastAPI:
    application = create_app(settings)

    async def override_session() -> AsyncIterator[AsyncSession]:
        yield session

    def override_clock() -> Clock:
        return clock

    application.dependency_overrides[get_session] = override_session
    application.dependency_overrides[get_clock] = override_clock
    return application


@pytest_asyncio.fixture
async def client(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"X-Timezone": TEST_TIMEZONE},
    ) as test_client:
        yield test_client
