import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';
import { useUsers, verifyCredentials, type AppUser, type LoginResult } from './userStore';

interface AuthContextValue {
  /** null sin sesión, o si el administrador desactivó la cuenta mientras estaba abierta. */
  user: AppUser | null;
  /** Nombre que queda registrado en asistencias, entregas, bonos y ventas. */
  operator: string;
  login: (username: string, password: string) => LoginResult;
  logout: () => void;
}

const SESSION_KEY = 'feria-astrea:sesion';
const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): string | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
    return typeof parsed?.userId === 'string' ? parsed.userId : null;
  } catch {
    return null;
  }
}

function writeSession(userId: string | null) {
  try {
    if (userId) localStorage.setItem(SESSION_KEY, JSON.stringify({ userId }));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Sin almacenamiento la sesión dura lo que dure la pestaña.
  }
}

/** El rol sale siempre de la cuenta: si el administrador lo cambia, la sesión abierta lo refleja. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const users = useUsers();
  const [userId, setUserId] = useState<string | null>(readSession);
  const user = useMemo(() => users.find((u) => u.id === userId && u.active) ?? null, [users, userId]);

  const login = useCallback((username: string, password: string) => {
    const result = verifyCredentials(username, password);
    if (result.ok) {
      writeSession(result.user.id);
      setUserId(result.user.id);
    }
    return result;
  }, []);

  const logout = useCallback(() => {
    writeSession(null);
    setUserId(null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({ user, operator: user?.name ?? '', login, logout }), [user, login, logout]);

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}
