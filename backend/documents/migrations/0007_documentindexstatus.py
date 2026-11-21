import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("documents", "0006_alter_document_status"),
    ]

    operations = [
        migrations.CreateModel(
            name="DocumentIndexStatus",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("document", models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="index_status",
                    to="documents.document",
                )),
                ("status", models.CharField(
                    choices=[
                        ("PENDING",    "Pending"),
                        ("PROCESSING", "Processing"),
                        ("READY",      "Ready"),
                        ("FAILED",     "Failed"),
                    ],
                    default="PENDING",
                    max_length=20,
                )),
                ("chunk_count",   models.IntegerField(default=0)),
                ("content_hash",  models.CharField(blank=True, max_length=32)),
                ("error_message", models.TextField(blank=True)),
                ("indexed_at",    models.DateTimeField(blank=True, null=True)),
                ("created_at",    models.DateTimeField(auto_now_add=True)),
                ("updated_at",    models.DateTimeField(auto_now=True)),
            ],
            options={"verbose_name": "Document Index Status"},
        ),
    ]
