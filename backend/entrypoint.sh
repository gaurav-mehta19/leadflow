#!/bin/sh
set -eu

alembic upgrade head

if [ "${SEED_ON_START:-false}" = "true" ]; then
  python -m app.scripts.seed
fi

exec uvicorn app.main:create_app --factory --host 0.0.0.0 --port 8000 --no-access-log --proxy-headers
