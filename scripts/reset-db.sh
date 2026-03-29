#!/bin/bash
# YES24 Clone - Full reset (wipes all data and reseeds)
set -e

echo "⚠️  This will destroy all data and reseed from scratch."
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo "Stopping and removing volumes..."
docker compose down -v

echo "Starting infrastructure..."
docker compose up -d postgres redis minio

echo "Waiting for postgres to be healthy..."
until docker compose exec -T postgres pg_isready -U yes24 > /dev/null 2>&1; do
  sleep 2
done

echo "Starting backend..."
docker compose up -d backend

echo "Waiting for backend to be healthy..."
until curl -sf http://localhost/healthz > /dev/null 2>&1; do
  sleep 3
done

echo "Running seeder (this takes 3-5 minutes)..."
docker compose --profile seed run --rm seeder

echo "Starting all services..."
docker compose up -d

echo "✅ Reset complete! http://localhost"
