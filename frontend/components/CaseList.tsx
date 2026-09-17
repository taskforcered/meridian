'use client';

import Link from 'next/link';
import type { Case, CaseStatus } from '@/lib/types';

const STATUS_LABEL: Record<CaseStatus, string> = {
  intake: 'Intake',
  processing: 'Processing',
  review: 'Under Review',
  complete: 'Complete',
};

const STATUS_COLOR: Record<CaseStatus, string> = {
  intake: 'bg-gray-100 text-gray-700',
  processing: 'bg-blue-100 text-blue-700',
  review: 'bg-yellow-100 text-yellow-700',
  complete: 'bg-green-100 text-green-700',
};

function reviewProgress(c: Case): string {
  const total = c.event_count ?? 0;
  const verified = c.verified_event_count ?? 0;
  if (total === 0) return '—';
  return `${verified}/${total} verified`;
}

interface Props {
  cases: Case[];
}

export default function CaseList({ cases }: Props) {
  if (cases.length === 0) {
    return (
      <div className="text-center py-16 text-sm text-gray-400">
        No cases yet. Create one to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
            <th className="py-3 pr-4">Claimant</th>
            <th className="py-3 pr-4">Firm</th>
            <th className="py-3 pr-4">Status</th>
            <th className="py-3 pr-4">Docs</th>
            <th className="py-3 pr-4">Review</th>
            <th className="py-3">Created</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="py-3 pr-4">
                <Link href={`/cases/${c.id}`} className="font-medium text-blue-600 hover:underline">
                  {c.claimant_name}
                </Link>
              </td>
              <td className="py-3 pr-4 text-gray-600">{c.firm || '—'}</td>
              <td className="py-3 pr-4">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[c.status]}`}>
                  {STATUS_LABEL[c.status]}
                </span>
              </td>
              <td className="py-3 pr-4 text-gray-600">{c.document_count ?? 0}</td>
              <td className="py-3 pr-4 text-gray-600">{reviewProgress(c)}</td>
              <td className="py-3 text-gray-500 whitespace-nowrap">
                {new Date(c.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
