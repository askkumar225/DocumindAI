/**
 * ActionResultRenderer
 *
 * Selects the correct rich UI component based on result_type from the API.
 * Rendered below the text bubble for action responses.
 */

import { useNavigate } from "react-router-dom";
import DocumentResultCard from "./DocumentResultCard";
import RiskResultCard     from "./RiskResultCard";
import ApprovalResultCard from "./ApprovalResultCard";
import ExtractionResult   from "./ExtractionResult";
import SummaryResult      from "./SummaryResult";
import ComparisonResultCard from "./ComparisonResultCard";
import EmptyState         from "./EmptyState";

interface Props {
  resultType: string;
  actionData: Record<string, unknown>;
  redirect?: string;
  onAskAI?: (docId: number, title: string) => void;
}

export default function ActionResultRenderer({
  resultType, actionData, redirect, onAskAI,
}: Props) {
  const navigate = useNavigate();

  // ── Documents ──────────────────────────────────────────────────────────────
  if (resultType === "documents") {
    const docs = (actionData.documents as unknown[]) ?? [];
    if (!docs.length) {
      return (
        <EmptyState
          icon="📄"
          title="No documents found"
          description="Try uploading documents first or adjust your search."
          action={{ label: "Upload Document", onClick: () => navigate("/upload") }}
        />
      );
    }
    return (
      <div className="space-y-2">
        {(docs as Parameters<typeof DocumentResultCard>[0]["doc"][]).map((doc: any, i: number) => (
          <DocumentResultCard key={doc.id ?? i} doc={doc} onAskAI={onAskAI} />
        ))}
      </div>
    );
  }

  // ── Risks ──────────────────────────────────────────────────────────────────
  if (resultType === "risks") {
    const risks = (actionData.risks as unknown[]) ?? [];
    if (!risks.length) {
      return (
        <EmptyState
          icon="✅"
          title="No risk documents found"
          description="Great news — no high-risk documents detected in your workspace."
        />
      );
    }
    return (
      <div className="space-y-3">
        {(risks as any[]).map((item: any, i: number) => (
          <RiskResultCard key={item.document_id ?? i} item={item} />
        ))}
      </div>
    );
  }

  // ── Approvals ──────────────────────────────────────────────────────────────
  if (resultType === "approvals") {
    const approvals = (actionData.approvals as unknown[]) ?? [];
    if (!approvals.length) {
      return (
        <EmptyState
          icon="✅"
          title="No pending approvals"
          description="Your review queue is empty."
        />
      );
    }
    return (
      <div className="space-y-2">
        {(approvals as any[]).map((item: any, i: number) => (
          <ApprovalResultCard key={item.id ?? i} item={item} />
        ))}
      </div>
    );
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  if (resultType === "summary") {
    if (actionData.error) return null;
    return (
      <SummaryResult
        summary={String(actionData.summary ?? "")}
        keyPoints={actionData.key_points as string[] | undefined}
        documentTitle={actionData.document_title as string | undefined}
        documentId={actionData.document_id as number | undefined}
        overallRisk={actionData.overall_risk as string | null | undefined}
        confidence={actionData.confidence as number | undefined}
      />
    );
  }

  // ── Extraction ─────────────────────────────────────────────────────────────
  if (resultType === "extraction") {
    if (actionData.error) return null;
    return (
      <ExtractionResult
        items={(actionData.items as any[]) ?? []}
        extractType={String(actionData.extract_type ?? "data")}
        documentTitle={String(actionData.document_title ?? "")}
      />
    );
  }

  // ── Comparison ─────────────────────────────────────────────────────────────
  if (resultType === "comparison") {
    if (actionData.error) return null;
    return (
      <ComparisonResultCard
        comparisonId={actionData.comparison_id as number | undefined}
        title={actionData.title as string | undefined}
        status={actionData.status as string | undefined}
        docCount={actionData.doc_count as number | undefined}
        redirect={redirect || (actionData.redirect as string | undefined)}
      />
    );
  }

  return null;
}
