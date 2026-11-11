import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { TOKEN_KEY, USER_KEY, setUnauthorizedHandler } from "../api/client";
import type { AuthPayload } from "../api/loginAuth";
import { getProfile } from "../api/profile";

export type User = {
  userId: string;
  schoolId: string;
  role: string;
  name: string;
  schoolName?: string;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  applySession: (auth: AuthPayload) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function userFromAuth(auth: AuthPayload): User {
  return {
    userId: auth.userId,
    schoolId: auth.schoolId,
    role: auth.role,
    name: auth.name,
    schoolName: auth.schoolName,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const clear = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    setUser(null);
  }, []);

  const hydrateSchoolName = useCallback(async (u: User): Promise<User> => {
    if (!u.schoolId || u.schoolName || u.role === "SUPER_ADMIN") return u;
    try {
      const res = await getProfile();
      const schoolName = res.data?.data?.schoolName;
      if (!schoolName) return u;
      return { ...u, schoolName };
    } catch {
      return u;
    }
  }, []);

  const persistUser = useCallback(async (auth: AuthPayload) => {
    let u = userFromAuth(auth);
    u = await hydrateSchoolName(u);
    await SecureStore.setItemAsync(TOKEN_KEY, auth.token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(u));
    setUser(u);
  }, [hydrateSchoolName]);

  useEffect(() => {
    (async () => {
      try {
        const [token, stored] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        if (token && stored) {
          const parsed: User = JSON.parse(stored);
          const hydrated = await hydrateSchoolName(parsed);
          if (hydrated.schoolName !== parsed.schoolName) {
            await SecureStore.setItemAsync(USER_KEY, JSON.stringify(hydrated));
          }
          setUser(hydrated);
        }
      } catch {
        await clear();
      } finally {
        setLoading(false);
      }
    })();
    setUnauthorizedHandler(() => { clear(); });
    return () => setUnauthorizedHandler(null);
  }, [clear, hydrateSchoolName]);

  const applySession = useCallback(async (auth: AuthPayload) => {
    await persistUser(auth);
  }, [persistUser]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const hydrated = await hydrateSchoolName(user);
    if (hydrated.schoolName !== user.schoolName) {
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(hydrated));
      setUser(hydrated);
    }
  }, [user, hydrateSchoolName]);

  const value = useMemo(
    () => ({ user, loading, applySession, refreshProfile, logout: clear }),
    [user, loading, applySession, refreshProfile, clear]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
