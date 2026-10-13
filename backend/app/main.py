from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.routing import APIRoute

from app.api.openapi import OPENAPI_TAGS, LeadFlowApp
from app.api.router import api_router
from app.core.clock import SystemClock
from app.core.config import Settings, get_settings
from app.core.database import Database
from app.core.error_handlers import register_error_handlers
from app.core.logging import configure_logging, get_logger
from app.core.middleware import REQUEST_ID_HEADER, RequestContextMiddleware

logger = get_logger("app.main")


def operation_id(route: APIRoute) -> str:
    return route.name


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings: Settings = app.state.settings
    database = Database(settings)
    app.state.database = database
    logger.info("app.started", env=settings.app_env, version=settings.app_version)
    try:
        yield
    finally:
        await database.dispose()
        logger.info("app.stopped")


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved = settings or get_settings()
    configure_logging(resolved)

    app = LeadFlowApp(
        title=resolved.app_name,
        version=resolved.app_version,
        description="Track leads, log every discussion and never miss a follow-up.",
        openapi_tags=OPENAPI_TAGS,
        generate_unique_id_function=operation_id,
        lifespan=lifespan,
    )
    app.state.settings = resolved
    app.state.clock = SystemClock()

    register_error_handlers(app)
    app.include_router(api_router, prefix=resolved.api_v1_prefix)

    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved.cors_origins,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Accept", "X-Timezone", REQUEST_ID_HEADER],
        expose_headers=[REQUEST_ID_HEADER, "Location"],
    )
    app.add_middleware(RequestContextMiddleware)
    return app
