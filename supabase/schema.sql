-- =====================================================================
-- Feria Astrea · esquema de la base de datos (Supabase / PostgreSQL)
--
-- Se pega completo en Supabase → SQL Editor → New query, y se ejecuta con "Run".
-- Se puede volver a ejecutar: no borra datos, solo crea lo que falte y
-- actualiza funciones y permisos.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- Funciones internas que no se exponen en la API.
create schema if not exists private;
grant usage on schema private to authenticated;


-- ---------------------------------------------------------------------
-- Perfiles: una fila por cuenta de Supabase Auth, con su rol en la feria.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  name text not null,
  role text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Roles válidos. "observer" es el administrador de solo lectura: ve todo y no cambia nada.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'observer', 'door', 'training', 'logistics', 'bonuses', 'finance'));

-- ¿El usuario actual está activo y tiene alguno de estos roles?
create or replace function private.has_role(roles text[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select p.role = any (roles) from public.profiles p where p.id = (select auth.uid()) and p.active),
    false
  );
$$;

create or replace function private.is_active_user()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select private.has_role(array['admin', 'observer', 'door', 'training', 'logistics', 'bonuses', 'finance']);
$$;

grant execute on function private.has_role(text[]) to authenticated;
grant execute on function private.is_active_user() to authenticated;

-- Al crear una cuenta en Auth se crea su perfil. El usuario sale del correo
-- (laura.daza@feria-astrea.local → laura.daza) y el rol de app_metadata,
-- que solo puede escribir el servidor.
create or replace function private.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, name, role)
  values (
    new.id,
    lower(split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    nullif(new.raw_app_meta_data ->> 'role', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();


-- ---------------------------------------------------------------------
-- Datos de la feria
-- ---------------------------------------------------------------------
create table if not exists public.entrepreneurs (
  id uuid primary key default gen_random_uuid(),
  document text not null unique,
  owner_name text not null,
  business_name text not null,
  phone text not null default '',
  category text not null default '',
  section text check (section in ('gastronomia', 'manualidades', 'moda')),
  stand text not null default '',
  needs_power boolean not null default false,
  chairs integer not null default 0 check (chairs >= 0),
  qr_code text unique,
  created_at timestamptz not null default now()
);

-- La restricción unique (entrepreneur_id, day) es la que bloquea el QR repetido
-- aunque lo escaneen dos celulares distintos al mismo tiempo.
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  entrepreneur_id uuid not null references public.entrepreneurs (id) on delete cascade,
  day smallint not null check (day in (1, 2)),
  method text not null check (method in ('qr', 'manual')),
  at timestamptz not null default now(),
  operator_id uuid references auth.users (id) on delete set null,
  operator_name text not null default '',
  unique (entrepreneur_id, day)
);

create table if not exists public.training_info (
  id smallint primary key default 1 check (id = 1),
  title text not null default 'Capacitación de emprendedores',
  date date,
  place text not null default ''
);
insert into public.training_info (id) values (1) on conflict (id) do nothing;

create table if not exists public.training_attendance (
  id uuid primary key default gen_random_uuid(),
  entrepreneur_id uuid not null unique references public.entrepreneurs (id) on delete cascade,
  method text not null check (method in ('qr', 'manual')),
  at timestamptz not null default now(),
  operator_id uuid references auth.users (id) on delete set null,
  operator_name text not null default ''
);

create table if not exists public.logistics_checks (
  entrepreneur_id uuid primary key references public.entrepreneurs (id) on delete cascade,
  stand_ready boolean not null default false,
  power_connected boolean not null default false,
  chairs_delivered boolean not null default false,
  at timestamptz not null default now(),
  operator_id uuid references auth.users (id) on delete set null,
  operator_name text not null default ''
);

create table if not exists public.kit_deliveries (
  id uuid primary key default gen_random_uuid(),
  entrepreneur_id uuid not null unique references public.entrepreneurs (id) on delete cascade,
  gorras boolean not null default false,
  sueteres boolean not null default false,
  pendon boolean not null default false,
  photo_path text not null,
  photo_name text not null,
  photo_size_kb integer not null default 0,
  at timestamptz not null default now(),
  operator_id uuid references auth.users (id) on delete set null,
  operator_name text not null default ''
);

-- Cuentas para el bono de emprendimiento. Solo las ven el administrador y el operador de bonos.
create table if not exists public.bonuses (
  id uuid primary key default gen_random_uuid(),
  entrepreneur_id uuid not null unique references public.entrepreneurs (id) on delete cascade,
  bank text not null,
  account_type text not null check (account_type in ('ahorros', 'corriente', 'billetera')),
  account_number text not null check (account_number ~ '^[0-9]{6,20}$'),
  holder_name text not null,
  holder_document text not null check (holder_document ~ '^[0-9]{5,12}$'),
  data_consent boolean not null check (data_consent),
  verified_days smallint[] not null default '{}',
  at timestamptz not null default now(),
  operator_id uuid references auth.users (id) on delete set null,
  operator_name text not null default ''
);

-- Ventas: dos cortes por día; cada corte guarda lo vendido desde el anterior.
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  entrepreneur_id uuid not null references public.entrepreneurs (id) on delete cascade,
  day smallint not null check (day in (1, 2)),
  cut smallint not null check (cut in (1, 2)),
  amount bigint not null check (amount >= 0),
  at timestamptz not null default now(),
  operator_id uuid references auth.users (id) on delete set null,
  operator_name text not null default '',
  unique (entrepreneur_id, day, cut)
);

create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  kind text not null,
  message text not null
);
create index if not exists activity_at_idx on public.activity (at desc);


-- ---------------------------------------------------------------------
-- Quién registró y cuándo: lo pone el servidor, no el celular.
-- ---------------------------------------------------------------------
create or replace function private.stamp_operator()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.operator_id := (select auth.uid());
  new.operator_name := coalesce((select p.name from public.profiles p where p.id = new.operator_id), 'Sistema');
  new.at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['attendance', 'training_attendance', 'logistics_checks', 'kit_deliveries', 'bonuses', 'sales'] loop
    execute format('drop trigger if exists stamp_operator on public.%I', t);
    execute format(
      'create trigger stamp_operator before insert or update on public.%I for each row execute function private.stamp_operator()',
      t
    );
  end loop;
end;
$$;

-- El bono solo se registra si el emprendedor tiene asistencia en puerta (Día 1, Día 2 o ambos).
create or replace function private.bonus_requires_attendance()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  days smallint[];
begin
  if tg_op = 'UPDATE' then
    new.entrepreneur_id := old.entrepreneur_id;
    new.verified_days := old.verified_days;
    return new;
  end if;
  select coalesce(array_agg(a.day order by a.day), '{}') into days
  from public.attendance a
  where a.entrepreneur_id = new.entrepreneur_id;
  if cardinality(days) = 0 then
    raise exception 'El emprendedor no registra asistencia a la feria.' using errcode = 'P0001';
  end if;
  new.verified_days := days;
  return new;
end;
$$;

drop trigger if exists bonus_requires_attendance on public.bonuses;
create trigger bonus_requires_attendance
  before insert or update on public.bonuses
  for each row execute function private.bonus_requires_attendance();


-- ---------------------------------------------------------------------
-- Seguridad por filas (RLS): qué puede leer y escribir cada rol.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.entrepreneurs enable row level security;
alter table public.attendance enable row level security;
alter table public.training_info enable row level security;
alter table public.training_attendance enable row level security;
alter table public.logistics_checks enable row level security;
alter table public.kit_deliveries enable row level security;
alter table public.bonuses enable row level security;
alter table public.sales enable row level security;
alter table public.activity enable row level security;

drop policy if exists "perfil propio o administrador" on public.profiles;
create policy "perfil propio o administrador" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.has_role(array['admin', 'observer']));

drop policy if exists "emprendedores: leen todos los roles" on public.entrepreneurs;
create policy "emprendedores: leen todos los roles" on public.entrepreneurs
  for select to authenticated using (private.is_active_user());
drop policy if exists "emprendedores: escribe el administrador" on public.entrepreneurs;
create policy "emprendedores: escribe el administrador" on public.entrepreneurs
  for all to authenticated
  using (private.has_role(array['admin'])) with check (private.has_role(array['admin']));

drop policy if exists "asistencia: leen todos los roles" on public.attendance;
create policy "asistencia: leen todos los roles" on public.attendance
  for select to authenticated using (private.is_active_user());
drop policy if exists "asistencia: registra puerta" on public.attendance;
create policy "asistencia: registra puerta" on public.attendance
  for insert to authenticated with check (private.has_role(array['admin', 'door']));

drop policy if exists "capacitación: leen todos los roles" on public.training_info;
create policy "capacitación: leen todos los roles" on public.training_info
  for select to authenticated using (private.is_active_user());
drop policy if exists "capacitación: edita el administrador" on public.training_info;
create policy "capacitación: edita el administrador" on public.training_info
  for update to authenticated
  using (private.has_role(array['admin'])) with check (private.has_role(array['admin']));

drop policy if exists "asistencia a capacitación: leen todos los roles" on public.training_attendance;
create policy "asistencia a capacitación: leen todos los roles" on public.training_attendance
  for select to authenticated using (private.is_active_user());
drop policy if exists "asistencia a capacitación: registra capacitación" on public.training_attendance;
create policy "asistencia a capacitación: registra capacitación" on public.training_attendance
  for insert to authenticated with check (private.has_role(array['admin', 'training']));

drop policy if exists "logística: leen todos los roles" on public.logistics_checks;
create policy "logística: leen todos los roles" on public.logistics_checks
  for select to authenticated using (private.is_active_user());
drop policy if exists "logística: registra logística" on public.logistics_checks;
create policy "logística: registra logística" on public.logistics_checks
  for insert to authenticated with check (private.has_role(array['admin', 'logistics']));
drop policy if exists "logística: actualiza logística" on public.logistics_checks;
create policy "logística: actualiza logística" on public.logistics_checks
  for update to authenticated
  using (private.has_role(array['admin', 'logistics'])) with check (private.has_role(array['admin', 'logistics']));

drop policy if exists "kits: leen todos los roles" on public.kit_deliveries;
create policy "kits: leen todos los roles" on public.kit_deliveries
  for select to authenticated using (private.is_active_user());
drop policy if exists "kits: registra logística" on public.kit_deliveries;
create policy "kits: registra logística" on public.kit_deliveries
  for insert to authenticated with check (private.has_role(array['admin', 'logistics']));
drop policy if exists "kits: actualiza logística" on public.kit_deliveries;
create policy "kits: actualiza logística" on public.kit_deliveries
  for update to authenticated
  using (private.has_role(array['admin', 'logistics'])) with check (private.has_role(array['admin', 'logistics']));

-- Reemplazadas por las de abajo, que separan leer de escribir.
drop policy if exists "bonos: solo administrador y bonos" on public.bonuses;
drop policy if exists "ventas: solo administrador y finanzas" on public.sales;

drop policy if exists "bonos: leen administrador, observador y bonos" on public.bonuses;
create policy "bonos: leen administrador, observador y bonos" on public.bonuses
  for select to authenticated using (private.has_role(array['admin', 'observer', 'bonuses']));
drop policy if exists "bonos: registra bonos" on public.bonuses;
create policy "bonos: registra bonos" on public.bonuses
  for insert to authenticated with check (private.has_role(array['admin', 'bonuses']));
drop policy if exists "bonos: corrige bonos" on public.bonuses;
create policy "bonos: corrige bonos" on public.bonuses
  for update to authenticated
  using (private.has_role(array['admin', 'bonuses'])) with check (private.has_role(array['admin', 'bonuses']));

drop policy if exists "ventas: leen administrador, observador y finanzas" on public.sales;
create policy "ventas: leen administrador, observador y finanzas" on public.sales
  for select to authenticated using (private.has_role(array['admin', 'observer', 'finance']));
drop policy if exists "ventas: registra finanzas" on public.sales;
create policy "ventas: registra finanzas" on public.sales
  for insert to authenticated with check (private.has_role(array['admin', 'finance']));
drop policy if exists "ventas: actualiza finanzas" on public.sales;
create policy "ventas: actualiza finanzas" on public.sales
  for update to authenticated
  using (private.has_role(array['admin', 'finance'])) with check (private.has_role(array['admin', 'finance']));

drop policy if exists "actividad: la ve el administrador" on public.activity;
create policy "actividad: la ve el administrador" on public.activity
  for select to authenticated using (private.has_role(array['admin', 'observer']));
drop policy if exists "actividad: la escriben todos los roles" on public.activity;
create policy "actividad: la escriben todos los roles" on public.activity
  for insert to authenticated with check (private.is_active_user());

-- El proyecto se creó sin exponer tablas automáticamente: los permisos van explícitos.
revoke all on public.profiles, public.entrepreneurs, public.attendance, public.training_info,
  public.training_attendance, public.logistics_checks, public.kit_deliveries, public.bonuses,
  public.sales, public.activity from anon;

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.entrepreneurs to authenticated;
grant select, insert on public.attendance, public.training_attendance, public.activity to authenticated;
grant select, update on public.training_info to authenticated;
grant select, insert, update on public.logistics_checks, public.kit_deliveries, public.bonuses, public.sales to authenticated;

-- La función admin-users usa la clave de servicio.
grant all on public.profiles, public.entrepreneurs, public.attendance, public.training_info,
  public.training_attendance, public.logistics_checks, public.kit_deliveries, public.bonuses,
  public.sales, public.activity to service_role;


-- ---------------------------------------------------------------------
-- Funciones que llama la app
-- ---------------------------------------------------------------------

-- Registra el ingreso en puerta. Si ya había ingresado ese día devuelve "duplicate"
-- con la hora y quién lo registró. Un solo viaje al servidor y sin carreras.
create or replace function public.register_attendance(p_entrepreneur_id uuid, p_day integer, p_method text)
returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  saved public.attendance;
begin
  if not private.has_role(array['admin', 'door']) then
    raise exception 'No tienes permiso para registrar ingresos.' using errcode = '42501';
  end if;
  insert into public.attendance (entrepreneur_id, day, method)
  values (p_entrepreneur_id, p_day, p_method)
  on conflict (entrepreneur_id, day) do nothing
  returning * into saved;
  if saved.id is not null then
    return jsonb_build_object('status', 'ok', 'at', saved.at);
  end if;
  select * into saved from public.attendance a where a.entrepreneur_id = p_entrepreneur_id and a.day = p_day;
  return jsonb_build_object('status', 'duplicate', 'at', saved.at, 'operator', saved.operator_name);
end;
$$;

create or replace function public.register_training(p_entrepreneur_id uuid, p_method text)
returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  saved public.training_attendance;
begin
  if not private.has_role(array['admin', 'training']) then
    raise exception 'No tienes permiso para registrar la capacitación.' using errcode = '42501';
  end if;
  insert into public.training_attendance (entrepreneur_id, method)
  values (p_entrepreneur_id, p_method)
  on conflict (entrepreneur_id) do nothing
  returning * into saved;
  if saved.id is not null then
    return jsonb_build_object('status', 'ok', 'at', saved.at);
  end if;
  select * into saved from public.training_attendance t where t.entrepreneur_id = p_entrepreneur_id;
  return jsonb_build_object('status', 'duplicate', 'at', saved.at, 'operator', saved.operator_name);
end;
$$;

-- Sufijo aleatorio para los códigos QR (sin letras que se confunden: I, O, 0, 1).
create or replace function private.random_token(len integer)
returns text
language sql volatile set search_path = ''
as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (get_byte(s.b, i) % 32) + 1, 1), '')
  from (select extensions.gen_random_bytes(len) as b) s, generate_series(0, len - 1) as i;
$$;
grant execute on function private.random_token(integer) to authenticated;

-- Asigna FE-0001-K7QM, FE-0002-... a quienes aún no tienen código y devuelve los nuevos.
create or replace function public.generate_missing_qr_codes()
returns setof public.entrepreneurs
language plpgsql security invoker set search_path = ''
as $$
declare
  start_seq integer;
begin
  if not private.has_role(array['admin']) then
    raise exception 'Solo el administrador genera códigos QR.' using errcode = '42501';
  end if;
  select coalesce(max(split_part(e.qr_code, '-', 2)::integer), 0) into start_seq
  from public.entrepreneurs e
  where e.qr_code ~ '^FE-[0-9]+-';

  return query
  with pending as (
    select e.id, row_number() over (order by e.created_at, e.business_name) as n
    from public.entrepreneurs e
    where e.qr_code is null
  ),
  updated as (
    update public.entrepreneurs e
    set qr_code = 'FE-' || lpad((start_seq + p.n)::text, 4, '0') || '-' || private.random_token(4)
    from pending p
    where e.id = p.id
    returning e.*
  )
  select * from updated;
end;
$$;

-- Borra los datos de la feria para empezar de cero. No toca las cuentas de usuario.
create or replace function public.clear_fair_data()
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.has_role(array['admin']) then
    raise exception 'Solo el administrador puede vaciar los datos.' using errcode = '42501';
  end if;
  truncate public.activity, public.sales, public.bonuses, public.kit_deliveries, public.logistics_checks,
    public.training_attendance, public.attendance, public.entrepreneurs;
  update public.training_info set title = 'Capacitación de emprendedores', date = null, place = '' where id = 1;
end;
$$;

revoke execute on function public.register_attendance(uuid, integer, text) from public, anon;
revoke execute on function public.register_training(uuid, text) from public, anon;
revoke execute on function public.generate_missing_qr_codes() from public, anon;
revoke execute on function public.clear_fair_data() from public, anon;
grant execute on function public.register_attendance(uuid, integer, text) to authenticated;
grant execute on function public.register_training(uuid, text) to authenticated;
grant execute on function public.generate_missing_qr_codes() to authenticated;
grant execute on function public.clear_fair_data() to authenticated;


-- ---------------------------------------------------------------------
-- Fotos de evidencia de los kits (almacenamiento privado)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidencias', 'evidencias', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "evidencias: suben logística y administrador" on storage.objects;
create policy "evidencias: suben logística y administrador" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'evidencias' and private.has_role(array['admin', 'logistics']));

drop policy if exists "evidencias: ven logística y administrador" on storage.objects;
create policy "evidencias: ven logística y administrador" on storage.objects
  for select to authenticated
  using (bucket_id = 'evidencias' and private.has_role(array['admin', 'observer', 'logistics']));


-- ---------------------------------------------------------------------
-- Tiempo real: los cambios de un celular llegan a los demás al instante.
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'entrepreneurs', 'attendance', 'training_info', 'training_attendance',
                           'logistics_checks', 'kit_deliveries', 'bonuses', 'sales', 'activity'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;
