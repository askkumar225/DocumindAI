"""
DocuMind AI — Production settings.

Inherits all base settings and overrides for production.
Never set DEBUG=True in production.

Required environment variables:
    SECRET_KEY
    DATABASE_URL  (or DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT)
    REDIS_URL
    LLM_API_KEY
    ALLOWED_HOSTS
    CORS_ALLOWED_ORIGINS

Run with:
    DJANGO_SETTINGS_MODULE=config.settings_prod gunicorn config.wsgi:application
"""

import os
from .settings import *  # noqa: F401, F403

# ─── Core ─────────────────────────────────────────────────────────────────────

DEBUG = False

SECRET_KEY = os.environ["SECRET_KEY"]  # Hard fail if missing

ALLOWED_HOSTS = [h.strip() for h in os.getenv("ALLOWED_HOSTS", "").split(",") if h.strip()]

# ─── Database ─────────────────────────────────────────────────────────────────

DATABASE_URL = os.getenv("DATABASE_URL", "")

if DATABASE_URL:
    import dj_database_url  # type: ignore
    DATABASES = {"default": dj_database_url.parse(DATABASE_URL, conn_max_age=60)}
else:
    # Fallback to individual env vars (same as base settings)
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME":     os.environ["DB_NAME"],
            "USER":     os.environ["DB_USER"],
            "PASSWORD": os.environ["DB_PASSWORD"],
            "HOST":     os.getenv("DB_HOST", "postgres"),
            "PORT":     os.getenv("DB_PORT", "5432"),
            "CONN_MAX_AGE": 60,
        }
    }

# ─── CORS ─────────────────────────────────────────────────────────────────────

CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
    if o.strip()
]

CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

# ─── Security headers ─────────────────────────────────────────────────────────

SECURE_PROXY_SSL_HEADER   = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT        = os.getenv("SECURE_SSL_REDIRECT", "True") == "True"
SESSION_COOKIE_SECURE      = True
CSRF_COOKIE_SECURE         = True
SECURE_HSTS_SECONDS        = 31536000   # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD        = True
X_FRAME_OPTIONS            = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True

# ─── Static + Media ───────────────────────────────────────────────────────────

STATIC_URL  = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL   = "/media/"
MEDIA_ROOT  = BASE_DIR / "media"

# ─── pgvector — use in production ─────────────────────────────────────────────

USE_PGVECTOR = True

# ─── Celery ───────────────────────────────────────────────────────────────────

_redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
CELERY_BROKER_URL        = _redis_url
CELERY_RESULT_BACKEND    = _redis_url.replace("/0", "/1")
CELERY_TASK_ALWAYS_EAGER = False

# ─── Logging ──────────────────────────────────────────────────────────────────

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": os.getenv("DJANGO_LOG_LEVEL", "INFO"),
            "propagate": False,
        },
        "documents": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "chat":      {"handlers": ["console"], "level": "INFO", "propagate": False},
        "workflows": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "audit":     {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}
