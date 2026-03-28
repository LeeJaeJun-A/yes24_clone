.PHONY: up down seed reset logs build shell-backend shell-frontend verify deploy destroy ssh status

up:
	docker compose up -d --build

down:
	docker compose down

seed:
	docker compose --profile seed run --rm seeder

reset:
	docker compose down -v
	docker compose up -d --build
	@echo "Waiting for services to be ready..."
	@sleep 10
	docker compose --profile seed run --rm seeder

logs:
	docker compose logs -f

build:
	docker compose build

shell-backend:
	docker compose exec backend bash

shell-frontend:
	docker compose exec frontend sh

verify:
	bash scripts/verify.sh

# AWS Deployment
deploy:
	bash infra/scripts/deploy.sh

destroy:
	bash infra/scripts/destroy.sh

ssh:
	bash infra/scripts/ssh.sh

status:
	bash infra/scripts/status.sh
