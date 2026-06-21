import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "../types";

interface AuthContextValue {
  session: Session | null;
  login: (session: Session) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const key = "peluqapp_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Session) : null;
  });
  const value = useMemo(
    () => ({
      session,
      login(next: Session) {
        localStorage.setItem(key, JSON.stringify(next));
        setSession(next);
      },
      logout() {
        localStorage.removeItem(key);
        setSession(null);
      }
    }),
    [session]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return value;
}
