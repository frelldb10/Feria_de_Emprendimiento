// Feria Astrea · función "admin-users" (Supabase Edge Function).
//
// Solo el administrador la puede usar. Crea cuentas, cambia roles, activa o desactiva
// y restablece contraseñas con la clave de servicio, que nunca sale del servidor.
// Se despliega desde Supabase → Edge Functions (ver supabase/CONFIGURACION.md).

import { createClient } from 'jsr:@supabase/supabase-js@2';

// Debe coincidir con USERNAME_EMAIL_DOMAIN en src/lib/supabase.ts.
const EMAIL_DOMAIN = 'feria-astrea.local';
const ROLES = ['admin', 'observer', 'door', 'training', 'logistics', 'bonuses', 'finance'];
const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;
const NAME_PATTERN = /^\p{L}[\p{L}\s.&'-]*$/u;
const FOREVER = '876000h';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

class Refused extends Error {}

function checkPassword(password: unknown): string {
  if (typeof password !== 'string' || password.length < 6) throw new Refused('La contraseña debe tener al menos 6 caracteres.');
  if (/\s/.test(password)) throw new Refused('La contraseña no puede tener espacios.');
  return password;
}

function checkRole(role: unknown): string {
  if (typeof role !== 'string' || !ROLES.includes(role)) throw new Refused('Rol no válido.');
  return role;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Método no permitido.' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // ¿Quién llama? Debe ser un administrador activo.
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth.user) return reply({ error: 'Tu sesión venció. Vuelve a ingresar.' }, 401);
    const { data: caller } = await admin.from('profiles').select('id, role, active').eq('id', auth.user.id).single();
    if (!caller || caller.role !== 'admin' || !caller.active) {
      return reply({ error: 'Solo el administrador puede administrar usuarios.' }, 403);
    }

    const body = await req.json();
    const activeAdmins = async () => {
      const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin').eq('active', true);
      return count ?? 0;
    };
    const target = async (userId: unknown) => {
      if (typeof userId !== 'string') throw new Refused('Falta el usuario.');
      const { data } = await admin.from('profiles').select('id, role, active').eq('id', userId).single();
      if (!data) throw new Refused('Ese usuario no existe.');
      return data;
    };

    switch (body.action) {
      case 'create': {
        const name = String(body.name ?? '').trim();
        const username = String(body.username ?? '').trim().toLowerCase();
        if (!NAME_PATTERN.test(name) || name.split(/\s+/).filter((p) => p.length >= 2).length < 2) {
          throw new Refused('Escribe nombre y apellido, solo con letras.');
        }
        if (!USERNAME_PATTERN.test(username)) throw new Refused('El usuario solo puede tener minúsculas, números, punto, guion o guion bajo.');
        const role = checkRole(body.role);
        const password = checkPassword(body.password);

        const { data: taken } = await admin.from('profiles').select('id').eq('username', username).maybeSingle();
        if (taken) throw new Refused('Ese usuario ya existe. Prueba con otro.');

        const { data, error } = await admin.auth.admin.createUser({
          email: `${username}@${EMAIL_DOMAIN}`,
          password,
          email_confirm: true,
          user_metadata: { name },
          app_metadata: { role },
        });
        if (error || !data.user) throw new Refused(error?.message.includes('already') ? 'Ese usuario ya existe.' : `No se pudo crear: ${error?.message}`);
        // El perfil lo crea el trigger de la base; aquí se asegura nombre y rol.
        await admin.from('profiles').update({ name, role, active: true, updated_at: new Date().toISOString() }).eq('id', data.user.id);
        return reply({ ok: true, userId: data.user.id });
      }

      case 'set_role': {
        const user = await target(body.userId);
        const role = checkRole(body.role);
        if (user.id === caller.id) throw new Refused('No puedes cambiar tu propio rol. Pídeselo a otro administrador.');
        if (user.role === 'admin' && role !== 'admin' && user.active && (await activeAdmins()) <= 1) {
          throw new Refused('Debe quedar al menos un administrador activo.');
        }
        await admin.from('profiles').update({ role, updated_at: new Date().toISOString() }).eq('id', user.id);
        await admin.auth.admin.updateUserById(user.id, { app_metadata: { role } });
        return reply({ ok: true });
      }

      case 'set_active': {
        const user = await target(body.userId);
        const active = body.active === true;
        if (!active && user.id === caller.id) throw new Refused('No puedes desactivar tu propia cuenta.');
        if (!active && user.role === 'admin' && user.active && (await activeAdmins()) <= 1) {
          throw new Refused('Debe quedar al menos un administrador activo.');
        }
        // Desactivar también bloquea el ingreso en Auth, no solo los permisos.
        const { error } = await admin.auth.admin.updateUserById(user.id, { ban_duration: active ? 'none' : FOREVER });
        if (error) throw new Refused(`No se pudo cambiar el estado: ${error.message}`);
        await admin.from('profiles').update({ active, updated_at: new Date().toISOString() }).eq('id', user.id);
        return reply({ ok: true });
      }

      case 'reset_password': {
        const user = await target(body.userId);
        const password = checkPassword(body.password);
        const { error } = await admin.auth.admin.updateUserById(user.id, { password });
        if (error) throw new Refused(`No se pudo cambiar la contraseña: ${error.message}`);
        await admin.from('profiles').update({ updated_at: new Date().toISOString() }).eq('id', user.id);
        return reply({ ok: true });
      }

      default:
        return reply({ error: 'Acción no reconocida.' }, 400);
    }
  } catch (error) {
    if (error instanceof Refused) return reply({ error: error.message }, 400);
    return reply({ error: `Error inesperado: ${error instanceof Error ? error.message : String(error)}` }, 500);
  }
});
