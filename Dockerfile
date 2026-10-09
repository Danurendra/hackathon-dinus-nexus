# ==========================================
# DinusNexus Backend Dockerfile
# Python 3.12 + FastAPI + LangGraph
# ==========================================
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code, migrations, dataset, and configuration
COPY src/ ./src/
COPY alembic/ ./alembic/
COPY alembic.ini .
COPY check_data.py .

# Expose API port
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Run API server
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
