"""
Comparison tests — value normalisation and mismatch detection.
"""

import pytest
from documents.services.comparator import (
    _compare_field,
    _normalise_amount,
    _normalise_date,
    _normalise_text,
)


class TestValueNormalisation:
    def test_normalise_plain_number(self):
        assert _normalise_amount(100000) == 100000.0

    def test_normalise_formatted_rupees(self):
        assert _normalise_amount("₹1,00,000") == 100000.0

    def test_normalise_inr_string(self):
        assert _normalise_amount("INR 100000") == 100000.0

    def test_normalise_none_amount(self):
        assert _normalise_amount(None) is None

    def test_normalise_iso_date(self):
        assert _normalise_date("2026-10-15") == "2026-10-15"

    def test_normalise_dd_mm_yyyy(self):
        assert _normalise_date("15/10/2026") == "2026-10-15"

    def test_normalise_dd_mon_yyyy(self):
        assert _normalise_date("15-Oct-2026") == "2026-10-15"

    def test_normalise_none_date(self):
        assert _normalise_date(None) is None

    def test_normalise_text_whitespace(self):
        assert _normalise_text("  ABC Technologies  ") == "abc technologies"

    def test_normalise_text_none(self):
        assert _normalise_text(None) == ""


class TestFieldComparison:
    def test_matching_amounts(self):
        status, _ = _compare_field("total_amount", {
            "Invoice.pdf": "100000",
            "PO.pdf":      "100000",
        })
        assert status == "MATCH"

    def test_mismatching_amounts(self):
        status, explanation = _compare_field("total_amount", {
            "Invoice.pdf": "105000",
            "PO.pdf":      "100000",
        })
        assert status == "MISMATCH"
        assert "105000" in explanation or "100000" in explanation

    def test_matching_dates(self):
        status, _ = _compare_field("delivery_date", {
            "PO.pdf":      "2026-10-15",
            "Invoice.pdf": "15/10/2026",
        })
        assert status == "MATCH"

    def test_mismatching_dates(self):
        status, _ = _compare_field("delivery_date", {
            "PO.pdf":      "2026-10-15",
            "Invoice.pdf": "2026-11-01",
        })
        assert status == "MISMATCH"

    def test_matching_vendor_names(self):
        status, _ = _compare_field("vendor_name", {
            "Invoice.pdf": "ABC Technologies",
            "PO.pdf":      "ABC Technologies",
        })
        assert status == "MATCH"

    def test_mismatching_vendor_names(self):
        status, _ = _compare_field("vendor_name", {
            "Invoice.pdf": "ABC Technologies",
            "PO.pdf":      "XYZ Corp",
        })
        assert status == "MISMATCH"

    def test_missing_field_in_one_doc(self):
        status, _ = _compare_field("po_number", {
            "Invoice.pdf": None,
            "PO.pdf":      "PO-1001",
        })
        assert status == "MISSING"

    def test_missing_field_in_all_docs(self):
        status, _ = _compare_field("reference", {
            "Invoice.pdf": None,
            "PO.pdf":      None,
        })
        assert status == "MISSING"
