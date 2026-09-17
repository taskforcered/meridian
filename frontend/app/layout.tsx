import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import AuthHeader from '@/components/AuthHeader';

export const metadata: Metadata = {
  title: 'Meridian',
  description: 'AI-assisted medical record timeline for personal-injury claims',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <AuthProvider>
          <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
              <div className="flex items-baseline gap-3">
                <a href="/cases" className="text-lg font-bold tracking-tight text-gray-900">Meridian</a>
                <span className="text-xs text-gray-400 font-medium uppercase tracking-widest">
                  Medical Record Review
                </span>
              </div>
              <AuthHeader />
            </div>
          </header>
          <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
