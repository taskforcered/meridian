import type { Case, SourceDocument, TimelineEvent } from './types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

export const api = {
  cases: {
    list: () =>
      apiFetch<PaginatedResponse<Case>>('/cases/'),
    get: (id: number) =>
      apiFetch<Case>(`/cases/${id}/`),
    create: (data: Omit<Case, 'id' | 'created_at' | 'updated_at'>) =>
      apiFetch<Case>('/cases/', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Case>) =>
      apiFetch<Case>(`/cases/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: number) =>
      apiFetch<void>(`/cases/${id}/`, { method: 'DELETE' }),
    exportPdfUrl: (id: number) => `${API_BASE}/cases/${id}/export_pdf/`,
  },

  documents: {
    list: (caseId?: number) => {
      const qs = caseId ? `?case=${caseId}` : '';
      return apiFetch<PaginatedResponse<SourceDocument>>(`/documents/${qs}`);
    },
    get: (id: number) =>
      apiFetch<SourceDocument>(`/documents/${id}/`),
    create: (data: Omit<SourceDocument, 'id' | 'uploaded_at'>) =>
      apiFetch<SourceDocument>('/documents/', { method: 'POST', body: JSON.stringify(data) }),
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
    get: (id: number) =>
      apiFetch<TimelineEvent>(`/events/${id}/`),
    create: (data: Omit<TimelineEvent, 'id'>) =>
      apiFetch<TimelineEvent>('/events/', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<TimelineEvent>) =>
      apiFetch<TimelineEvent>(`/events/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: number) =>
      apiFetch<void>(`/events/${id}/`, { method: 'DELETE' }),
  },
};
