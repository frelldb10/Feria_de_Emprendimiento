import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { describeError, supabase, SUPABASE_CONFIGURED, usernameToEmail } from '../../lib/supabase';
import { fetchProfile, type SessionUser } from './users';

export type LoginResult = { ok: true; user: SessionUser } | { ok: false; message: string };

interface AuthContextValue {
  /** "loading" mientras se revisa si había una sesión abierta en este equipo. */
  status: 'loading' | 'ready';
  user: SessionUser | null;
  /** Nombre que se muestra en pantalla; en la base lo registra el servidor. */
  operator: string;
  /** Aviso cuando se cerró la sesión sola (cuenta desactivada o sin rol). */
  notice: string | null;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const INACTIVE = 'Esta cuenta está desactivada. Habla con el administrador.';
const NO_ROLE = 'Tu cuenta todavía no tiene un rol. Pídele al administrador que te lo asigne.';

/** El rol sale del perfil en el servidor: si el administrador lo cambia, la sesión abierta lo refleja. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready'>(SUPABASE_CONFIGURED ? 'loading' : 'ready');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /** Lee el perfil de la sesión; si la cuenta ya no puede entrar, cierra la sesión. */
  const applySession = useCallback(async (session: Session | null): Promise<LoginResult> => {
    if (!session) {
      setUser(null);
      return { ok: false, message: '' };
    }
    const profile = await fetchProfile(session.user.id);
    const problem = !profile || !profile.active ? INACTIVE : !profile.role ? NO_ROLE : null;
    if (problem) {
      await supabase.auth.signOut({ scope: 'local' });
      setUser(null);
      setNotice(problem);
      return { ok: false, message: problem };
    }
    const sessionUser = profile as SessionUser;
    setUser(sessionUser);
    setNotice(null);
    return { ok: true, user: sessionUser };
  }, []);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    supabase.auth
      .getSession()
      .then(({ data }) => applySession(data.session))
      .catch(() => setUser(null))
      .finally(() => setStatus('ready'));
    // Dentro de este aviso no se llama a Supabase (lo recomienda su documentación).
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setUser(null);
    });
    return () => data.subscription.unsubscribe();
  }, [applySession]);

  // Si el administrador cambia el rol o desactiva la cuenta mientras está abierta.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`perfil-${userId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, () => {
        void supabase.auth.getSession().then(({ data }) => applySession(data.session));
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, applySession]);

  const login = useCallback(
    async (username: string, password: string): Promise<LoginResult> => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });
        if (error) {
          if (error.code === 'user_banned' || /banned/i.test(error.message)) return { ok: false, message: INACTIVE };
          if (error.code === 'invalid_credentials' || error.status === 400) return { ok: false, message: 'Usuario o contraseña incorrectos.' };
          return { ok: false, message: describeError(error) };
        }
        return await applySession(data.session);
      } catch (error) {
        return { ok: false, message: describeError(error) };
      }
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    setUser(null);
    await supabase.auth.signOut().catch(() => supabase.auth.signOut({ scope: 'local' }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, operator: user?.name ?? '', notice, login, logout }),
    [status, user, notice, login, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}
