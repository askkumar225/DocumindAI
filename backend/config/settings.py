"""
Django settings for DocuMind AI project.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# ─────────────────────────────────────────────
# LOAD .env
# ─────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


# ─────────────────────────────────────────────
# CORE
# ─────────────────────────────────────────────

SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "django-insecure-change-this-in-production",
)

DEBUG = os.getenv("DJANGO_DEBUG", "True") == "True"

ALLOWED_HOSTS = ["*"]


# ─────────────────────────────────────────────
# INSTALLED APPS
# ─────────────────────────────────────────────

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party
    "rest_framework",
    "corsheaders",
    "rest_framework_simplejwt.token_blacklist",

    # Local apps
    "accounts",
    "documents",
    "search",
    # Day 6 — Enterprise workflow apps
    "workflows",
    "notifications",
    "audit",
    # Chat
    "chat",
    # Dashboard + Health check
    "dashboard",
    # General AI
    "ai_app",
    # Career AI
    "career",
    # Government Exam Preparation
    "exams",
]


# ─────────────────────────────────────────────
# MIDDLEWARE
# ─────────────────────────────────────────────

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


# ─────────────────────────────────────────────
# URLS & WSGI
# ─────────────────────────────────────────────

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"


# ─────────────────────────────────────────────
# TEMPLATES
# ─────────────────────────────────────────────

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


# ─────────────────────────────────────────────
# DATABASE — PostgreSQL
# ─────────────────────────────────────────────

def _build_db():
    """Use SQLite when USE_SQLITE=True (or PostgreSQL not available locally)."""
    if os.getenv("USE_SQLITE", "False") == "True":
        return {
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": BASE_DIR / "db.sqlite3",
            }
        }
    return {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.getenv("DB_NAME", "documind"),
            "USER": os.getenv("DB_USER", "documind"),
            "PASSWORD": os.getenv("DB_PASSWORD", "documind_password"),
            "HOST": os.getenv("DB_HOST", "localhost"),
            "PORT": os.getenv("DB_PORT", "5432"),
        }
    }

DATABASES = _build_db()


# ─────────────────────────────────────────────
# AUTH — Custom User Model
# ─────────────────────────────────────────────

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# ─────────────────────────────────────────────
# REST FRAMEWORK — JWT
# ─────────────────────────────────────────────

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        # General AI chat endpoints
        "ai_chat_minute": "30/minute",
        "ai_chat_day":    "200/day",
        # Global fallback
        "user":           "1000/day",
    },
}


# ─────────────────────────────────────────────
# SIMPLEJWT — token lifetimes & rotation
# ─────────────────────────────────────────────

from datetime import timedelta  # noqa: E402

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}


# ─────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]


# ─────────────────────────────────────────────
# MEDIA FILES (Uploaded Documents)
# ─────────────────────────────────────────────

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"


# ─────────────────────────────────────────────
# STATIC FILES
# ─────────────────────────────────────────────

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"


# ─────────────────────────────────────────────
# INTERNATIONALISATION
# ─────────────────────────────────────────────

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# ─────────────────────────────────────────────
# CELERY — Redis broker + result backend
# ─────────────────────────────────────────────

_redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

CELERY_BROKER_URL = _redis_url
CELERY_RESULT_BACKEND = _redis_url.replace("/0", "/1")

CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"
CELERY_ENABLE_UTC = True


# ─────────────────────────────────────────────
# LLM / AI SETTINGS
# ─────────────────────────────────────────────

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")

# Max characters of document text sent to LLM in a single request
AI_MAX_INPUT_CHARS = int(os.getenv("AI_MAX_INPUT_CHARS", "12000"))

# Lower temperature = more deterministic / factual responses
AI_TEMPERATURE = float(os.getenv("AI_TEMPERATURE", "0.1"))


# ─────────────────────────────────────────────
# EMBEDDING SETTINGS (Day 4 — RAG)
# ─────────────────────────────────────────────

# Model used for generating embeddings.
# text-embedding-3-small: 1536 dims, fast, cheap.
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")

# Dimension must match the chosen model output:
#   text-embedding-3-small → 1536
#   text-embedding-3-large → 3072
EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "1536"))

# Chunking parameters
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1000"))       # chars per chunk
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "150"))  # overlapping chars

# Number of top-K chunks returned by semantic search
SEARCH_TOP_K = int(os.getenv("SEARCH_TOP_K", "5"))

# Whether pgvector is available (True for PostgreSQL, False for SQLite dev)
USE_PGVECTOR = os.getenv("USE_PGVECTOR", "False") == "True"


# ─────────────────────────────────────────────
# LOGGING (PRD §25)
# ─────────────────────────────────────────────
# Logs important events: login, upload, processing, AI requests,
# approvals, permission changes, server errors.
# Never logs passwords, API keys, JWT secrets, or sensitive content.

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "{levelname} {asctime} [{name}] {message}",
            "style":  "{",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "verbose": {
            "format": "{levelname} {asctime} [{name}:{lineno}] {message}",
            "style":  "{",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class":     "logging.StreamHandler",
            "formatter": "standard",
        },
    },
    "root": {
        "handlers": ["console"],
        "level":    os.getenv("DJANGO_LOG_LEVEL", "INFO"),
    },
    "loggers": {
        "django": {
            "handlers":  ["console"],
            "level":     os.getenv("DJANGO_LOG_LEVEL", "WARNING"),
            "propagate": False,
        },
        "django.request": {
            "handlers":  ["console"],
            "level":     "ERROR",
            "propagate": False,
        },
        # App-level loggers — INFO in dev, set DJANGO_LOG_LEVEL=WARNING in prod
        "documents": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "chat":      {"handlers": ["console"], "level": "INFO", "propagate": False},
        "workflows": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "audit":     {"handlers": ["console"], "level": "INFO", "propagate": False},
        "dashboard": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}


# ─────────────────────────────────────────────
# MISC
# ─────────────────────────────────────────────

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
