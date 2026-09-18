'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function NewCasePage() {
  const router = useRouter();
  const [claimantName, setClaimantName] = useState('');
  const [firm, setFirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const c = await api.cases.create({ claimant_name: claimantName, firm });
      router.push(`/cases/${c.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create case');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-semibold text-gray-900 mb-6 dark:text-gray-50">New Case</h2>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-gray-200 rounded-lg p-6 shadow-sm dark:bg-gray-900 dark:border-gray-800">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded dark:bg-red-950/50 dark:border-red-900 dark:text-red-300">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
            Claimant Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={claimantName}
            onChange={(e) => setClaimantName(e.target.value)}
            required
            autoFocus
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:border-gray-700 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">Firm</label>
          <input
            type="text"
            value={firm}
            onChange={(e) => setFirm(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:border-gray-700 dark:text-gray-100"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white text-sm font-medium px-5 py-2 rounded hover:bg-blue-700 disabled:opacity-60 transition-colors dark:hover:bg-blue-500"
          >
            {loading ? 'Creating…' : 'Create Case'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/cases')}
            className="text-sm text-gray-600 px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 transition-colors dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
