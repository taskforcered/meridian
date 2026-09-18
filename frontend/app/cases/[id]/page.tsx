'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Timeline from '@/components/Timeline';
import UploadDropzone from '@/components/UploadDropzone';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Case, CaseStatus, FlagType, SourceDocument, TimelineEvent } from '@/lib/types';

const STATUS_LABEL: Record<CaseStatus, string> = {
  intake: 'Intake',
  processing: 'Processing',
  review: 'Under Review',
  complete: 'Complete',
};

const STATUS_COLOR: Record<CaseStatus, string> = {
  intake: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  processing: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  review: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  complete: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
};

const EXTRACTION_COLOR: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  processing: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300',
  complete: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  failed: 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300',
};

const EVENT_FILTERS: { label: string; value: string }[] = [
  { label: 'All events', value: 'all' },
  { label: 'Flagged', value: 'flagged' },
  { label: 'Causation', value: 'causation_relevant' },
  { label: 'Pre-existing', value: 'pre_existing_condition' },
  { label: 'Conflict', value: 'record_conflict' },
  { label: 'Gap', value: 'treatment_gap' },
  { label: 'Unverified', value: 'unverified' },
];

function filterEvents(events: TimelineEvent[], filter: string): TimelineEvent[] {
  if (filter === 'all') return events;
  if (filter === 'flagged') return events.filter((e) => e.flags.length > 0);
  if (filter === 'unverified') return events.filter((e) => !e.verified);
  return events.filter((e) => e.flags.includes(filter as FlagType));
}

const POLL_INTERVAL = 3000;

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const caseId = Number(id);
  const router = useRouter();
  const { user } = useAuth();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [documents, setDocuments] = useState<SourceDocument[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signOffError, setSignOffError] = useState('');
  const [signingOff, setSigningOff] = useState(false);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEvents = useCallback(async () => {
    const r = await api.events.list({ caseId });
    setEvents(r.results);
  }, [caseId]);

  const fetchDocuments = useCallback(async () => {
    const r = await api.documents.list(caseId);
    setDocuments(r.results);
  }, [caseId]);

  useEffect(() => {
    Promise.all([
      api.cases.get(caseId),
      api.documents.list(caseId),
      api.events.list({ caseId }),
    ])
      .then(([c, docs, evts]) => {
        setCaseData(c);
        setDocuments(docs.results);
        setEvents(evts.results);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [caseId]);

  // Poll documents and events while any document is still in pending/processing state
  useEffect(() => {
    function shouldPoll() {
      return documents.some((d) => d.extraction_status === 'pending' || d.extraction_status === 'processing');
    }

    if (shouldPoll()) {
      pollingRef.current = setInterval(async () => {
        await fetchDocuments();
        await fetchEvents();
      }, POLL_INTERVAL);
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [documents, fetchDocuments, fetchEvents]);

  async function handleUpdate(eventId: number, patch: Partial<TimelineEvent>) {
    const updated = await api.events.update(eventId, patch);
    setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, ...updated } : e)));
  }

  async function handleSignOff() {
    setSignOffError('');
    setSigningOff(true);
    try {
      const updated = await api.cases.signOff(caseId);
      setCaseData(updated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-off failed';
      // Extract the detail message from API error string "API 400: {...}"
      const match = msg.match(/API \d+: (.*)/);
      if (match) {
        try {
          const body = JSON.parse(match[1]);
          setSignOffError(body.detail ?? msg);
        } catch {
          setSignOffError(msg);
        }
      } else {
        setSignOffError(msg);
      }
    } finally {
      setSigningOff(false);
    }
  }

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center dark:text-gray-500">Loading…</div>;
  if (error) return <div className="text-red-600 text-sm py-8 dark:text-red-400">{error}</div>;
  if (!caseData) return null;

  const canSignOff = user?.role === 'attorney' || user?.role === 'admin';
  const allVerified = events.length > 0 && events.every((e) => e.verified);
  const isComplete = caseData.status === 'complete';
  const filteredEvents = filterEvents(events, filter);
  const verifiedCount = events.filter((e) => e.verified).length;

  return (
    <div>
      {/* Case header */}
      <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-50">{caseData.claimant_name}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[caseData.status]}`}>
                {STATUS_LABEL[caseData.status]}
              </span>
            </div>
            {caseData.firm && <p className="text-sm text-gray-500 dark:text-gray-400">{caseData.firm}</p>}
            <p className="text-sm text-gray-400 mt-1 dark:text-gray-500">
              {events.length} events &nbsp;·&nbsp; {verifiedCount}/{events.length} verified
              {isComplete && caseData.reviewed_by && (
                <> &nbsp;·&nbsp; Signed off by {caseData.reviewed_by}</>
              )}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              {canSignOff && !isComplete && (
                <button
                  onClick={handleSignOff}
                  disabled={!allVerified || signingOff}
                  title={!allVerified ? 'All events must be verified before sign-off' : undefined}
                  className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors dark:hover:bg-green-500"
                >
                  {signingOff ? 'Signing off…' : 'Sign Off Case'}
                </button>
              )}
              <a
                href={api.cases.exportPdfUrl(caseId)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded hover:bg-gray-50 transition-colors dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Export PDF
              </a>
            </div>
            {signOffError && (
              <p className="text-xs text-red-600 max-w-xs text-right dark:text-red-400">{signOffError}</p>
            )}
            {!canSignOff && !isComplete && (
              <p className="text-xs text-gray-400 dark:text-gray-500">Sign-off requires attorney or admin role</p>
            )}
          </div>
        </div>
      </div>

      {/* Documents panel */}
      <section className="mb-8">
        <h3 className="text-base font-semibold text-gray-800 mb-3 dark:text-gray-200">Documents</h3>
        {documents.length > 0 && (
          <ul className="space-y-2 mb-4">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between bg-white border border-gray-200 rounded px-4 py-2 text-sm dark:bg-gray-900 dark:border-gray-800">
                <span className="text-gray-800 truncate flex-1 mr-4 dark:text-gray-200">
                  {doc.file ? (
                    <a
                      href={doc.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {doc.filename}
                    </a>
                  ) : (
                    doc.filename
                  )}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${EXTRACTION_COLOR[doc.extraction_status]}`}>
                  {doc.extraction_status}
                </span>
              </li>
            ))}
          </ul>
        )}
        {!isComplete && (
          <UploadDropzone
            caseId={caseId}
            onUploaded={(doc) => setDocuments((prev) => [doc, ...prev])}
          />
        )}
      </section>

      {/* Timeline panel */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">Timeline</h3>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-6" role="toolbar" aria-label="Event filters">
          {EVENT_FILTERS.map((opt) => {
            const isActive = filter === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                aria-pressed={isActive}
                className={[
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800',
                ].join(' ')}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <Timeline events={filteredEvents} onUpdate={handleUpdate} />
      </section>
    </div>
  );
}
