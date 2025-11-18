# ================================
# Production Dockerfile
# ================================
FROM python:3.11-slim

# Prevents Python from writing .pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy only application code (no secrets ever!)
COPY . .

# Create directory where secrets will be mounted at runtime
RUN mkdir -p /secrets

# Expose port
EXPOSE 8000

# Use non-root user (optional but recommended)
# RUN adduser --disabled-password --gecos '' appuser
# USER appuser

# Production command (no --reload)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]