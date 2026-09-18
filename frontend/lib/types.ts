export type FlagType =
  | 'causation_relevant'
  | 'pre_existing_condition'
  | 'record_conflict'
  | 'treatment_gap';

export type CaseStatus = 'intake' | 'processing' | 'review' | 'complete';
export type ExtractionStatus = 'pending' | 'processing' | 'complete' | 'failed';
export type Role = 'paralegal' | 'attorney' | 'admin';

export interface OrgRef {
  id: number;
  name: string;
  slug: string;
}

export interface Membership {
  organization: OrgRef;
  role: Role;
  is_default: boolean;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  // Global Admin ("God Mode") — platform staff, not a member of any org.
  is_platform_admin: boolean;
  // Every org this person belongs to — a person can belong to more than one.
  memberships: Membership[];
  // Only set once a tenant is actually resolved (a real subdomain, or the
  // X-Tenant-Slug override after the app/user has picked one) AND it matches
  // one of `memberships`. Null right after login — the app decides where to
  // go next from `memberships`, not from these.
  role: Role | null;
  organization: OrgRef | null;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

export interface Member {
  id: number;
  email: string;
  role: Role;
  is_active: boolean;
  is_default: boolean;
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
