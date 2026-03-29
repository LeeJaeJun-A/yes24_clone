import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface User {
  id: number;
  email: string;
  username: string;
  phone?: string;
  point_balance: number;
  grade: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  cartCount: number;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshCartCount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  cartCount: 0,
  login: async () => ({ ok: false }),
  logout: async () => {},
  refreshUser: async () => {},
  refreshCartCount: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setUser(data);
          return;
        }
      }
    } catch {}
    setUser(null);
  }, []);

  const refreshCartCount = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/cart/count');
      if (res.ok) {
        const data = await res.json();
        setCartCount(data.count || 0);
        return;
      }
    } catch {}
    setCartCount(0);
  }, []);

  useEffect(() => {
    Promise.all([refreshUser(), refreshCartCount()]).finally(() => setLoading(false));
  }, [refreshUser, refreshCartCount]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        await refreshCartCount();
        return { ok: true };
      }
      const err = await res.json();
      return { ok: false, error: err.detail || '로그인에 실패했습니다.' };
    } catch {
      return { ok: false, error: '서버 오류가 발생했습니다.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } catch {}
    setUser(null);
    setCartCount(0);
  };

  return (
    <AuthContext.Provider value={{ user, loading, cartCount, login, logout, refreshUser, refreshCartCount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
