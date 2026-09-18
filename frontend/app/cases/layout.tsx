'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useTenant } from '@/lib/tenant';

export default function CasesLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { tenantSlug } = useTenant();
  const router = useRouter();

  // A platform admin with no entered tenant has nothing to view here — send
  // them to pick one. An ordinary user whose active org didn't resolve to a
  // real membership (stale/cleared selection) goes back through /login,
  // which already knows how to re-enter their default/only org.
  const noTenantContext = !!user && !user.organization && !(user.is_platform_admin && tenantSlug);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
    } else if (user.is_platform_admin && !tenantSlug) {
      router.replace('/admin/organizations');
    } else if (noTenantContext) {
      router.replace('/login');
    }
  }, [loading, user, tenantSlug, noTenantContext, router]);

  if (loading || !user || noTenantContext || (user.is_platform_admin && !tenantSlug)) return null;

  return <>{children}</>;
}
