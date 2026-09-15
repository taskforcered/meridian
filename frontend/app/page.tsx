'use client';

import { useState } from 'react';
import Timeline from '@/components/Timeline';
import { SAMPLE_EVENTS } from '@/lib/sampleData';
import type { TimelineEvent } from '@/lib/types';

interface FilterOption {
  label: string;
  value: string;
}

const FILTERS: FilterOption[] = [
  { label: 'All events', value: 'all' },
  { label: 'Flagged for review', value: 'flagged' },
  { label: 'Causation-relevant', value: 'causation_relevant' },
  { label: 'Pre-existing condition', value: 'pre_existing_condition' },
  { label: 'Record conflict', value: 'record_conflict' },
  { label: 'Treatment gap', value: 'treatment_gap' },
];

function applyFilter(events: TimelineEvent[], filter: string): TimelineEvent[] {
  if (filter === 'all') return events;
  if (filter === 'flagged') return events.filter((e) => e.flags.length > 0);
  return events.filter((e) => e.flags.includes(filter as TimelineEvent['flags'][number]));
}

export default function HomePage() {
  const [activeFilter, setActiveFilter] = useState('all');

  const filtered = applyFilter(SAMPLE_EVENTS, activeFilter);

  return (
    <div>
      {/* Case header */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-0.5">
          Jane Doe — Lumbar Strain (MVA 2024-01-14)
        </h2>
        <p className="text-sm text-gray-500">
          {SAMPLE_EVENTS.length} total events &nbsp;·&nbsp; {filtered.length} shown
          &nbsp;·&nbsp;
          <span className="text-yellow-700 font-medium">Under Review</span>
        </p>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-8" role="toolbar" aria-label="Event filters">
        {FILTERS.map((opt) => {
          const isActive = activeFilter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setActiveFilter(opt.value)}
              aria-pressed={isActive}
              className={[
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400',
              ].join(' ')}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <Timeline events={filtered} />

      {/* Dev note */}
      <div className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-400">
        Displaying sample data. Wire <code>lib/api.ts</code> to the Django backend for live data.
      </div>
    </div>
  );
}
