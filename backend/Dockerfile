FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for Pillow and Korean fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libjpeg62-turbo-dev zlib1g-dev libfreetype6-dev \
    fonts-nanum curl \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
COPY src/ src/
COPY sql/ sql/

RUN pip install --no-cache-dir .

EXPOSE 8000

CMD ["uvicorn", "yes24_clone.main:app", "--host", "0.0.0.0", "--port", "8000"]
