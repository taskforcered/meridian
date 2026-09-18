'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/LoginForm';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { api } from '@/lib/api';
import type { AuthUser, Membership } from '@/lib/types';

export default function LoginPage() {
  const { user, loading, logout } = useAuth();
  const { enterTenant } = useTenant();
  const router = useRouter();

  // Only set when someone belongs to more than one org and hasn't picked a
  // default yet — everyone else is routed straight through, no extra step.
  const [pendingChoice, setPendingChoice] = useState<AuthUser | null>(null);
  const [remember, setRemember] = useState(true);

  function routeAfterAuth(u: AuthUser) {
    if (u.is_platform_admin) {
      router.replace('/admin/organizations');
      return;
    }
    if (u.memberships.length === 0) {
      setPendingChoice(u); // renders the "no access" state below
      return;
    }
    const chosen = u.memberships.find((m) => m.is_default) ?? (u.memberships.length === 1 ? u.memberships[0] : null);
    if (chosen) {
      enterTenant(chosen.organization.slug);
      // Full reload, not router.replace: the in-memory `user` from the login
      // response has organization/role null (no tenant was resolved at login
      // time) — a client-side nav would carry that stale state into /cases's
      // guard. Reloading forces a fresh /auth/me/ with the new tenant header.
      window.location.href = '/cases';
      return;
    }
    setPendingChoice(u);
  }

  useEffect(() => {
    if (!loading && user) routeAfterAuth(user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  async function handlePick(membership: Membership) {
    enterTenant(membership.organization.slug);
    if (remember) {
      await api.auth.setDefaultOrganization(membership.organization.slug).catch(() => {});
    }
    window.location.href = '/cases';
  }

  if (loading) return null;

  if (pendingChoice && pendingChoice.memberships.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-full max-w-sm bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center dark:bg-gray-900 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 mb-2 dark:text-gray-50">No organization yet</h2>
          <p className="text-sm text-gray-500 mb-6 dark:text-gray-400">
            Your account isn&apos;t linked to an organization. Ask your firm&apos;s admin to invite you.
          </p>
          <button
            onClick={() => { logout(); setPendingChoice(null); }}
            className="text-sm text-gray-600 underline dark:text-gray-300"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (pendingChoice) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-full max-w-sm bg-white border border-gray-200 rounded-lg shadow-sm p-8 dark:bg-gray-900 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 mb-1 dark:text-gray-50">Which company?</h2>
          <p className="text-sm text-gray-500 mb-5 dark:text-gray-400">You belong to more than one organization on Meridian.</p>
          <div className="space-y-2 mb-4">
            {pendingChoice.memberships.map((m) => (
              <button
                key={m.organization.id}
                onClick={() => handlePick(m)}
                className="w-full text-left border border-gray-200 rounded px-4 py-2.5 hover:bg-gray-50 hover:border-blue-300 transition-colors dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <span className="font-medium text-gray-900 dark:text-gray-100">{m.organization.name}</span>
                <span className="ml-2 text-xs text-gray-400 capitalize dark:text-gray-500">{m.role}</span>
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer dark:text-gray-400">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-3.5 h-3.5 accent-blue-600"
            />
            Remember my choice for next time
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-lg shadow-sm p-8 dark:bg-gray-900 dark:border-gray-800">
        <h2 className="text-xl font-semibold text-gray-900 mb-6 dark:text-gray-50">Sign in to Meridian</h2>
        <LoginForm onSuccess={routeAfterAuth} />
      </div>
    </div>
  );
}
