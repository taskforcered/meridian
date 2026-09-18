'use client';

import { useState } from 'react';
import type { FlagType, TimelineEvent } from '@/lib/types';

const FLAG_META: Record<FlagType, { label: string; color: string }> = {
  causation_relevant: {
    label: 'Causation',
    color: 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  },
  pre_existing_condition: {
    label: 'Pre-existing',
    color: 'bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800',
  },
  record_conflict: {
    label: 'Conflict',
    color: 'bg-red-100 text-red-800 border border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  },
  treatment_gap: {
    label: 'Gap',
    color: 'bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
  },
};

function FlagBadge({ flag }: { flag: FlagType }) {
  const meta = FLAG_META[flag] ?? { label: flag, color: 'bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700' };
  return (
    <span className={`inline-block text-xs rounded px-2 py-0.5 font-medium ${meta.color}`}>
      {meta.label}
    </span>
  );
}

interface EventCardProps {
  event: TimelineEvent;
  onUpdate: (id: number, patch: Partial<TimelineEvent>) => void;
}

function EventCard({ event, onUpdate }: EventCardProps) {
  const [note, setNote] = useState(event.reviewer_note);
  const [saving, setSaving] = useState(false);

  async function handleVerifyToggle() {
    setSaving(true);
    try {
      await onUpdate(event.id, { verified: !event.verified });
    } finally {
      setSaving(false);
    }
  }

  async function handleNoteSave() {
    if (note === event.reviewer_note) return;
    setSaving(true);
    try {
      await onUpdate(event.id, { reviewer_note: note });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex gap-4 group">
      {/* Timeline spine */}
      <div className="flex flex-col items-center flex-shrink-0 w-4">
        <div className={`w-3 h-3 rounded-full mt-1 ring-2 ring-white ring-offset-1 dark:ring-gray-950 ${event.verified ? 'bg-green-500' : 'bg-red-600'}`} />
        <div className="w-px flex-1 bg-gray-200 mt-1 group-last:hidden dark:bg-gray-800" />
      </div>

      {/* Event content */}
      <div className="pb-8 flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 mb-1">
          <time className="text-xs font-mono font-semibold text-red-700 tabular-nums dark:text-red-400">
            {event.event_date}
          </time>
          {event.provider_name && (
            <span className="text-sm text-gray-500 italic truncate dark:text-gray-400">{event.provider_name}</span>
          )}
          {event.verified && (
            <span className="text-xs text-green-700 font-medium bg-green-50 px-2 py-0.5 rounded-full dark:text-green-300 dark:bg-green-950">
              Verified
            </span>
          )}
        </div>

        <p className="text-sm text-gray-800 leading-relaxed mb-2 dark:text-gray-200">{event.description}</p>

        {event.citation_text && (
          <blockquote className="border-l-2 border-gray-300 pl-3 mb-2 dark:border-gray-700">
            <p className="text-xs text-gray-500 italic leading-relaxed dark:text-gray-400">{event.citation_text}</p>
            {event.source_page != null && (
              <cite className="text-xs text-gray-400 not-italic dark:text-gray-500">p.&nbsp;{event.source_page}</cite>
            )}
          </blockquote>
        )}

        {event.flags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {event.flags.map((f) => (
              <FlagBadge key={f} flag={f} />
            ))}
          </div>
        )}

        {event.source_documents_detail.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 mb-3 text-xs text-gray-500 dark:text-gray-400">
            <span>{event.source_documents_detail.length > 1 ? 'Sources:' : 'Source:'}</span>
            {event.source_documents_detail.map((doc, i) => (
              <span key={doc.id}>
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
                {i < event.source_documents_detail.length - 1 && ','}
              </span>
            ))}
          </div>
        )}

        {/* Review controls */}
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={event.verified}
              onChange={handleVerifyToggle}
              disabled={saving}
              className="w-4 h-4 accent-green-600"
            />
            <span className="text-xs text-gray-600 font-medium dark:text-gray-400">Mark verified</span>
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={handleNoteSave}
              placeholder="Reviewer note…"
              className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200 dark:placeholder-gray-500"
            />
            {note !== event.reviewer_note && (
              <button
                onClick={handleNoteSave}
                disabled={saving}
                className="text-xs text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400"
              >
                Save
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TimelineProps {
  events: TimelineEvent[];
  onUpdate: (id: number, patch: Partial<TimelineEvent>) => void;
}

export default function Timeline({ events, onUpdate }: TimelineProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-16 text-sm text-gray-400 dark:text-gray-500">
        No events match the selected filter.
      </div>
    );
  }

  return (
    <div className="relative">
      {events.map((event) => (
        <EventCard key={event.id} event={event} onUpdate={onUpdate} />
      ))}
    </div>
  );
}
