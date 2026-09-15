export type FlagType =
  | 'causation_relevant'
  | 'pre_existing_condition'
  | 'record_conflict'
  | 'treatment_gap';

export type CaseStatus = 'intake' | 'processing' | 'review' | 'complete';
export type ExtractionStatus = 'pending' | 'processing' | 'complete' | 'failed';

export interface Case {
  id: number;
  claimant_name: string;
  firm: string;
  status: CaseStatus;
  created_at: string;
  updated_at: string;
}

export interface SourceDocument {
  id: number;
  case: number;
  filename: string;
  storage_ref: string;
  uploaded_at: string;
  extraction_status: ExtractionStatus;
}

export interface TimelineEvent {
  id: number;
  case: number;
  source_document: number | null;
  event_date: string;
  provider_name: string;
  description: string;
  source_page: number | null;
  citation_text: string;
  flags: FlagType[];
}
