import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

/** false si falta el archivo .env.local: la app muestra cómo configurarlo en vez de fallar. */
export const SUPABASE_CONFIGURED = url.startsWith('https://') && publishableKey.length > 0;

export const supabase = createClient(SUPABASE_CONFIGURED ? url : 'https://sin-configurar.supabase.co', publishableKey || 'sin-clave', {
  auth: { persistSession: true, autoRefreshToken: true },
});

/**
 * Supabase Auth trabaja con correos; la app usa nombres de usuario. Cada usuario se guarda
 * como usuario@feria-astrea.local (nunca se envían correos a esa dirección).
 * Debe coincidir con EMAIL_DOMAIN en supabase/functions/admin-users/index.ts.
 */
export const USERNAME_EMAIL_DOMAIN = 'feria-astrea.local';

export function usernameToEmail(username: string): string {
  return `${username}@${USERNAME_EMAIL_DOMAIN}`;
}

/** Error con un mensaje ya listo para mostrarle al operador. */
export class ActionError extends Error {}

/** Mensaje en español para mostrar al operador cuando algo falla contra el servidor. */
export function describeError(error: unknown): string {
  if (error instanceof ActionError) return error.message;
  if (error instanceof TypeError || (error instanceof Error && /fetch|network|Failed to/i.test(error.message))) {
    return 'Sin conexión con el servidor. Revisa el internet e intenta de nuevo; no se guardó nada.';
  }
  const e = error as { code?: string; message?: string } | null;
  if (e?.code === '42501') return e.message && !/permission denied|row-level security/i.test(e.message) ? e.message : 'No tienes permiso para hacer esto.';
  if (e?.code === 'P0001' && e.message) return e.message;
  if (e?.code === '23505') return 'Ese registro ya existe.';
  if (e?.message) return e.message;
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}
