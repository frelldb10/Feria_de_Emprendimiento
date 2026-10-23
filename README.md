# Feria Astrea

Sistema web para la Feria de Emprendimiento de la Alcaldía Municipal de Astrea: control de ingreso con QR (Día 1 y Día 2), asistencia a la capacitación con QR, logística de stands y kits, registro de cuentas para el bono de emprendimiento, ventas por sección y reportes en Excel.

Hecho con React 19, Vite, TypeScript, Tailwind CSS 4 y Lucide.

## Cómo ejecutarlo

```bash
npm install
cp .env.example .env.local   # y llena los datos del primer administrador
npm run dev
```

Abre http://localhost:5173. Para probarlo en un celular conectado a la misma red Wi-Fi:

```bash
npm run dev -- --host
```

y abre en el celular la dirección `Network` que muestra la terminal (por ejemplo `http://192.168.1.20:5173`).

Para generar la versión de producción: `npm run build` (queda en `dist/`).

## Usuarios y roles

Cada persona entra con usuario y contraseña. Las cuentas las crea el administrador en **Usuarios** (menú lateral): nombre, usuario, rol y contraseña inicial (hay un botón para generarla). Al crearla, la pantalla muestra los datos para entregárselos a la persona. Desde ahí mismo el administrador cambia el rol, desactiva o reactiva cuentas y restablece contraseñas; los operadores no pueden cambiar la suya.

**Primer administrador.** Sus datos no están en el repositorio. Antes de iniciar la app, copia `.env.example` con el nombre `.env.local` y escribe ahí el nombre, el usuario y una contraseña inicial (mínimo 6 caracteres). Al abrir la app por primera vez se crea esa cuenta; luego conviene cambiar la contraseña desde Usuarios. `.env.local` no se sube a GitHub.

Reglas: el administrador no puede cambiar su propio rol ni desactivarse, y siempre debe quedar al menos un administrador activo. Las contraseñas se guardan cifradas (PBKDF2), nunca en texto plano.

| Rol | Qué hace |
| --- | --- |
| Administrador | Ve todo: panel, carga masiva, códigos QR, datos de la capacitación, reportes y usuarios |
| Operador de Puerta | Registra el ingreso a la feria con QR, Día 1 y Día 2 |
| Operador de Capacitación | Registra la asistencia a la capacitación con el mismo QR |
| Operador de Logística | Stands, energía, sillas, entrega de kits con foto e informe en Word |
| Operador de Bonos | Registra la cuenta bancaria para el bono de emprendimiento y descarga el Excel |
| Financiero | Registra las ventas de cada emprendedor en dos cortes al día y ve el balance por sección |

## Estructura

```
src/
  components/
    ui/          Botón, tarjeta, modal, alertas de estado, pestañas, filtros, campos, foto
    brand/       Logos y la franja verde, roja y amarilla
    layout/      Barra superior, menú lateral del administrador, menú de cuenta
    scan/        Lector QR, pantalla verde o roja y últimos registros (puerta y capacitación)
    shared/      Buscador de emprendedores y ficha resumen
  modules/
    auth/        Login con usuario y contraseña, cuentas, sesión y protección de rutas
    admin/       Métricas, carga masiva, tabla de emprendedores, QR, capacitación, usuarios y roles
    door/        Control de ingreso
    training/    Asistencia a la capacitación
    logistics/   Requerimientos del stand, entrega del kit e informe en Word
    bonuses/     Cuenta bancaria para el bono de emprendimiento
    finance/     Ventas por corte y balance por sección
    reports/     Los cinco reportes en Excel
  store/         Datos, secciones, reglas y acciones
  lib/           Excel, fechas, nombres de fotos
```

## Carga masiva

En el panel de administración se arrastra un archivo de Excel (.xlsx) o CSV. Las columnas obligatorias son `documento`, `nombre` y `emprendimiento`. Las opcionales son `seccion` (Gastronomía, Manualidades o Moda, Belleza y Estilo), `telefono`, `categoria`, `stand`, `energia` (si/no) y `sillas`. El botón "Descargar plantilla" baja un Excel de ejemplo.

Antes de cargar se muestra una vista previa que marca las filas con errores (incluida una sección que no se reconoce) y los documentos repetidos; solo se cargan las filas válidas. La sección también se puede asignar o cambiar después desde la tabla de emprendedores. Luego, "Generación masiva de QR" asigna un código a cada emprendedor nuevo (formato `FE-0001-K7QM`) y abre una hoja lista para imprimir. Ese mismo código sirve en la puerta y en la capacitación.

## Reglas

- **Puerta:** un mismo QR solo entra una vez por día. El segundo intento muestra la pantalla roja con la hora y el operador del primer ingreso.
- **Capacitación:** es una sola sesión. El administrador define el nombre, la fecha y el lugar, que salen en la pantalla del operador y en el reporte. Cada emprendedor queda registrado una vez.
- **Bono de emprendimiento:** solo para quien participó en la feria (Día 1, Día 2 o ambos). Se registra entidad, tipo de cuenta, número (escrito dos veces y sin poder pegarlo), titular (nombre y apellido, solo letras), documento del titular y la autorización de tratamiento de datos (Ley 1581 de 2012). Si la entidad es "Otro", su nombre solo admite letras. Nequi y Daviplata piden el celular. El pago se hace por transferencia después de la feria con el Excel. Si un dato quedó mal, se puede corregir.
- **Ventas:** se recogen dos veces al día. Corte 1: lo vendido desde que abrió el stand. Corte 2 (cierre): lo vendido desde el corte 1. El sistema suma el total del día. Un $0 cuenta como reportado; un corte vacío aparece como "sin reporte". El balance abre con la comparación Día 1 frente a Día 2, por sección y por corte.
- **Kits:** se puede registrar una entrega parcial y completarla después; cada registro exige foto.

## Reportes

Todos salen en Excel (.xlsx):

| Reporte | Hojas |
| --- | --- |
| Asistencia a la feria | Asistencia |
| Asistencia a capacitación | Asistieron (con nombre, fecha y lugar) y No asistieron |
| Kits | Kits, con el nombre de la foto de evidencia. Además, un **informe en Word** (hoja horizontal, con los logos): resumen, detalle de cada entrega, elementos pendientes de las entregas parciales, emprendedores sin kit, observaciones y firmas |
| Bonos de emprendimiento | Cuentas para transferir y Asistentes sin cuenta |
| Ventas por sección | Resumen por día y corte, y una hoja por sección con cada emprendedor |

El administrador los descarga desde Reportes. Además, el operador de capacitación, el de logística (Word), el de bonos y el financiero pueden descargar el suyo desde su propia pantalla.

## Lo que falta para producción

Esta versión funciona completa en un solo navegador. Antes de usarla en la feria con varios equipos hay que:

1. **Conectar un backend** (Supabase). Hoy los datos y las cuentas de usuario se guardan en el navegador (`localStorage`), así que dos celulares no ven los registros del otro y una cuenta creada en el computador del administrador no existe en el celular de la puerta. Con números de cuenta bancaria esto es todavía más importante: no deben quedar guardados en el navegador de un celular. Las escrituras pasan por `src/store/actions.ts` y las cuentas por `src/modules/auth/userStore.ts`; esos son los dos archivos que se conectan.
2. **Subir las fotos de los kits.** Hoy reciben un nombre fijo que sale en el reporte, pero el archivo no se envía a ningún almacenamiento. Con las fotos guardadas, el informe en Word también podría incluirlas.
3. **Cámara real para el QR** y publicar la app con HTTPS (los celulares solo dejan usar la cámara en sitios seguros). El campo "Código del QR" ya funciona con lectores QR de mano (USB o Bluetooth).
