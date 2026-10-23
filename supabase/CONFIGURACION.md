# Configurar Supabase para Feria Astrea

Se hace una sola vez, desde el panel de Supabase (https://supabase.com/dashboard), con el proyecto `feria-astrea` abierto. No hace falta compartir ninguna clave secreta.

## 1. Base de datos

1. Menú izquierdo → **SQL Editor** → **New query**.
2. Abre el archivo `supabase/schema.sql` de este proyecto, copia todo el contenido y pégalo en el editor.
3. Clic en **Run**. Debe terminar con *Success. No rows returned*.

Esto crea las tablas, los permisos de cada rol, el almacenamiento privado de las fotos (`evidencias`) y el tiempo real. Si más adelante el archivo cambia, se vuelve a pegar y ejecutar: no borra datos.

## 2. Función para administrar usuarios

1. Menú izquierdo → **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Nombre de la función: `admin-users` (exactamente así).
3. Borra el código de ejemplo y pega todo el contenido de `supabase/functions/admin-users/index.ts`.
4. Clic en **Deploy function**.
5. Cuando termine, entra a la función → **Details** (o **Settings**) y **desactiva "Verify JWT with legacy secret"** (puede aparecer como *Enforce JWT verification*). Guarda. La función revisa por su cuenta que quien la llama sea un administrador.

## 3. Primer administrador

1. Menú izquierdo → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Email: `nombre.apellido@feria-astrea.local` (con el nombre real del administrador, sin tildes ni ñ)
   (el usuario para entrar a la app es lo que va antes de la @: `nombre.apellido`).
3. Password: la contraseña inicial del administrador.
4. Marca **Auto Confirm User** y clic en **Create user**.
5. Vuelve a **SQL Editor** → **New query**, pega esto y clic en **Run**:

   ```sql
   update public.profiles
   set role = 'admin', name = 'Nombre Apellido'
   where username = 'nombre.apellido'
   returning username, name, role;
   ```

   Debe aparecer una fila con el rol `admin`.

Los demás usuarios ya no se crean aquí: el administrador los crea desde la app, en la sección **Usuarios**.

## Cuando el proyecto se actualiza

Si cambia `supabase/schema.sql`, se vuelve a pegar completo en el **SQL Editor** y se ejecuta: no borra datos. Si cambia `supabase/functions/admin-users/index.ts`, en **Edge Functions → admin-users → Code** se reemplaza el código, se hace **Deploy** y se revisa que "Verify JWT" siga desactivado.

Roles disponibles: `admin` (administrador), `observer` (administrador de solo lectura), `door`, `training`, `logistics`, `bonuses` y `finance`.

## 4. La app

En la carpeta del proyecto, el archivo `.env.local` debe tener la dirección y la clave pública del proyecto (ver `.env.example`):

```
VITE_SUPABASE_URL=https://<id-del-proyecto>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Luego `npm run dev` y se entra con el usuario del administrador.
