export type FlagType =
  | 'causation_relevant'
  | 'pre_existing_condition'
  | 'record_conflict'
  | 'treatment_gap';

export type CaseStatus = 'intake' | 'processing' | 'review' | 'complete';
export type ExtractionStatus = 'pending' | 'processing' | 'complete' | 'failed';
export type Role = 'paralegal' | 'attorney' | 'admin';

export interface AuthUser {
  id: number;
  username: string;
  role: Role;
}

export interface Case {
  id: number;
  claimant_name: string;
  firm: string;
  status: CaseStatus;
  created_at: string;
  updated_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  // list endpoint extras
  document_count?: number;
  event_count?: number;
  verified_event_count?: number;
  // detail endpoint nested
  documents?: SourceDocument[];
  events?: TimelineEvent[];
}

export interface SourceDocument {
  id: number;
  case: number;
  filename: string;
  file: string | null;
  storage_ref: string;
  uploaded_at: string;
  extraction_status: ExtractionStatus;
}

export interface SourceDocumentRef {
  id: number;
  filename: string;
  file: string | null;
}

export interface TimelineEvent {
  id: number;
  case: number;
  source_documents: number[];
  source_documents_detail: SourceDocumentRef[];
  event_date: string;
  provider_name: string;
  description: string;
  source_page: number | null;
  citation_text: string;
  flags: FlagType[];
  verified: boolean;
  reviewer_note: string;
}
