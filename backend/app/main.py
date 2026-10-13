from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.config import Settings, get_settings
from app.core.logging import configure_logging
from app.core.middleware import REQUEST_ID_HEADER, RequestContextMiddleware


def create_app(settings: Settings | None = None) -> FastAPI:
    resolved = settings or get_settings()
    configure_logging(resolved)

    app = FastAPI(
        title=resolved.app_name,
        version=resolved.app_version,
        description="Track leads, log every discussion and never miss a follow-up.",
    )
    app.state.settings = resolved

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
