"""
Celery configuration for DocuMind AI.

This module:
  - Sets the default Django settings module
  - Creates the Celery application instance
  - Loads Celery config from Django settings (CELERY_ namespace)
  - Auto-discovers tasks in all INSTALLED_APPS

Usage:
  Start worker (Windows — pool=solo required):
    celery -A config worker --loglevel=info --pool=solo
"""

import os

from celery import Celery

# Tell Celery which Django settings to use
os.environ.setdefault(
    "DJANGO_SETTINGS_MODULE",
    "config.settings",
)

app = Celery("config")

# Read Celery config from Django settings using the CELERY_ prefix
app.config_from_object(
    "django.conf:settings",
    namespace="CELERY",
)

# Auto-discover tasks.py in every installed app
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Helper task for verifying Celery is running correctly."""
    print(f"Request: {self.request!r}")
