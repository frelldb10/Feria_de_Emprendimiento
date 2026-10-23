# Feria Astrea

Sistema web para la Feria de Emprendimiento de la Alcaldía Municipal de Astrea: control de ingreso con QR (Día 1 y Día 2), asistencia a la capacitación con QR, logística de stands y kits con foto, registro de cuentas para el bono de emprendimiento, ventas por sección y reportes en Excel y Word.

Hecho con React 19, Vite, TypeScript, Tailwind CSS 4 y Lucide. Los datos, las cuentas y las fotos viven en **Supabase** (base de datos PostgreSQL, autenticación, almacenamiento y tiempo real), así que todos los celulares ven lo mismo al instante.

## Puesta en marcha

1. **Configura Supabase** una sola vez, siguiendo [supabase/CONFIGURACION.md](supabase/CONFIGURACION.md): base de datos, función `admin-users` y primer administrador.
2. **Conecta la app**: copia `.env.example` con el nombre `.env.local` y escribe la dirección del proyecto y la clave *publishable* (Supabase → Project Settings → API Keys). Nunca pongas ahí la clave secreta. `.env.local` no se sube a GitHub.
3. **Ejecuta**:

   ```bash
   npm install
   npm run dev
   ```

   Abre http://localhost:5173 y entra con el usuario del administrador.

Para probar en un celular de la misma red Wi-Fi: `npm run dev -- --host` y abre la dirección `Network` que muestra la terminal. Para la versión de producción: `npm run build` (queda en `dist/`).

## Usuarios y roles

Cada persona entra con usuario y contraseña. Las cuentas las crea el administrador en **Usuarios**: nombre, usuario, rol y contraseña inicial (hay un botón para generarla). Al crearla, la pantalla muestra los datos para entregárselos a la persona. Desde ahí el administrador cambia roles, desactiva o reactiva cuentas y restablece contraseñas; los operadores no pueden cambiar la suya.

Por dentro, cada usuario es una cuenta de Supabase Auth con el correo `usuario@feria-astrea.local` (no se envían correos). Crear cuentas y cambiar contraseñas lo hace la función `admin-users` del servidor, que es la única que usa la clave de servicio.

Reglas: el administrador no puede cambiar su propio rol ni desactivarse, y siempre debe quedar al menos un administrador activo. Si el administrador cambia el rol de alguien o desactiva su cuenta, la sesión abierta de esa persona se entera al instante.

| Rol | Qué hace |
| --- | --- |
| Administrador | Ve y cambia todo: panel, carga masiva, códigos QR, datos de la capacitación, reportes y usuarios |
| Observador | Ve lo mismo que el administrador (panel, todos los módulos, actividad, reportes y usuarios), pero no puede cambiar nada |
| Operador de Puerta | Registra el ingreso a la feria con QR, Día 1 y Día 2 |
| Operador de Capacitación | Registra la asistencia a la capacitación con el mismo QR |
| Operador de Logística | Stands, energía, sillas, entrega de kits con foto e informe en Word |
| Operador de Bonos | Registra la cuenta bancaria para el bono de emprendimiento y descarga el Excel |
| Financiero | Registra las ventas de cada emprendedor en dos cortes al día y ve el balance por sección |

## Seguridad de los datos

Los permisos no dependen de la pantalla: los aplica la base de datos (Row Level Security).

- Las **cuentas bancarias** solo las pueden leer el administrador, el observador y el operador de bonos. Las **ventas**, solo el administrador, el observador y el financiero.
- El **observador** no puede escribir nada: la base de datos rechaza cualquier registro o cambio que intente.
- **Quién registró y a qué hora** lo pone el servidor, no el celular.
- El **QR repetido** lo bloquea la base de datos, aunque lo escaneen dos celulares en el mismo instante.
- El **bono** solo se guarda si el emprendedor tiene asistencia registrada; la base lo vuelve a comprobar.
- Las **fotos de evidencia** están en un almacenamiento privado; se ven con un enlace temporal.
- En el celular no queda guardado ningún dato de la feria: solo la sesión.

## Estructura

```
supabase/
  schema.sql             Tablas, permisos por rol, funciones, almacenamiento y tiempo real
  functions/admin-users/ Función del servidor para administrar cuentas
  CONFIGURACION.md       Paso a paso para dejar Supabase listo
src/
  components/
    ui/          Botón, tarjeta, modal, alertas, pestañas, filtros, campos, foto
    brand/       Logos y la franja verde, roja y amarilla
    layout/      Barra superior, menú lateral del administrador, menú de cuenta, carga
    scan/        Lector QR, pantalla verde o roja y últimos registros (puerta y capacitación)
    shared/      Buscador de emprendedores y ficha resumen
  modules/
    auth/        Ingreso, sesión, cuentas y protección de rutas
    admin/       Métricas, carga masiva, emprendedores, QR, capacitación, usuarios y roles
    door/        Control de ingreso
    training/    Asistencia a la capacitación
    logistics/   Requerimientos del stand, entrega del kit e informe en Word
    bonuses/     Cuenta bancaria para el bono de emprendimiento
    finance/     Ventas por corte, balance por sección y comparación de días
    reports/     Los cinco reportes en Excel
  store/         Copia en pantalla de los datos, lectura del servidor, acciones y reglas
  lib/           Cliente de Supabase, Excel, fechas, fotos
```

## Carga masiva

En el panel de administración se arrastra un archivo de Excel (.xlsx) o CSV. Las columnas obligatorias son `documento`, `nombre` y `emprendimiento`. Las opcionales son `seccion` (Gastronomía, Manualidades o Moda, Belleza y Estilo), `telefono`, `categoria`, `stand`, `energia` (si/no) y `sillas`. El botón "Descargar plantilla" baja un Excel de ejemplo.

Antes de cargar se muestra una vista previa que marca las filas con errores y los documentos repetidos; solo se cargan las filas válidas. Luego, "Generación masiva de QR" asigna un código a cada emprendedor nuevo (formato `FE-0001-K7QM`) y abre una hoja lista para imprimir. Ese mismo código sirve en la puerta y en la capacitación. Para ensayar está el botón "Emprendedores de prueba", que carga 24 ficticios con su QR.

## Reglas de la feria

- **Puerta:** un mismo QR solo entra una vez por día. El segundo intento muestra la pantalla roja con la hora y quién registró el primero.
- **Capacitación:** una sola sesión; el administrador define nombre, fecha y lugar. Cada emprendedor queda registrado una vez.
- **Bono de emprendimiento:** solo para quien participó en la feria (Día 1, Día 2 o ambos). Se registra entidad, tipo de cuenta, número (escrito dos veces y sin poder pegarlo), titular (nombre y apellido, solo letras), documento del titular y la autorización de datos (Ley 1581 de 2012). Nequi y Daviplata piden el celular. El pago se hace por transferencia después de la feria con el Excel.
- **Ventas:** dos cortes al día. Corte 1: lo vendido desde que abrió el stand. Corte 2 (cierre): lo vendido desde el corte 1. Un $0 cuenta como reportado; un corte vacío aparece como "sin reporte". El balance abre con la comparación Día 1 frente a Día 2.
- **Kits:** se puede registrar una entrega parcial y completarla después; cada registro exige foto, que se achica antes de subirla para que no tarde.

## Reportes

| Reporte | Hojas |
| --- | --- |
| Asistencia a la feria | Asistencia |
| Asistencia a capacitación | Asistieron (con nombre, fecha y lugar) y No asistieron |
| Kits | Kits, con el nombre de la foto. Además, un **informe en Word**: resumen, detalle de cada entrega, pendientes, emprendedores sin kit, observaciones y firmas |
| Bonos de emprendimiento | Cuentas para transferir y Asistentes sin cuenta |
| Ventas por sección | Resumen por día y corte, y una hoja por sección con cada emprendedor |

El administrador los descarga desde Reportes; el operador de capacitación, el de logística (Word), el de bonos y el financiero, desde su propia pantalla.

## Pendiente

- **Sin internet no se registra nada.** La app avisa con una franja roja, pero no guarda en cola para enviar después. Si en el lugar del evento la señal es mala, conviene un router o datos móviles dedicados.
- **Cámara real para el QR** y publicar la app con HTTPS (los celulares solo dejan usar la cámara en sitios seguros). El campo "Código del QR" ya funciona con lectores QR de mano (USB o Bluetooth).
