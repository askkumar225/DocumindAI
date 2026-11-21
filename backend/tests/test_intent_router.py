"""
Intent router tests — verify pattern matching covers all major command types.
"""

import pytest
from chat.services.intent_router import (
    classify_intent,
    CHAT, SUMMARIZE, EXTRACT, SEARCH, COMPARE,
    FIND_RISKS, FIND_MISSING, FIND_EXPIRING,
    FIND_PENDING_APPROVALS, EXPLAIN,
)


class TestIntentClassification:
    """Fast pattern-based classification tests — no LLM calls needed."""

    def _classify(self, message: str) -> str:
        return classify_intent(message).action_type

    # SUMMARIZE
    def test_summarize_command(self):
        assert self._classify("summarize this document") == SUMMARIZE

    def test_summary_overview(self):
        assert self._classify("give me an overview of this file") == SUMMARIZE

    # EXTRACT
    def test_extract_dates(self):
        assert self._classify("extract all dates from this contract") == EXTRACT

    def test_extract_amounts(self):
        assert self._classify("list all amounts in this invoice") == EXTRACT

    # SEARCH
    def test_search_contracts(self):
        assert self._classify("show all contracts") == SEARCH

    def test_search_invoices(self):
        assert self._classify("find invoices from ABC") == SEARCH

    def test_show_documents(self):
        assert self._classify("display all documents") == SEARCH

    # FIND_RISKS
    def test_find_high_risk(self):
        assert self._classify("show high-risk documents") == FIND_RISKS

    def test_find_issues(self):
        assert self._classify("find potential issues in this contract") == FIND_RISKS

    def test_unlimited_liability(self):
        assert self._classify("any unlimited liability clauses?") == FIND_RISKS

    # FIND_MISSING
    def test_find_missing_info(self):
        assert self._classify("what information is missing in this invoice?") == FIND_MISSING

    # FIND_EXPIRING
    def test_expiring_contracts(self):
        assert self._classify("find contracts expiring soon") == FIND_EXPIRING

    def test_renewal_check(self):
        assert self._classify("which contracts are up for renewal?") == FIND_EXPIRING

    # FIND_PENDING_APPROVALS
    def test_pending_approvals(self):
        assert self._classify("what documents need my approval?") == FIND_PENDING_APPROVALS

    def test_review_queue(self):
        assert self._classify("show my pending review queue") == FIND_PENDING_APPROVALS

    # COMPARE
    def test_compare_documents(self):
        assert self._classify("compare these two documents") == COMPARE

    def test_vs_comparison(self):
        assert self._classify("invoice vs purchase order") == COMPARE

    def test_mismatch_check(self):
        assert self._classify("any mismatches between these files?") == COMPARE

    # EXPLAIN
    def test_explain_term(self):
        assert self._classify("what does unlimited liability mean?") == EXPLAIN

    def test_simplify_clause(self):
        assert self._classify("explain this clause in simple English") == EXPLAIN


class TestIntentParameters:
    def test_search_extracts_document_type_contract(self):
        result = classify_intent("show all contracts")
        assert result.parameters.get("document_type") == "CONTRACT"

    def test_search_extracts_document_type_invoice(self):
        result = classify_intent("find all invoices")
        assert result.parameters.get("document_type") == "INVOICE"

    def test_risk_extracts_high_level(self):
        result = classify_intent("show high-risk documents")
        assert result.parameters.get("risk_level") == "HIGH"

    def test_amount_filter_above(self):
        result = classify_intent("show invoices above 100000")
        assert result.parameters.get("amount_min") is not None
        assert result.parameters["amount_min"] == 100000.0

    def test_confidence_is_positive(self):
        result = classify_intent("summarize this contract")
        assert result.confidence > 0
