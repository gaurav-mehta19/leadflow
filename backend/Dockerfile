FROM python:3.13-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:0.11 /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project

COPY alembic.ini entrypoint.sh ./
COPY alembic ./alembic
COPY app ./app
RUN uv sync --locked --no-dev

FROM python:3.13-slim AS runtime

RUN groupadd --system --gid 1001 leadflow \
    && useradd --system --uid 1001 --gid leadflow --home-dir /app --no-create-home leadflow

WORKDIR /app

COPY --from=builder --chown=leadflow:leadflow /app /app

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

USER leadflow

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
