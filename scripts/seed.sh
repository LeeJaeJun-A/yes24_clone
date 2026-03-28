#!/bin/bash
echo "Running YES24 Clone data seeder..."
docker compose --profile seed run --rm seeder
echo "Done!"
