# ─── DocuMind AI — Backend Dockerfile ───────────────────────────────────────
# Multi-stage: builder installs dependencies, runtime copies only what's needed.
#
# Usage:
#   docker build -t documind-backend ./backend
#   docker run -p 8000:8000 --env-file .env documind-backend

FROM python:3.13-slim AS builder

# System dependencies needed to compile psycopg2 and Pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies into a virtual environment
COPY requirements.txt .
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt


# ─── Runtime stage ────────────────────────────────────────────────────────────

FROM python:3.13-slim AS runtime

# Tesseract for OCR
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# Copy application code
COPY . .

# Create media and staticfiles directories
RUN mkdir -p media staticfiles

# Collect static files
ENV DJANGO_SETTINGS_MODULE=config.settings_prod
RUN python manage.py collectstatic --noinput || true

# Non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Gunicorn in production
CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "4", \
     "--worker-class", "gthread", \
     "--threads", "2", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
