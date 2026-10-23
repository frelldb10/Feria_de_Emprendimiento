const timeFormat = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' });
const dateTimeFormat = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

const longDateFormat = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** "2026-11-14" (valor de un input date) → "sábado, 14 de noviembre de 2026". */
export function formatDateOnly(value: string): string {
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return value;
  return longDateFormat.format(new Date(y, m - 1, d));
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Fecha local legible por Excel: 2026-10-22 15:04 */
export function formatForExport(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Marca de tiempo para nombres de archivo: 20261022-150412 */
export function fileStamp(date = new Date()): string {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

/** Minúsculas y sin tildes, para comparar textos en búsquedas y encabezados. */
export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

const moneyFormat = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const groupFormat = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

/** $ 1.250.000 */
export function formatMoney(value: number): string {
  return moneyFormat.format(value);
}

/** 1.250.000 (para mostrar dentro de un campo que ya tiene el signo $ al lado). */
export function formatThousands(value: number): string {
  return groupFormat.format(value);
}

/** ****4521: muestra solo los últimos dígitos de una cuenta. */
export function maskAccount(number: string): string {
  return number.length <= 4 ? number : `••••${number.slice(-4)}`;
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
