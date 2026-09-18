'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { api } from '@/lib/api';
import type { Member, Role } from '@/lib/types';

const ROLE_OPTIONS: Role[] = ['paralegal', 'attorney', 'admin'];

export default function TeamPage() {
  const { user, loading: authLoading } = useAuth();
  const { tenantSlug } = useTenant();
  const router = useRouter();

  const canManage = !!user && (user.role === 'admin' || (user.is_platform_admin && !!tenantSlug));

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('paralegal');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !canManage) router.replace('/cases');
  }, [authLoading, canManage, router]);

  function refresh() {
    setLoading(true);
    api.members.list()
      .then((r) => setMembers(r.results))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (canManage) refresh();
  }, [canManage]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await api.members.create({ email, password: password || undefined, role });
      setEmail('');
      setPassword('');
      setRole('paralegal');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite member');
    } finally {
      setCreating(false);
    }
  }

  async function handleRoleChange(member: Member, newRole: Role) {
    await api.members.updateRole(member.id, newRole);
    refresh();
  }

  async function handleToggleActive(member: Member) {
    if (member.is_active) await api.members.deactivate(member.id);
    else await api.members.reactivate(member.id);
    refresh();
  }

  if (authLoading || !canManage) return null;

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-1 dark:text-gray-50">Team</h2>
      <p className="text-sm text-gray-500 mb-6 dark:text-gray-400">
        Paralegals, attorneys, and admins on {user?.is_platform_admin ? `this organization (entered as ${tenantSlug})` : 'your organization'}.
      </p>

      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3 mb-8 bg-white border border-gray-200 rounded-lg p-4 dark:bg-gray-900 dark:border-gray-800">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1 dark:text-gray-300">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:border-gray-700 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1 dark:text-gray-300">
            Temporary password <span className="font-normal text-gray-400 dark:text-gray-500">(blank if they already have a Meridian account)</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:border-gray-700 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1 dark:text-gray-300">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm capitalize focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-950 dark:border-gray-700 dark:text-gray-100"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-1.5 rounded hover:bg-blue-700 disabled:opacity-60 transition-colors dark:hover:bg-blue-500"
        >
          {creating ? 'Inviting…' : 'Add Member'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded mb-4 dark:bg-red-950/50 dark:border-red-900 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center dark:text-gray-500">Loading…</div>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wide dark:border-gray-800 dark:text-gray-400">
              <th className="py-3 pr-4">Email</th>
              <th className="py-3 pr-4">Role</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-3 pr-4 font-medium text-gray-900 dark:text-gray-100">
                  {m.email}
                  {m.is_default && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-blue-600 dark:text-blue-400">default</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <select
                    value={m.role}
                    onChange={(e) => handleRoleChange(m, e.target.value as Role)}
                    className="border border-gray-300 rounded px-2 py-1 text-xs capitalize dark:bg-gray-950 dark:border-gray-700 dark:text-gray-100"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="py-3 pr-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.is_active ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                    {m.is_active ? 'Active' : 'Deactivated'}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => handleToggleActive(m)}
                    className="text-xs font-medium text-gray-600 border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    {m.is_active ? 'Deactivate' : 'Reactivate'}
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
