#!/bin/bash
set -euo pipefail
exec > /var/log/user-data.log 2>&1

echo "=== YES24 Clone Setup ==="
date

# Install Docker
dnf update -y
dnf install -y docker git
systemctl enable docker
systemctl start docker

# Install Docker Compose plugin
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# ECR Login
aws ecr get-login-password --region ${region} | \
  docker login --username AWS --password-stdin ${account_id}.dkr.ecr.${region}.amazonaws.com

# Create app directory
mkdir -p /opt/yes24-clone
cd /opt/yes24-clone

# Create docker-compose for production
cat > docker-compose.yml <<'COMPOSE'
services:
  nginx:
    image: nginx:1.27-alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      frontend:
        condition: service_started
      backend:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    image: ${ecr_frontend}:latest
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost/api/v1
      - API_INTERNAL_URL=http://backend:8000/api/v1
      - IMAGE_BASE_URL=http://localhost/image
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped

  backend:
    image: ${ecr_backend}:latest
    environment:
      - DATABASE_URL=postgresql+asyncpg://yes24:${db_password}@postgres:5432/yes24
      - REDIS_URL=redis://redis:6379/0
      - MINIO_ENDPOINT=minio:9000
      - MINIO_ACCESS_KEY=${minio_user}
      - MINIO_SECRET_KEY=${minio_password}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_started
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/healthz')"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s
    restart: unless-stopped

  postgres:
    image: postgres:17-alpine
    environment:
      - POSTGRES_USER=yes24
      - POSTGRES_PASSWORD=${db_password}
      - POSTGRES_DB=yes24
    volumes:
      - pg_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U yes24"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=${minio_user}
      - MINIO_ROOT_PASSWORD=${minio_password}
    volumes:
      - minio_data:/data
    restart: unless-stopped

  seeder:
    image: ${ecr_backend}:latest
    command: python -m yes24_clone.seed
    environment:
      - DATABASE_URL=postgresql+asyncpg://yes24:${db_password}@postgres:5432/yes24
      - REDIS_URL=redis://redis:6379/0
      - MINIO_ENDPOINT=minio:9000
      - MINIO_ACCESS_KEY=${minio_user}
      - MINIO_SECRET_KEY=${minio_password}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_started
    profiles:
      - seed

volumes:
  pg_data:
  redis_data:
  minio_data:
COMPOSE

# Create nginx config
cat > nginx.conf <<'NGINX'
server {
    listen 80;
    server_name _;
    server_tokens off;
    add_header X-AspNet-Version "4.0.30319" always;
    add_header X-Powered-By "ASP.NET" always;

    gzip on;
    gzip_types text/html text/css application/javascript application/json image/svg+xml;
    gzip_min_length 256;

    location /image/ {
        proxy_pass http://minio:9000/covers/;
        proxy_set_header Host minio:9000;
        proxy_hide_header x-amz-request-id;
        proxy_hide_header x-amz-id-2;
        add_header Cache-Control "public, max-age=86400";
        add_header X-Powered-By "ASP.NET" always;
    }

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ~ ^/(healthz|readyz)$ {
        proxy_pass http://backend:8000;
    }

    location /admin/ { return 403; }
    location = /robots.txt { proxy_pass http://backend:8000; }
    location = /sitemap.xml { proxy_pass http://backend:8000; }

    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX

# Copy init.sql (will be fetched from the backend image)
docker pull ${ecr_backend}:latest
docker create --name tmp-backend ${ecr_backend}:latest
docker cp tmp-backend:/app/sql/init.sql ./init.sql
docker rm tmp-backend

# Start infrastructure services first
docker compose up -d postgres redis minio
echo "Waiting for database..."
sleep 10

# Start app services
docker compose up -d backend
sleep 15

# Start frontend and nginx
docker compose up -d frontend
sleep 10
docker compose up -d nginx

# Run seeder
echo "Running data seeder (this takes a few minutes)..."
docker compose --profile seed run --rm seeder

echo "=== YES24 Clone is ready ==="
echo "Access at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
date
