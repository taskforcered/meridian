'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/LoginForm';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/cases');
  }, [loading, user, router]);

  if (loading) return null;

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-lg shadow-sm p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Sign in to Meridian</h2>
        <LoginForm onSuccess={() => router.replace('/cases')} />
      </div>
    </div>
  );
}
