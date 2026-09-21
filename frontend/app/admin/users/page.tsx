'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import type { AdminUser } from '@/lib/types';

export default function AdminUsersPage() {
  const { user: viewer } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  function refresh(query?: string) {
    setLoading(true);
    api.adminUsers.list(query)
      .then((r) => setUsers(r.results))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (viewer?.is_platform_admin) refresh();
  }, [viewer]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    refresh(q || undefined);
  }

  async function handlePlatformAdminToggle(u: AdminUser) {
    setError('');
    try {
      if (u.is_platform_admin) await api.adminUsers.demote(u.id);
      else await api.adminUsers.promote(u.id);
      refresh(q || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update platform-admin status');
    }
  }

  async function handleActiveToggle(u: AdminUser) {
    setError('');
    try {
      if (u.is_active) await api.adminUsers.deactivate(u.id);
      else await api.adminUsers.reactivate(u.id);
      refresh(q || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update account status');
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1 dark:text-gray-50">Users</h2>
      <p className="text-sm text-gray-500 mb-6 dark:text-gray-400">
        Every person on the platform, across every organization. Per-org role changes stay on that org's Team page — enter the tenant first.
      </p>

      <form onSubmit={handleSearch} className="flex items-end gap-3 mb-6">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1 dark:text-gray-300">Search by email</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="name@example.com"
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:border-gray-700 dark:text-gray-100"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white text-sm font-medium px-4 py-1.5 rounded hover:bg-blue-700 transition-colors dark:hover:bg-blue-500"
        >
          Search
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded mb-4 dark:bg-red-950/50 dark:border-red-900 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center dark:text-gray-500">Loading…</div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400 dark:text-gray-500">No users found.</div>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wide dark:border-gray-800 dark:text-gray-400">
              <th className="py-3 pr-4">Email</th>
              <th className="py-3 pr-4">Account</th>
              <th className="py-3 pr-4">Memberships</th>
              <th className="py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = viewer?.id === u.id;
              return (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors dark:border-gray-800 dark:hover:bg-gray-900">
                  <td className="py-3 pr-4 font-medium text-gray-900 dark:text-gray-100">
                    {u.email}
                    {u.is_platform_admin && (
                      <span className="ml-2 text-xs font-bold uppercase tracking-wide text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full dark:text-amber-300 dark:bg-amber-950 dark:border-amber-800">
                        Platform Admin
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {u.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                    {u.memberships.length === 0
                      ? '—'
                      : u.memberships.map((m) => (
                        <div key={m.id} className="whitespace-nowrap">
                          {m.organization.name} <span className="capitalize">({m.role}{!m.is_active ? ', inactive' : ''})</span>
                        </div>
                      ))}
                  </td>
                  <td className="py-3 text-right whitespace-nowrap">
                    {!isSelf && (
                      <>
                        <button
                          onClick={() => handlePlatformAdminToggle(u)}
                          className="text-xs font-medium text-amber-700 border border-amber-300 rounded px-3 py-1 hover:bg-amber-50 mr-2 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-950"
                        >
                          {u.is_platform_admin ? 'Revoke Admin' : 'Grant Admin'}
                        </button>
                        <button
                          onClick={() => handleActiveToggle(u)}
                          className="text-xs font-medium text-gray-600 border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800"
                        >
                          {u.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
