# Feria Astrea

Sistema web para la Feria de Emprendimiento de la Alcaldía Municipal de Astrea: control de ingreso con QR (Día 1 y Día 2), asistencia a la capacitación con QR, logística de stands y kits con foto, registro de cuentas para el bono de emprendimiento, ventas por sección, caja menor y reportes en Excel y Word.

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

## Publicar en Vercel

1. En https://vercel.com, entra con la cuenta de GitHub → **Add New… → Project** → importa el repositorio `Feria_de_Emprendimiento`.
2. Vercel reconoce que es Vite: deja el comando `npm run build` y la carpeta `dist`.
3. En **Environment Variables** agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` con los mismos valores de `.env.local` (se puede pegar el contenido del archivo completo y Vercel separa las dos).
4. **Deploy**. La app queda en una dirección `https://…vercel.app`, con HTTPS.

Cada vez que se sube un cambio a la rama `main` de GitHub, Vercel publica la versión nueva sola. `vercel.json` hace que las direcciones como `/caja-menor` abran la app al recargar la página.

## Usuarios y roles

Cada persona entra con usuario y contraseña. Las cuentas las crea el administrador en **Usuarios**: nombre, usuario, rol y contraseña inicial (hay un botón para generarla). Al crearla, la pantalla muestra los datos para entregárselos a la persona. Desde ahí el administrador cambia roles, desactiva o reactiva cuentas, restablece contraseñas y elimina cuentas; los operadores no pueden cambiar la suya. Eliminar una cuenta no borra lo que esa persona registró en la feria: queda con su nombre.

Por dentro, cada usuario es una cuenta de Supabase Auth con el correo `usuario@feria-astrea.local` (no se envían correos). Crear cuentas y cambiar contraseñas lo hace la función `admin-users` del servidor, que es la única que usa la clave de servicio.

Reglas: el administrador no puede cambiar su propio rol, desactivarse ni eliminar su propia cuenta, y siempre debe quedar al menos un administrador activo. Si el administrador cambia el rol de alguien o desactiva su cuenta, la sesión abierta de esa persona se entera al instante.

| Rol | Qué hace |
| --- | --- |
| Administrador | Ve y cambia todo: panel, carga masiva, emprendedores (agregar y eliminar), códigos QR, corrección de ingresos en puerta, datos de la capacitación, reportes, historial y usuarios |
| Observador | Ve lo mismo que el administrador (panel, todos los módulos, actividad, reportes y usuarios), pero no puede cambiar nada |
| Operador de Puerta | Registra el ingreso a la feria con QR, Día 1 y Día 2 |
| Operador de Capacitación | Registra la asistencia a la capacitación con el mismo QR |
| Operador de Logística | Stands (a quien lo necesita), energía, sillas, entrega de kits con foto e informe en Word |
| Operador de Bonos | Registra la cuenta bancaria para el bono de emprendimiento y descarga el Excel |
| Financiero | Registra las ventas de cada emprendedor en dos cortes al día y ve el balance por sección |
| Caja Menor | Registra los gastos de la caja menor de cada día, con su categoría, y descarga el reporte. El dinero de cada día lo asigna el administrador |

## Seguridad de los datos

Los permisos no dependen de la pantalla: los aplica la base de datos (Row Level Security).

- Las **cuentas bancarias** solo las pueden leer el administrador, el observador y el operador de bonos. Las **ventas**, solo el administrador, el observador y el financiero. La **caja menor**, solo el administrador, el observador y el rol de caja menor.
- Un **gasto de caja menor** no puede pasar del saldo del día: la base lo comprueba aunque registren dos celulares al mismo tiempo.
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
    scan/        Lector QR con la cámara, pantalla verde o roja y últimos registros (puerta y capacitación)
    shared/      Buscador de emprendedores y ficha resumen
  modules/
    auth/        Ingreso, sesión, cuentas y protección de rutas
    admin/       Métricas, carga masiva, emprendedores, QR, capacitación, usuarios y roles
    door/        Control de ingreso
    training/    Asistencia a la capacitación
    logistics/   Requerimientos del stand, entrega del kit e informe en Word
    bonuses/     Cuenta bancaria para el bono de emprendimiento
    finance/     Ventas por corte, balance por sección y comparación de días
    pettyCash/   Caja menor: dinero de cada día, gastos por categoría y reporte
    reports/     Los seis reportes en Excel
    history/     Historial de ferias: resumen guardado, comparación y Excel
  store/         Copia en pantalla de los datos, lectura del servidor, acciones y reglas
  lib/           Cliente de Supabase, Excel, fechas, fotos
```

## Carga masiva

En el panel de administración se arrastra un archivo de Excel (.xlsx), CSV o Word (.docx). El formato es el de la feria:

| N° | NOMBRE DEL EMPRENDIMIENTO | RESPONSABLE | TELÉFONO | ¿Necesita STAND? | ¿Necesita ENERGÍA? | ¿Cuántas SILLAS? |
| --- | --- | --- | --- | --- | --- | --- |

Las tres últimas pueden ir agrupadas bajo el título "¿QUÉ NECESITA PARA SU PUESTO?", con el encabezado en dos filas. Obligatorias: nombre del emprendimiento y responsable. En stand y energía va SÍ o NO; en sillas, el número. Los botones "Plantilla Excel" y "Plantilla Word" bajan el formato listo para llenar.

- **Columnas opcionales:** si el archivo trae `documento` o `seccion` (Gastronomía, Manualidades o Moda, Belleza y Estilo), también se leen. Sin sección, se intenta con el tipo de emprendimiento; si no se reconoce, se asigna después en la tabla de emprendedores.
- **Formulario de inscripción:** el Excel que exporta Google Forms también se lee tal cual: nombre completo, número de identificación, contacto, tipo de emprendimiento, "¿Cuenta con stand propio?" y "¿Requiere electricidad?".
- **Varias hojas o tablas:** en un Excel con varias hojas, o un Word con varias tablas, se usa la que tiene los encabezados. Si un Word no tiene tablas, cada línea es un emprendedor con los datos separados por tabulador, punto y coma o coma.
- **Dónde están los encabezados:** pueden estar debajo de un título; se buscan entre las primeras 10 filas.
- **Repetidos:** un emprendedor está repetido si tiene el mismo documento, o el mismo emprendimiento y responsable.
- **Formatos viejos:** `.xls` y `.doc` no se leen; hay que guardarlos como `.xlsx` o `.docx`.

Antes de cargar se muestra una vista previa que marca las filas con errores y los documentos repetidos; solo se cargan las filas válidas. Luego, "Generación masiva de QR" asigna un código a cada emprendedor nuevo (formato `FE-0001-K7QM`) y abre una hoja lista para imprimir. Ese mismo código sirve en la puerta y en la capacitación. Para ensayar está el botón "Emprendedores de prueba", que carga 24 ficticios con su QR.

## Reglas de la feria

- **Lectura del QR:** con la cámara del celular, en Puerta y Capacitación. La primera vez se toca "Encender cámara" y se da el permiso; después se enciende sola al entrar. Un QR que se queda frente a la cámara no se registra dos veces. Hay botón de linterna y de cambiar de cámara cuando el celular los tiene. La cámara solo funciona desde una dirección `https://` (la de Vercel, o `localhost` en el computador). El campo "Código del QR" sirve con lectores QR de mano (USB o Bluetooth).
- **Puerta:** un mismo QR solo entra una vez por día. El segundo intento muestra la pantalla roja con la hora y quién registró el primero. Solo el administrador ve, en Puerta, todos los ingresos del día con un botón para eliminar uno mal registrado, y el botón "Nuevo emprendedor" para quien llega sin estar inscrito: se crea con su QR y queda con el ingreso registrado.
- **Emprendedores:** el administrador también los agrega uno a uno o los elimina desde la tabla del panel. Eliminar uno borra con él sus ingresos, capacitación, logística, kit, cuenta del bono y ventas; antes de confirmar se muestra qué se borra.
- **Capacitación:** una sola sesión; el administrador define nombre, fecha y lugar. Cada emprendedor queda registrado una vez.
- **Bono de emprendimiento:** solo para quien participó en la feria (Día 1, Día 2 o ambos). Se registra entidad, tipo de cuenta, número (escrito dos veces y sin poder pegarlo), titular (nombre y apellido, solo letras), documento del titular y la autorización de datos (Ley 1581 de 2012). Nequi y Daviplata piden el celular. El pago se hace por transferencia después de la feria con el Excel.
- **Ventas:** dos cortes al día. Corte 1: lo vendido desde que abrió el stand. Corte 2 (cierre): lo vendido desde el corte 1. Un $0 cuenta como reportado; un corte vacío aparece como "sin reporte". El balance abre con la comparación Día 1 frente a Día 2.
- **Kits:** se puede registrar una entrega parcial y completarla después; cada registro exige foto, que se achica antes de subirla para que no tarde.
- **Caja menor:** el administrador escribe cuánto dinero se entrega para el Día 1 y para el Día 2; si entrega más durante el día, escribe el nuevo total. Cada gasto lleva valor, categoría (transporte, alimentación y refrigerios, papelería e impresiones, ferretería y materiales, aseo o imprevistos) y descripción; la hora y quién lo registró los pone el servidor. Cada día se lleva aparte: lo que sobra del Día 1 no pasa al Día 2. Un gasto mal registrado solo lo elimina el administrador, y queda anotado en la actividad.

## Historial de ferias

Al terminar una feria, el administrador entra a **Historial** y toca "Guardar feria actual". Se guardan las cifras (inscritos, ingresos por día, capacitación, kits, bonos, ventas por día y sección, caja menor) y la lista de emprendedores con sus resultados. No se guardan teléfonos, cuentas bancarias ni fotos: si se necesitan, se descargan antes los reportes.

Al guardar se puede marcar "Vaciar los datos para empezar la nueva feria"; la base guarda y vacía en un solo paso, así que si algo falla no se pierde nada. Las cuentas de usuario y el historial se mantienen.

La pantalla compara la feria en curso con las guardadas, cifra por cifra, con el cambio frente a la anterior, y cuenta cuántos emprendedores ya habían participado. Cada feria guardada se descarga en Excel. El observador ve el historial; solo el administrador guarda y elimina.

## Reportes

| Reporte | Hojas |
| --- | --- |
| Asistencia a la feria | Asistencia |
| Asistencia a capacitación | Asistieron (con nombre, fecha y lugar) y No asistieron |
| Kits | Kits, con el nombre de la foto. Además, un **informe en Word**: resumen, detalle de cada entrega, pendientes, emprendedores sin kit, observaciones y firmas |
| Bonos de emprendimiento | Cuentas para transferir y Asistentes sin cuenta |
| Ventas por sección | Resumen por día y corte, y una hoja por sección con cada emprendedor |
| Caja menor | Resumen (asignado, gastado y saldo por día), Gastos (cada gasto con fecha, categoría, descripción, valor y quién lo registró) y Por categoría |

El administrador los descarga desde Reportes; el operador de capacitación, el de logística (Word), el de bonos, el financiero y el de caja menor, desde su propia pantalla.

## Pendiente

- **Sin internet no se registra nada.** La app avisa con una franja roja, pero no guarda en cola para enviar después. Si en el lugar del evento la señal es mala, conviene un router o datos móviles dedicados.
