.PHONY: up down logs dev-db backend-dev frontend-dev migrate seed seed-reset gen-api lint typecheck test check

BACKEND := cd backend &&
FRONTEND := cd frontend &&

.env:
	cp .env.example .env

up: .env
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

dev-db: .env
	docker compose up -d db

backend-dev:
	$(BACKEND) uv run uvicorn app.main:create_app --factory --reload --port 8000

frontend-dev:
	$(FRONTEND) npm run dev

migrate:
	$(BACKEND) uv run alembic upgrade head

seed:
	$(BACKEND) uv run python -m app.scripts.seed

seed-reset:
	$(BACKEND) uv run python -m app.scripts.seed --reset

gen-api:
	$(FRONTEND) npm run gen:api

lint:
	$(BACKEND) uv run ruff check . && uv run ruff format --check .
	$(FRONTEND) npm run lint && npm run format:check

typecheck:
	$(BACKEND) uv run mypy
	$(FRONTEND) npm run typecheck

test:
	$(BACKEND) uv run pytest
	$(FRONTEND) npm test

check: lint typecheck test
