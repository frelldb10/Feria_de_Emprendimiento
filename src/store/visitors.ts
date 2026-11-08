import { formatDateOnly, normalizeText } from '../lib/format';
import type { HeardFrom, Visitor, VisitorOrigin } from './types';

// Las listas deben coincidir con las restricciones de visitors en schema.sql.
export const VISITOR_ORIGINS: { id: VisitorOrigin; label: string; detailLabel: string; detailRequired: boolean }[] = [
  { id: 'astrea_urbano', label: 'Astrea, casco urbano', detailLabel: 'Barrio', detailRequired: false },
  { id: 'astrea_rural', label: 'Zona rural de Astrea', detailLabel: 'Corregimiento o vereda', detailRequired: true },
  { id: 'cesar', label: 'Otro municipio del Cesar', detailLabel: 'Municipio', detailRequired: true },
  { id: 'otro_departamento', label: 'Otro departamento', detailLabel: 'Municipio y departamento', detailRequired: true },
];

export interface Option<T> {
  id: T;
  label: string;
}

export const HEARD_FROM: Option<HeardFrom>[] = [
  { id: 'redes', label: 'Redes sociales' },
  { id: 'radio', label: 'Radio o perifoneo' },
  { id: 'conocidos', label: 'Familiares o amigos' },
  { id: 'de_paso', label: 'Pasaba por aquí' },
  { id: 'otro', label: 'Otro medio' },
];

const ORIGIN_LABEL = Object.fromEntries(VISITOR_ORIGINS.map((o) => [o.id, o.label])) as Record<VisitorOrigin, string>;

export function originLabel(origin: VisitorOrigin): string {
  return ORIGIN_LABEL[origin] ?? origin;
}

export function optionLabel<T>(options: Option<T>[], id: T | null): string {
  return id === null ? '' : (options.find((o) => o.id === id)?.label ?? String(id));
}

/**
 * Quien vive en Astrea (casco urbano o zona rural) está en su entorno habitual: es público local.
 * Quien viene de otro municipio es un visitante en el sentido de las estadísticas de turismo.
 */
export function isFromOutside(origin: VisitorOrigin | ''): boolean {
  return origin === 'cesar' || origin === 'otro_departamento';
}

/** Celular de 10 dígitos que empieza por 3, o fijo de 10 dígitos que empieza por 60. */
export function isColombianPhone(value: string): boolean {
  return /^(3\d{9}|60\d{8})$/.test(value);
}

/** "Zona rural de Astrea · Vereda El Hebrón" */
export function visitorPlace(visitor: Pick<Visitor, 'origin' | 'originDetail'>): string {
  return visitor.originDetail ? `${originLabel(visitor.origin)} · ${visitor.originDetail}` : originLabel(visitor.origin);
}

/** Fecha de hoy en Colombia, AAAA-MM-DD, para compararla con visitDate. */
export function todayInColombia(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

const hourFormat = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Bogota' });

/** Hora (0 a 23) del registro en Colombia. */
export function hourInColombia(iso: string): number {
  return Number(hourFormat.format(new Date(iso))) % 24;
}

export interface VisitorStats {
  total: number;
  today: number;
  outsideAstrea: number;
  byOrigin: { origin: VisitorOrigin; label: string; count: number }[];
  /** Los lugares que más se repiten en el detalle (barrio, vereda o municipio). */
  topPlaces: { place: string; count: number }[];
}

export function visitorStats(list: Visitor[]): VisitorStats {
  const today = todayInColombia();
  const places = new Map<string, { place: string; count: number }>();
  for (const v of list) {
    if (!v.originDetail) continue;
    const key = normalizeText(v.originDetail);
    const entry = places.get(key) ?? { place: v.originDetail, count: 0 };
    // "chimichagua" y "Chimichagua" son el mismo lugar: se muestra la forma escrita con mayúscula.
    if (entry.place === entry.place.toLowerCase() && v.originDetail !== v.originDetail.toLowerCase()) entry.place = v.originDetail;
    entry.count += 1;
    places.set(key, entry);
  }
  return {
    total: list.length,
    today: list.filter((v) => v.visitDate === today).length,
    outsideAstrea: list.filter((v) => isFromOutside(v.origin)).length,
    byOrigin: VISITOR_ORIGINS.map((o) => ({ origin: o.id, label: o.label, count: list.filter((v) => v.origin === o.id).length })),
    topPlaces: [...places.values()].sort((a, b) => b.count - a.count).slice(0, 5),
  };
}

export interface Tally {
  label: string;
  count: number;
}

export interface TourismStats {
  total: number;
  /** Residentes de Astrea (casco urbano y zona rural). */
  locals: number;
  /** Vienen de otro municipio: visitantes en el sentido de las estadísticas de turismo. */
  visitors: number;
  /** Otros municipios del Cesar. */
  regional: number;
  /** Otros departamentos. */
  national: number;
  /** Registros con las respuestas de la encuesta (los anteriores no las tienen). */
  answeredSurvey: number;
  byHeard: Tally[];
  /** Registros de cada día de la feria. */
  byDay: Tally[];
}

function tally<T>(options: Option<T>[], values: Array<T | null>): Tally[] {
  return options.map((o) => ({ label: o.label, count: values.filter((v) => v === o.id).length }));
}

/** Cifras de turismo con la clasificación de las Recomendaciones Internacionales (RIET 2008). */
export function tourismStats(list: Visitor[]): TourismStats {
  const regional = list.filter((v) => v.origin === 'cesar').length;
  const national = list.filter((v) => v.origin === 'otro_departamento').length;
  const dates = [...new Set(list.map((v) => v.visitDate))].sort();
  return {
    total: list.length,
    locals: list.length - regional - national,
    visitors: regional + national,
    regional,
    national,
    answeredSurvey: list.filter((v) => v.heardFrom !== null).length,
    byHeard: tally(HEARD_FROM, list.map((v) => v.heardFrom)),
    byDay: dates.map((date) => ({ label: formatDateOnly(date), count: list.filter((v) => v.visitDate === date).length })),
  };
}
