import { useCallback, useEffect, useState } from 'react';
import { ActionError, describeError, supabase } from '../../lib/supabase';
import { randomToken } from '../../lib/random';
import { isFullName } from '../../lib/text';
import { isRole, ROLES, type Role } from './roles';

/*
  Cuentas de la feria. Viven en Supabase Auth; la tabla "profiles" guarda nombre, rol y si
  la cuenta está activa. Crear cuentas, cambiar roles y contraseñas lo hace la función
  "admin-users" del servidor, porque necesita la clave de servicio.
*/

export interface AppUser {
  id: string;
  name: string;
  username: string;
  /** null mientras el administrador no le asigne uno. */
  role: Role | null;
  active: boolean;
  updatedAt: string;
}

/** Usuario con sesión abierta: siempre tiene rol y está activo. */
export type SessionUser = AppUser & { role: Role };

export const MIN_PASSWORD_LENGTH = 6;
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;

const toUser = (r: Record<string, any>): AppUser => ({
  id: r.id,
  name: r.name,
  username: r.username,
  role: isRole(r.role) ? r.role : null,
  active: r.active,
  updatedAt: r.updated_at,
});

export async function fetchProfile(userId: string): Promise<AppUser | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data ? toUser(data) : null;
}

/** Lista de cuentas para el administrador; se actualiza sola cuando cambian. */
export function useUserList() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data, error: failure } = await supabase.from('profiles').select('*').order('name');
    if (failure) setError(describeError(failure));
    else {
      setUsers(data.map(toUser));
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
    const channel = supabase
      .channel('perfiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => void reload())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [reload]);

  return { users, error, loading, reload };
}

/** Llama a la función admin-users y devuelve su mensaje de error en español si algo falla. */
async function callAdminUsers(body: Record<string, unknown>): Promise<void> {
  let failure: unknown;
  let data: { error?: string } | null = null;
  try {
    const result = await supabase.functions.invoke('admin-users', { body });
    data = result.data;
    failure = result.error;
  } catch (error) {
    throw new ActionError(describeError(error));
  }
  if (failure) {
    const context = (failure as { context?: Response }).context;
    const payload = context ? await context.json().catch(() => null) : null;
    throw new ActionError(payload?.error ?? describeError(failure));
  }
  if (data?.error) throw new ActionError(data.error);
}

export const createUser = (input: { name: string; username: string; role: Role; password: string }) =>
  callAdminUsers({ action: 'create', ...input });
export const changeRole = (userId: string, role: Role) => callAdminUsers({ action: 'set_role', userId, role });
export const setUserActive = (userId: string, active: boolean) => callAdminUsers({ action: 'set_active', userId, active });
export const resetPassword = (userId: string, password: string) => callAdminUsers({ action: 'reset_password', userId, password });

/* ---------- Validaciones del formulario (el servidor las repite) ---------- */

/** "José.Muñoz" → "jose.munoz": sin tildes ni ñ, que no van en el usuario. */
export function cleanUsername(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 30);
}

export function generatePassword(): string {
  return randomToken(8).toLowerCase();
}

export interface NewUserInput {
  name: string;
  username: string;
  role: Role | '';
  password: string;
}

export type NewUserErrors = Partial<Record<keyof NewUserInput, string>>;

export function validatePassword(password: string): string | undefined {
  if (password.length < MIN_PASSWORD_LENGTH) return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (/\s/.test(password)) return 'La contraseña no puede tener espacios.';
  return undefined;
}

export function validateNewUser(input: NewUserInput, existing: AppUser[]): NewUserErrors {
  const errors: NewUserErrors = {};
  if (!isFullName(input.name)) errors.name = 'Escribe nombre y apellido, solo con letras.';
  if (!USERNAME_PATTERN.test(input.username)) {
    errors.username = 'De 3 a 30 caracteres: letras minúsculas, números, punto, guion o guion bajo.';
  } else if (existing.some((u) => u.username === input.username)) {
    errors.username = 'Ese usuario ya existe. Prueba con otro.';
  }
  if (!input.role) errors.role = 'Selecciona el rol.';
  const passwordError = validatePassword(input.password);
  if (passwordError) errors.password = passwordError;
  return errors;
}

export function roleLabel(role: Role | null): string {
  return role ? ROLES[role].label : 'Sin rol';
}
