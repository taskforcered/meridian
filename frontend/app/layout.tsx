import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { TenantProvider } from '@/lib/tenant';
import { ThemeProvider, THEME_INIT_SCRIPT } from '@/lib/theme';
import AuthHeader from '@/components/AuthHeader';

export const metadata: Metadata = {
  title: 'Meridian',
  description: 'AI-assisted medical record timeline for personal-injury claims',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100 min-h-screen">
        <ThemeProvider>
          <AuthProvider>
            <TenantProvider>
              <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm dark:bg-gray-900 dark:border-gray-800">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                  <div className="flex items-baseline gap-3">
                    <a href="/cases" className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-50">Meridian</a>
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-widest dark:text-gray-500">
                      Medical Record Review
                    </span>
                  </div>
                  <AuthHeader />
                </div>
              </header>
              <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
            </TenantProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
