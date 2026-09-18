'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { clearStoredTenantSlug, getStoredTenantSlug } from './tenant';
import type { AuthUser } from './types';

const TOKEN_KEY = 'meridian_token';

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function storeToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  // Returns the authenticated user (with `memberships`) so the caller can
  // decide where to route them — that decision isn't made here since it
  // depends on how many orgs they belong to. See app/login/page.tsx.
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredToken();
    if (!stored) {
      setLoading(false);
      return;
    }
    const tenantSlug = getStoredTenantSlug();
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8095/api'}/auth/me/`, {
      headers: {
        Authorization: `Token ${stored}`,
        ...(tenantSlug ? { 'X-Tenant-Slug': tenantSlug } : {}),
      },
    })
      .then((r) => {
        // Only a real auth rejection means the token is actually invalid.
        // A network error, CORS failure, or 5xx is transient — clearing the
        // token for those would silently log someone out for no reason.
        if (r.ok) return r.json();
        if (r.status === 401) clearToken();
        return Promise.reject();
      })
      .then((u: AuthUser) => {
        setToken(stored);
        setUser(u);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8095/api'}/auth/login/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail ?? 'Login failed');
    }
    const data: { token: string; user: AuthUser } = await res.json();
    storeToken(data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const stored = getStoredToken();
    if (stored) {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8095/api'}/auth/logout/`,
        { method: 'POST', headers: { Authorization: `Token ${stored}` } },
      ).catch(() => {});
    }
    clearToken();
    clearStoredTenantSlug();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
