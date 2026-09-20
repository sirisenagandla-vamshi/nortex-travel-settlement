import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, clearToken, getToken, setToken } from './api';
import type { User } from './types';

type AuthState = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem('nortex_user');
    if (getToken() && raw) {
      try {
        setUser(JSON.parse(raw) as User);
      } catch {
        clearToken();
      }
    }
    setReady(true);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      ready,
      login: async (email, password) => {
        const res = await api<{ token: string; user: User }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setToken(res.token);
        localStorage.setItem('nortex_user', JSON.stringify(res.user));
        setUser(res.user);
      },
      signup: async (email, password) => {
        const res = await api<{ token: string; user: User }>('/api/auth/signup', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setToken(res.token);
        localStorage.setItem('nortex_user', JSON.stringify(res.user));
        setUser(res.user);
      },
      logout: () => {
        clearToken();
        localStorage.removeItem('nortex_user');
        setUser(null);
      },
    }),
    [user, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside provider');
  return ctx;
}
