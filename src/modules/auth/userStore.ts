import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, randomBytes } from '@noble/hashes/utils.js';
import { createPersistentStore } from '../../lib/persistentStore';
import { createId, randomToken } from '../../lib/random';
import { isFullName } from '../../lib/text';
import { isRole, ROLES, type Role } from './roles';

/*
  Cuentas de usuario creadas por el administrador. Las contraseñas se guardan cifradas con
  PBKDF2 (nunca en texto plano). Mientras no haya servidor, las cuentas existen solo en el
  navegador donde se crearon; al conectar Supabase este archivo es el que se reemplaza.
*/

export interface AppUser {
  id: string;
  name: string;
  username: string;
  role: Role;
  active: boolean;
  passwordHash: string;
  salt: string;
  createdAt: string;
  updatedAt: string;
}

interface UsersState {
  version: 1;
  users: AppUser[];
}

const ITERATIONS = 15_000;
export const MIN_PASSWORD_LENGTH = 6;
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;

function hashPassword(password: string, salt: string): string {
  return bytesToHex(pbkdf2(sha256, password, salt, { c: ITERATIONS, dkLen: 32 }));
}

function withPassword(password: string): Pick<AppUser, 'passwordHash' | 'salt'> {
  const salt = bytesToHex(randomBytes(16));
  return { salt, passwordHash: hashPassword(password, salt) };
}

/**
 * Primer administrador: se configura en .env.local (ver .env.example) para que su contraseña
 * no quede en el repositorio. Se crea solo si todavía no hay ningún administrador activo, y
 * su contraseña inicial se debe cambiar desde Usuarios al empezar.
 */
const INITIAL_ADMIN = {
  name: import.meta.env.VITE_ADMIN_NAME?.trim() || 'Administrador',
  username: cleanUsername(import.meta.env.VITE_ADMIN_USERNAME || 'admin'),
  password: import.meta.env.VITE_ADMIN_PASSWORD ?? '',
};
export const INITIAL_ADMIN_CONFIGURED = INITIAL_ADMIN.password.length >= MIN_PASSWORD_LENGTH;

function withInitialAdmin(users: AppUser[]): AppUser[] {
  const hasAdmin = users.some((u) => u.role === 'admin' && u.active);
  if (!INITIAL_ADMIN_CONFIGURED || hasAdmin || users.some((u) => u.username === INITIAL_ADMIN.username)) return users;
  const now = new Date().toISOString();
  return [
    ...users,
    {
      id: createId('usr'),
      name: INITIAL_ADMIN.name,
      username: INITIAL_ADMIN.username,
      role: 'admin',
      active: true,
      ...withPassword(INITIAL_ADMIN.password),
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function createInitialUsers(): UsersState {
  return { version: 1, users: withInitialAdmin([]) };
}

function restore(saved: unknown): UsersState | null {
  const data = saved as Partial<UsersState>;
  if (data.version !== 1 || !Array.isArray(data.users)) return null;
  return { version: 1, users: withInitialAdmin(data.users.filter((u) => isRole(u.role))) };
}

const store = createPersistentStore<UsersState>('feria-astrea:usuarios', restore, createInitialUsers);

export function useUsers(): AppUser[] {
  return store.useState().users;
}

function save(users: AppUser[]) {
  store.commit({ version: 1, users });
}

const touch = (user: AppUser, changes: Partial<AppUser>): AppUser => ({ ...user, ...changes, updatedAt: new Date().toISOString() });

export function cleanUsername(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9._-]/g, '').slice(0, 30);
}

export function generatePassword(): string {
  return randomToken(8).toLowerCase();
}

/* ---------- Ingreso ---------- */

export type LoginResult = { ok: true; user: AppUser } | { ok: false; message: string };

export function verifyCredentials(username: string, password: string): LoginResult {
  const user = store.getState().users.find((u) => u.username === cleanUsername(username));
  if (!user || hashPassword(password, user.salt) !== user.passwordHash) {
    return { ok: false, message: 'Usuario o contraseña incorrectos.' };
  }
  if (!user.active) return { ok: false, message: 'Esta cuenta está desactivada. Habla con el administrador.' };
  return { ok: true, user };
}

/* ---------- Administración de cuentas ---------- */

export interface NewUserInput {
  name: string;
  username: string;
  role: Role | '';
  password: string;
}

export type NewUserErrors = Partial<Record<keyof NewUserInput, string>>;

export function validateNewUser(input: NewUserInput): NewUserErrors {
  const errors: NewUserErrors = {};
  if (!isFullName(input.name)) errors.name = 'Escribe nombre y apellido, solo con letras.';
  if (!USERNAME_PATTERN.test(input.username)) {
    errors.username = 'De 3 a 30 caracteres: letras minúsculas, números, punto, guion o guion bajo.';
  } else if (store.getState().users.some((u) => u.username === input.username)) {
    errors.username = 'Ese usuario ya existe. Prueba con otro.';
  }
  if (!input.role) errors.role = 'Selecciona el rol.';
  const passwordError = validatePassword(input.password);
  if (passwordError) errors.password = passwordError;
  return errors;
}

export function validatePassword(password: string): string | undefined {
  if (password.length < MIN_PASSWORD_LENGTH) return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (/\s/.test(password)) return 'La contraseña no puede tener espacios.';
  return undefined;
}

export function createUser(input: NewUserInput & { role: Role }): AppUser {
  const now = new Date().toISOString();
  const user: AppUser = {
    id: createId('usr'),
    name: input.name.trim(),
    username: input.username,
    role: input.role,
    active: true,
    ...withPassword(input.password),
    createdAt: now,
    updatedAt: now,
  };
  save([...store.getState().users, user]);
  return user;
}

const activeAdmins = (users: AppUser[]) => users.filter((u) => u.role === 'admin' && u.active).length;

/** Devuelve un mensaje si el cambio no se permite; null si se aplicó. */
export function changeRole(userId: string, role: Role, actingUserId: string): string | null {
  const users = store.getState().users;
  const target = users.find((u) => u.id === userId);
  if (!target || target.role === role) return null;
  if (userId === actingUserId) return 'No puedes cambiar tu propio rol. Pídeselo a otro administrador.';
  if (target.role === 'admin' && target.active && activeAdmins(users) === 1) return 'Debe quedar al menos un administrador activo.';
  save(users.map((u) => (u.id === userId ? touch(u, { role }) : u)));
  return null;
}

export function setUserActive(userId: string, active: boolean, actingUserId: string): string | null {
  const users = store.getState().users;
  const target = users.find((u) => u.id === userId);
  if (!target || target.active === active) return null;
  if (!active && userId === actingUserId) return 'No puedes desactivar tu propia cuenta.';
  if (!active && target.role === 'admin' && activeAdmins(users) === 1) return 'Debe quedar al menos un administrador activo.';
  save(users.map((u) => (u.id === userId ? touch(u, { active }) : u)));
  return null;
}

export function resetPassword(userId: string, password: string): void {
  save(store.getState().users.map((u) => (u.id === userId ? touch(u, withPassword(password)) : u)));
}

export function roleLabel(role: Role): string {
  return ROLES[role].label;
}
