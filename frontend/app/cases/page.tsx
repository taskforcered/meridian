'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CaseList from '@/components/CaseList';
import { api } from '@/lib/api';
import type { Case, CaseStatus } from '@/lib/types';

const STATUS_FILTERS: { label: string; value: CaseStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Intake', value: 'intake' },
  { label: 'Processing', value: 'processing' },
  { label: 'Under Review', value: 'review' },
  { label: 'Complete', value: 'complete' },
];

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [filter, setFilter] = useState<CaseStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.cases
      .list()
      .then((r) => setCases(r.results))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? cases : cases.filter((c) => c.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Cases</h2>
        <Link
          href="/cases/new"
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          New Case
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-6" role="toolbar" aria-label="Status filters">
        {STATUS_FILTERS.map((opt) => {
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
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
              ].join(' ')}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>
      ) : (
        <CaseList cases={filtered} />
      )}
    </div>
  );
}
