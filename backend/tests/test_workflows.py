"""
Workflow tests — RBAC, approvals, permissions.
"""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient


def _fake_pdf(name="test.pdf"):
    return SimpleUploadedFile(name, b"%PDF-1.4 fake", content_type="application/pdf")


def _create_user(django_user_model, username, role="EMPLOYEE"):
    return django_user_model.objects.create_user(
        username=username,
        email=f"{username}@example.com",
        password="pass123!",
        role=role,
    )


def _auth_client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def employee(django_user_model):
    return _create_user(django_user_model, "employee1", "EMPLOYEE")


@pytest.fixture
def manager(django_user_model):
    return _create_user(django_user_model, "manager1", "MANAGER")


@pytest.fixture
def admin_user(django_user_model):
    return _create_user(django_user_model, "admin1", "ADMIN")


@pytest.fixture
def uploaded_doc(employee):
    """Upload a document as employee and return its ID."""
    client = _auth_client(employee)
    res = client.post("/api/documents/upload/", {
        "title": "Contract.pdf",
        "file":  _fake_pdf(),
    }, format="multipart")
    assert res.status_code == 201
    return res.data["id"]


@pytest.mark.django_db
class TestRBAC:
    def test_employee_cannot_access_admin_audit(self, employee):
        client = _auth_client(employee)
        res = client.get("/api/audit/")
        assert res.status_code == 403

    def test_employee_cannot_approve_document(self, employee, manager, uploaded_doc):
        """Employees cannot approve — only MANAGER/ADMIN."""
        # First create an approval request as employee
        emp_client = _auth_client(employee)
        approval_res = emp_client.post("/api/workflows/approvals/", {
            "document": uploaded_doc,
            "reviewer": manager.id,
        }, format="json")
        assert approval_res.status_code == 201
        approval_id = approval_res.data["id"]

        # Employee tries to approve — should fail
        res = emp_client.post(f"/api/workflows/approvals/{approval_id}/approve/", {}, format="json")
        assert res.status_code == 403

    def test_manager_can_approve_assigned_document(self, employee, manager, uploaded_doc):
        """Managers can approve documents assigned to them."""
        emp_client = _auth_client(employee)
        mgr_client = _auth_client(manager)

        approval_res = emp_client.post("/api/workflows/approvals/", {
            "document": uploaded_doc,
            "reviewer": manager.id,
        }, format="json")
        approval_id = approval_res.data["id"]

        res = mgr_client.post(f"/api/workflows/approvals/{approval_id}/approve/", {
            "comments": "Looks good."
        }, format="json")
        assert res.status_code == 200
        assert res.data["status"] == "APPROVED"

    def test_manager_can_reject_document(self, employee, manager, uploaded_doc):
        emp_client = _auth_client(employee)
        mgr_client = _auth_client(manager)

        approval_res = emp_client.post("/api/workflows/approvals/", {
            "document": uploaded_doc,
            "reviewer": manager.id,
        }, format="json")
        approval_id = approval_res.data["id"]

        res = mgr_client.post(f"/api/workflows/approvals/{approval_id}/reject/", {
            "comments": "Missing signature."
        }, format="json")
        assert res.status_code == 200
        assert res.data["status"] == "REJECTED"

    def test_unassigned_manager_cannot_approve(self, employee, manager, uploaded_doc, django_user_model):
        """A manager not assigned as reviewer cannot approve."""
        emp_client  = _auth_client(employee)
        other_mgr   = _create_user(django_user_model, "manager2", "MANAGER")
        other_client = _auth_client(other_mgr)

        approval_res = emp_client.post("/api/workflows/approvals/", {
            "document": uploaded_doc,
            "reviewer": manager.id,
        }, format="json")
        approval_id = approval_res.data["id"]

        res = other_client.post(f"/api/workflows/approvals/{approval_id}/approve/", {}, format="json")
        assert res.status_code == 403

    def test_admin_can_approve_any_document(self, employee, manager, admin_user, uploaded_doc):
        emp_client   = _auth_client(employee)
        admin_client = _auth_client(admin_user)

        approval_res = emp_client.post("/api/workflows/approvals/", {
            "document": uploaded_doc,
            "reviewer": manager.id,
        }, format="json")
        approval_id = approval_res.data["id"]

        res = admin_client.post(f"/api/workflows/approvals/{approval_id}/approve/", {}, format="json")
        assert res.status_code == 200

    def test_duplicate_pending_approval_prevented(self, employee, manager, uploaded_doc):
        emp_client = _auth_client(employee)
        emp_client.post("/api/workflows/approvals/", {
            "document": uploaded_doc,
            "reviewer": manager.id,
        }, format="json")

        # Second request for the same document should fail
        res = emp_client.post("/api/workflows/approvals/", {
            "document": uploaded_doc,
            "reviewer": manager.id,
        }, format="json")
        assert res.status_code == 400


@pytest.mark.django_db
class TestDocumentStatus:
    def test_approval_changes_document_status(self, employee, manager, uploaded_doc):
        emp_client = _auth_client(employee)
        mgr_client = _auth_client(manager)

        approval_res = emp_client.post("/api/workflows/approvals/", {
            "document": uploaded_doc,
            "reviewer": manager.id,
        }, format="json")
        approval_id = approval_res.data["id"]

        # Check doc is PENDING_APPROVAL
        doc_res = emp_client.get(f"/api/documents/{uploaded_doc}/")
        assert doc_res.data["status"] == "PENDING_APPROVAL"

        # Approve
        mgr_client.post(f"/api/workflows/approvals/{approval_id}/approve/", {}, format="json")

        # Now APPROVED
        doc_res2 = emp_client.get(f"/api/documents/{uploaded_doc}/")
        assert doc_res2.data["status"] == "APPROVED"
