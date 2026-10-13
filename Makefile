.PHONY: up down logs dev-db

up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

dev-db:
	docker compose up -d db
