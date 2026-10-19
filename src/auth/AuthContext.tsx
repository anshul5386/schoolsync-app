import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { TOKEN_KEY, USER_KEY, setUnauthorizedHandler } from "../api/client";
import { loginWithPassword } from "../api/auth";

export type User = { userId: string; schoolId: string; role: string; name: string };

type AuthState = {
  user: User | null;
  /** True until the stored session has been read, so the UI never flashes the login screen. */
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const clear = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [token, stored] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        if (token && stored) setUser(JSON.parse(stored));
      } catch {
        await clear();
      } finally {
        setLoading(false);
      }
    })();
    setUnauthorizedHandler(() => { clear(); });
    return () => setUnauthorizedHandler(null);
  }, [clear]);

  const login = useCallback(async (phone: string, password: string) => {
    const res = await loginWithPassword(phone, password);
    // The web reads the auth payload from res.data.data; fall back to res.data for safety.
    const auth = res.data?.data ?? res.data;
    if (!auth?.token) throw new Error("Login failed: no token received.");
    const u: User = { userId: auth.userId, schoolId: auth.schoolId, role: auth.role, name: auth.name };
    await SecureStore.setItemAsync(TOKEN_KEY, auth.token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout: clear }), [user, loading, login, clear]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
