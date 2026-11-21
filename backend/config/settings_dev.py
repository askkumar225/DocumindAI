"""
Local development settings — NO Docker required.

Uses:
  - SQLite instead of PostgreSQL
  - Celery task_always_eager (tasks run synchronously, no Redis needed)
  - Embeddings stored as JSONField (numpy cosine similarity, no pgvector needed)
  - AI analysis + embeddings disabled by default (set LLM_API_KEY to enable)

Run with:
  $env:DJANGO_SETTINGS_MODULE="config.settings_dev"
  python manage.py runserver
"""

from .settings import *  # noqa: F401, F403
from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent

# ─── SQLite (no Docker needed) ────────────────────────────────────────────────
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# ─── Celery — run tasks synchronously (no Redis needed) ──────────────────────
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# ─── Embedding settings — SQLite dev mode ─────────────────────────────────────
# USE_PGVECTOR=False → embeddings stored as JSONField, cosine sim via numpy
USE_PGVECTOR = False

# ─── LLM / Embedding key ──────────────────────────────────────────────────────
LLM_API_KEY = os.getenv("LLM_API_KEY", "")

# Same model, same dim — works with or without real pgvector
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIM = 1536
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150
SEARCH_TOP_K = 5
