'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { api } from '@/lib/api';
import type { Organization } from '@/lib/types';

export default function OrganizationsPage() {
  const { user } = useAuth();
  const { enterTenant } = useTenant();

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  function refresh() {
    setLoading(true);
    api.organizations.list()
      .then((r) => setOrgs(r.results))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (user?.is_platform_admin) refresh();
  }, [user]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await api.organizations.create({ name, slug });
      setName('');
      setSlug('');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(org: Organization) {
    setEditingId(org.id);
    setEditName(org.name);
  }

  async function handleSaveName(id: number) {
    setError('');
    try {
      await api.organizations.update(id, { name: editName });
      setEditingId(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update organization');
    }
  }

  async function handleToggleActive(org: Organization) {
    setError('');
    try {
      await api.organizations.update(org.id, { is_active: !org.is_active });
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update organization');
    }
  }

  function handleEnter(orgSlug: string) {
    enterTenant(orgSlug);
    window.location.href = '/cases';
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1 dark:text-gray-50">Organizations</h2>
      <p className="text-sm text-gray-500 mb-6 dark:text-gray-400">
        Every tenant on Meridian. As a platform admin you can enter any of them to view and manage their cases and team.
      </p>

      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 mb-8 bg-white border border-gray-200 rounded-lg p-4 dark:bg-gray-900 dark:border-gray-800">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1 dark:text-gray-300">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Acme Injury Law"
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:border-gray-700 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1 dark:text-gray-300">Slug (subdomain)</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            pattern="[a-z0-9-]+"
            placeholder="acme"
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:border-gray-700 dark:text-gray-100"
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-1.5 rounded hover:bg-blue-700 disabled:opacity-60 transition-colors dark:hover:bg-blue-500"
        >
          {creating ? 'Creating…' : 'New Organization'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded mb-4 dark:bg-red-950/50 dark:border-red-900 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center dark:text-gray-500">Loading…</div>
      ) : orgs.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400 dark:text-gray-500">No organizations yet.</div>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wide dark:border-gray-800 dark:text-gray-400">
              <th className="py-3 pr-4">Name</th>
              <th className="py-3 pr-4">Slug</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3">Created</th>
              <th className="py-3" />
            </tr>
          </thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors dark:border-gray-800 dark:hover:bg-gray-900">
                <td className="py-3 pr-4 font-medium text-gray-900 dark:text-gray-100">
                  {editingId === o.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                        className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:border-gray-700 dark:text-gray-100"
                      />
                      <button
                        onClick={() => handleSaveName(o.id)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(o)} className="hover:underline text-left">
                      {o.name}
                    </button>
                  )}
                </td>
                <td className="py-3 pr-4 text-gray-500 font-mono text-xs dark:text-gray-400">{o.slug}</td>
                <td className="py-3 pr-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${o.is_active ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                    {o.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="py-3 text-gray-500 whitespace-nowrap dark:text-gray-500">
                  {new Date(o.created_at).toLocaleDateString()}
                </td>
                <td className="py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => handleToggleActive(o)}
                    className="text-xs font-medium text-gray-600 border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 mr-2 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    {o.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                  <button
                    onClick={() => handleEnter(o.slug)}
                    className="text-xs font-medium text-amber-700 border border-amber-300 rounded px-3 py-1 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-950"
                  >
                    Enter
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
