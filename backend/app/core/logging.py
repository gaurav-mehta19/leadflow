import logging
import sys
from typing import cast

import structlog
from structlog.typing import FilteringBoundLogger, Processor

from app.core.config import Settings


def _shared_processors() -> list[Processor]:
    return [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
    ]


def _renderer(settings: Settings) -> list[Processor]:
    if settings.log_format == "json":
        return [
            structlog.processors.dict_tracebacks,
            structlog.processors.EventRenamer("message"),
            structlog.processors.JSONRenderer(),
        ]
    return [structlog.dev.ConsoleRenderer()]


def configure_logging(settings: Settings) -> None:
    level = logging.getLevelNamesMapping()[settings.log_level]
    logging.basicConfig(format="%(message)s", stream=sys.stdout, level=level, force=True)
    logging.getLogger("uvicorn.access").disabled = True
    structlog.configure(
        processors=[*_shared_processors(), *_renderer(settings)],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=False,
    )


def get_logger(name: str) -> FilteringBoundLogger:
    return cast(FilteringBoundLogger, structlog.get_logger(name, component=name))
