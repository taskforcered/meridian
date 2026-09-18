import { getStoredTenantSlug } from './tenant';
import type { AuthUser, Case, Member, Organization, SourceDocument, TimelineEvent } from './types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8095/api';

const TOKEN_KEY = 'meridian_token';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const tenantSlug = getStoredTenantSlug();
  const isFormData = init?.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Token ${token}` } : {}),
    // Set when a platform admin has "entered" a tenant (see lib/tenant.tsx) —
    // a routing hint only; the backend never trusts it for authorization.
    ...(tenantSlug ? { 'X-Tenant-Slug': tenantSlug } : {}),
    // Omit Content-Type for FormData so the browser sets multipart boundary
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(init?.headers as Record<string, string> | undefined),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiFetch<{ token: string; user: AuthUser }>('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    logout: () => apiFetch<void>('/auth/logout/', { method: 'POST' }),
    me: () => apiFetch<AuthUser>('/auth/me/'),
    setDefaultOrganization: (slug: string) =>
      apiFetch<AuthUser>('/auth/me/', {
        method: 'PATCH',
        body: JSON.stringify({ default_organization_slug: slug }),
      }),
  },

  cases: {
    list: () => apiFetch<PaginatedResponse<Case>>('/cases/'),
    get: (id: number) => apiFetch<Case>(`/cases/${id}/`),
    create: (data: { claimant_name: string; firm?: string }) =>
      apiFetch<Case>('/cases/', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Case>) =>
      apiFetch<Case>(`/cases/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: number) => apiFetch<void>(`/cases/${id}/`, { method: 'DELETE' }),
    exportPdfUrl: (id: number) => `${API_BASE}/cases/${id}/export_pdf/`,
    signOff: (id: number) =>
      apiFetch<Case>(`/cases/${id}/sign_off/`, { method: 'POST' }),
  },

  documents: {
    list: (caseId?: number) => {
      const qs = caseId ? `?case=${caseId}` : '';
      return apiFetch<PaginatedResponse<SourceDocument>>(`/documents/${qs}`);
    },
    get: (id: number) => apiFetch<SourceDocument>(`/documents/${id}/`),
    create: (caseId: number, file: File) => {
      const fd = new FormData();
      fd.append('case', String(caseId));
      fd.append('filename', file.name);
      fd.append('file', file);
      return apiFetch<SourceDocument>('/documents/', { method: 'POST', body: fd });
    },
    bulkUpload: (caseId: number, files: File[]) => {
      const fd = new FormData();
      fd.append('case', String(caseId));
      files.forEach((f) => fd.append('files', f));
      return apiFetch<{ created: SourceDocument[]; errors: { filename: string; detail: string }[] }>(
        '/documents/bulk_upload/',
        { method: 'POST', body: fd },
      );
    },
  },

  events: {
    list: (params?: { caseId?: number; flags?: string[] }) => {
      const qs = new URLSearchParams();
      if (params?.caseId) qs.set('case', String(params.caseId));
      params?.flags?.forEach((f) => qs.append('flag', f));
      const search = qs.toString();
      return apiFetch<PaginatedResponse<TimelineEvent>>(
        `/events/${search ? `?${search}` : ''}`,
      );
    },
    get: (id: number) => apiFetch<TimelineEvent>(`/events/${id}/`),
    update: (id: number, data: Partial<TimelineEvent>) =>
      apiFetch<TimelineEvent>(`/events/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  },

  // Global Admin only — the platform-wide tenant registry.
  organizations: {
    list: () => apiFetch<PaginatedResponse<Organization>>('/admin/organizations/'),
    create: (data: { name: string; slug: string }) =>
      apiFetch<Organization>('/admin/organizations/', { method: 'POST', body: JSON.stringify(data) }),
  },

  // Org Admin (own org) or a Global Admin who has entered a tenant.
  members: {
    list: () => apiFetch<PaginatedResponse<Member>>('/members/'),
    create: (data: { email: string; password?: string; role: string }) =>
      apiFetch<Member>('/members/', { method: 'POST', body: JSON.stringify(data) }),
    updateRole: (id: number, role: string) =>
      apiFetch<Member>(`/members/${id}/`, { method: 'PATCH', body: JSON.stringify({ role }) }),
    deactivate: (id: number) => apiFetch<Member>(`/members/${id}/deactivate/`, { method: 'POST' }),
    reactivate: (id: number) => apiFetch<Member>(`/members/${id}/reactivate/`, { method: 'POST' }),
  },
};
