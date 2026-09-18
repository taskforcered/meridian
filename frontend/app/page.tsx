'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function RootPage() {
  const { loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // /login itself redirects an already-authenticated user onward — it's
    // the one place that knows how to route by membership count (auto-enter
    // the only/default org, or show the company picker). Don't duplicate
    // that decision here.
    if (!loading) router.replace('/login');
  }, [loading, router]);

  return null;
}
