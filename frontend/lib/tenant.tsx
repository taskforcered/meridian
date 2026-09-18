'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

const TENANT_KEY = 'meridian_tenant_slug';

// Read synchronously (no context needed) by lib/api.ts on every request —
// this is what actually becomes the X-Tenant-Slug header. Only ever takes
// effect server-side if the caller is a platform admin (see IsTenantMember);
// for anyone else it's inert since their profile's org won't match.
export function getStoredTenantSlug(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TENANT_KEY);
}

// Plain function (not a hook) so lib/auth.tsx can call it from logout()
// without needing to sit inside TenantProvider's tree. Without this, a
// second person signing in on the same browser inherits whatever tenant the
// previous session last had active — harmless for data access (every
// tenant-scoped request is still re-authorized against the new user's own
// memberships) but confusing: a platform admin would land on /login already
// looking "entered" into an org they never chose this session.
export function clearStoredTenantSlug() {
  try {
    localStorage.removeItem(TENANT_KEY);
  } catch {}
}

interface TenantContextValue {
  tenantSlug: string | null;
  enterTenant: (slug: string) => void;
  exitTenant: () => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);

  useEffect(() => {
    setTenantSlug(getStoredTenantSlug());
  }, []);

  const enterTenant = useCallback((slug: string) => {
    try {
      localStorage.setItem(TENANT_KEY, slug);
    } catch {}
    setTenantSlug(slug);
  }, []);

  const exitTenant = useCallback(() => {
    try {
      localStorage.removeItem(TENANT_KEY);
    } catch {}
    setTenantSlug(null);
  }, []);

  return (
    <TenantContext.Provider value={{ tenantSlug, enterTenant, exitTenant }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useTenant must be used inside TenantProvider');
  return ctx;
}
