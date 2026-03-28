#!/bin/bash
echo "Resetting YES24 Clone database..."
docker compose down -v
docker compose up -d postgres redis minio
echo "Waiting for services..."
sleep 5
docker compose up -d backend
sleep 5
docker compose --profile seed run --rm seeder
docker compose up -d
echo "Reset complete!"
