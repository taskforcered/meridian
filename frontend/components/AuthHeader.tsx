'use client';

import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function AuthHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <div className="flex items-center gap-4 text-sm text-gray-600">
      <span>
        <span className="font-medium text-gray-900">{user.username}</span>
        <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">
          {user.role}
        </span>
      </span>
      <button
        onClick={handleLogout}
        className="text-gray-500 hover:text-gray-800 text-sm underline"
      >
        Logout
      </button>
    </div>
  );
}
