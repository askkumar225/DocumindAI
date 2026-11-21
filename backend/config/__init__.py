# This ensures the Celery app is loaded when Django starts,
# so shared_task decorators in tasks.py can use it.
from .celery import app as celery_app

__all__ = ("celery_app",)
