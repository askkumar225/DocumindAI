from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model for DocuMind AI.

    Extends Django's AbstractUser to add:
    - role: ADMIN / MANAGER / EMPLOYEE
    - department: the user's department
    """

    ROLE_CHOICES = [
        ("ADMIN", "Admin"),
        ("MANAGER", "Manager"),
        ("EMPLOYEE", "Employee"),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="EMPLOYEE",
    )

    department = models.CharField(
        max_length=100,
        blank=True,
    )

    def __str__(self):
        return f"{self.username} ({self.role})"
