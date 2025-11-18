# ================================
# Development Dockerfile
# ================================
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy Python dependencies and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Ensure secrets directory exists and copy secret files
RUN mkdir -p /app/secrets
COPY app/secrets/*.pem /app/secrets/

# Set proper permissions for secrets
RUN chmod 600 /app/secrets/*.pem

# Expose default FastAPI port
EXPOSE 8000

# Run app with auto-reload for development
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
