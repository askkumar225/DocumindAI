// ─── Document status & type literals ─────────────────────────────────────────

export type DocumentStatus =
  | "UPLOADED" | "PROCESSING" | "ANALYZED" | "ANALYZING" | "EMBEDDING"
  | "PROCESSED" | "READY" | "FAILED"
  | "REVIEW_REQUIRED" | "PENDING_APPROVAL" | "APPROVED"
  | "REJECTED" | "NEEDS_CHANGES" | "ARCHIVED";

export type DocumentType =
  | "UNKNOWN" | "INVOICE" | "CONTRACT" | "PURCHASE_ORDER"
  | "RECEIPT" | "REPORT" | "POLICY" | "OTHER";

export type AIStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

// ─── Nested models ────────────────────────────────────────────────────────────

export interface ExtractedContent {
  text: string;
  page_count: number;
  extraction_method: "PDF_TEXT" | "DOCX_TEXT" | "OCR" | "UNKNOWN";
  created_at: string;
  updated_at: string;
}

export interface AIAnalysis {
  ai_status: AIStatus;
  document_type: DocumentType;
  confidence: number;
  confidence_percent: number;
  extracted_data: Record<string, unknown>;
  summary: string;
  model_name: string;
  error_message: string;
  created_at: string;
  updated_at: string;
}

// ─── Deep Analysis types ──────────────────────────────────────────────────────

export interface KeyInfoItem {
  label: string;
  value: string;
  page?: number | null;
}

export interface DateItem {
  name: string;
  value: string | null;
  description: string;
  page?: number | null;
}

export interface EntityItem {
  name: string;
  type: "PERSON" | "COMPANY" | "LOCATION" | "OTHER";
  context: string;
}

export interface AmountItem {
  name: string;
  value: number | null;
  currency: string | null;
  description: string;
  page?: number | null;
}

export interface MissingInfoItem {
  issue: string;
  severity: RiskLevel;
  description: string;
}

export interface InconsistencyItem {
  issue: string;
  severity: RiskLevel;
  description: string;
  locations: string[];
}

export interface RiskItem {
  title: string;
  severity: RiskLevel;
  description: string;
  source_text: string;
  page?: number | null;
}

export interface DocumentDeepAnalysis {
  id: number;
  status: AIStatus;
  summary: string;
  key_information: KeyInfoItem[];
  important_dates: DateItem[];
  entities: EntityItem[];
  amounts: AmountItem[];
  missing_information: MissingInfoItem[];
  inconsistencies: InconsistencyItem[];
  risks: RiskItem[];
  overall_risk_level: RiskLevel;
  confidence_score: number;
  risk_count: number;
  has_issues: boolean;
  error_message: string;
  created_at: string;
  updated_at: string;
}

// ─── Document (full detail) ───────────────────────────────────────────────────

export interface Document {
  id: number;
  title: string;
  file: string;
  document_type: DocumentType;
  status: DocumentStatus;
  uploaded_by: number;
  extracted_content: ExtractedContent | null;
  ai_analysis: AIAnalysis | null;
  created_at: string;
  updated_at: string;
}

// ─── Document (list — lightweight) ───────────────────────────────────────────

export interface DocumentListItem {
  id: number;
  title: string;
  document_type: DocumentType;
  status: DocumentStatus;
  ai_status: AIStatus | null;
  confidence_percent: number | null;
  extraction_method: "PDF_TEXT" | "DOCX_TEXT" | "OCR" | "UNKNOWN" | null;
  page_count: number | null;
  uploaded_by: number;
  created_at: string;
  updated_at: string;
}

// ─── AI analysis detail response ──────────────────────────────────────────────

export interface AIAnalysisResponse extends AIAnalysis {
  document_id: number;
  document_title: string;
}

// ─── Comparison types ─────────────────────────────────────────────────────────

export type ComparisonStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
export type ComparisonResultStatus = "MATCH" | "MISMATCH" | "MISSING";

export interface ComparisonResult {
  id: number;
  field_name: string;
  document_values: Record<string, string | null>;
  status: ComparisonResultStatus;
  severity: RiskLevel | "";
  explanation: string;
  page_references: Record<string, number | null>;
  mismatch_type: string;
}

export interface ComparisonDocument {
  id: number;
  document: number;
  document_title: string;
  document_type: string;
  role_label: string;
}

export interface DocumentComparison {
  id: number;
  title: string;
  status: ComparisonStatus;
  overall_status: "ALL_MATCH" | "MISMATCH_FOUND" | "INCOMPLETE" | "";
  summary: string;
  comparison_documents: ComparisonDocument[];
  results: ComparisonResult[];
  match_count: number;
  mismatch_count: number;
  error_message: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface DocumentComparisonListItem {
  id: number;
  title: string;
  status: ComparisonStatus;
  overall_status: "ALL_MATCH" | "MISMATCH_FOUND" | "INCOMPLETE" | "";
  doc_count: number;
  mismatch_count: number;
  created_at: string;
  completed_at: string | null;
}

// ─── Approval / Review types ──────────────────────────────────────────────────

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_CHANGES";
export type ApprovalPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export interface UserBrief {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface ApprovalRequest {
  id: number;
  document: number;
  document_title: string;
  document_status: DocumentStatus;
  requested_by: number;
  requested_by_detail: UserBrief;
  reviewer: number;
  reviewer_detail: UserBrief;
  status: ApprovalStatus;
  comments: string;
  priority: ApprovalPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
}

// ─── Type-specific extracted data shapes ──────────────────────────────────────

export interface InvoiceData {
  invoice_number: string | null;
  vendor_name: string | null;
  customer_name: string | null;
  invoice_date: string | null;
  due_date: string | null;
  subtotal: number | null;
  tax: number | null;
  gst: number | null;
  discount: number | null;
  total_amount: number | null;
  currency: string | null;
  payment_terms: string | null;
  po_reference: string | null;
}

export interface ContractData {
  parties: string[];
  contract_date: string | null;
  start_date: string | null;
  end_date: string | null;
  duration: string | null;
  contract_value: number | null;
  currency: string | null;
  payment_terms: string | null;
  termination_notice: string | null;
  automatic_renewal: boolean | null;
  governing_law: string | null;
  penalty_clauses: string | null;
}

export interface PurchaseOrderData {
  po_number: string | null;
  vendor_name: string | null;
  buyer_name: string | null;
  po_date: string | null;
  delivery_date: string | null;
  items: Array<{ description: string; quantity: number; unit_price: number }>;
  subtotal: number | null;
  tax: number | null;
  total_amount: number | null;
  currency: string | null;
  payment_terms: string | null;
  delivery_address: string | null;
}
