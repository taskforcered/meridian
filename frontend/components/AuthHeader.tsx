'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';
import { useTheme } from '@/lib/theme';
import { api } from '@/lib/api';
import type { Organization } from '@/lib/types';

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className="p-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100 transition-colors"
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

// Lets the current org be switched without logging out. For a platform admin
// this lists every tenant on the platform ("entering" one is God Mode); for
// an ordinary user who belongs to more than one org it only lists their own
// memberships. Hidden entirely for someone with just one org — nothing to
// switch between. Switching does a full reload so every fetch on the page
// picks up the new X-Tenant-Slug header from a clean slate.
function OrgSwitcher() {
  const { user } = useAuth();
  const { tenantSlug, enterTenant } = useTenant();
  const [platformOrgs, setPlatformOrgs] = useState<Organization[]>([]);
  const isPlatformAdmin = !!user?.is_platform_admin;

  useEffect(() => {
    if (isPlatformAdmin) {
      api.organizations.list().then((r) => setPlatformOrgs(r.results)).catch(() => {});
    }
  }, [isPlatformAdmin]);

  const options = isPlatformAdmin
    ? platformOrgs.map((o) => ({ slug: o.slug, name: o.name }))
    : (user?.memberships ?? []).map((m) => ({ slug: m.organization.slug, name: m.organization.name }));

  if (!isPlatformAdmin && options.length <= 1) return null;

  return (
    <select
      value={tenantSlug ?? ''}
      onChange={(e) => {
        if (e.target.value) enterTenant(e.target.value);
        window.location.href = '/cases';
      }}
      className={
        isPlatformAdmin
          ? 'text-xs border border-amber-300 bg-amber-50 text-amber-900 rounded px-2 py-1 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300'
          : 'text-xs border border-gray-300 bg-white text-gray-700 rounded px-2 py-1 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
      }
    >
      {isPlatformAdmin && <option value="">— Enter a tenant —</option>}
      {options.map((o) => (
        <option key={o.slug} value={o.slug}>{o.name}</option>
      ))}
    </select>
  );
}

export default function AuthHeader() {
  const { user, logout } = useAuth();
  const { tenantSlug } = useTenant();

  async function handleLogout() {
    await logout();
    window.location.href = '/login';
  }

  if (!user) {
    return <ThemeToggle />;
  }

  const isPlatformAdmin = user.is_platform_admin;
  const canManageTeam = user.role === 'admin' || (isPlatformAdmin && !!tenantSlug);

  return (
    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
      {isPlatformAdmin && (
        <span className="text-xs font-bold uppercase tracking-wide text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full dark:text-amber-300 dark:bg-amber-950 dark:border-amber-800">
          God Mode
        </span>
      )}
      <OrgSwitcher />
      {isPlatformAdmin && (
        <Link href="/admin/organizations" className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100">
          Admin
        </Link>
      )}
      {canManageTeam && (
        <Link href="/team" className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100">
          Team
        </Link>
      )}
      <span>
        <span className="font-medium text-gray-900 dark:text-gray-100">{user.email}</span>
        <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize dark:bg-gray-800 dark:text-gray-400">
          {isPlatformAdmin ? 'platform admin' : (user.role ?? '—')}
        </span>
      </span>
      <button
        onClick={handleLogout}
        className="text-gray-500 hover:text-gray-800 text-sm underline dark:text-gray-400 dark:hover:text-gray-100"
      >
        Logout
      </button>
      <ThemeToggle />
    </div>
  );
}
