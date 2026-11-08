import { normalizeText } from '../lib/format';
import type { Visitor, VisitorOrigin } from './types';

// Deben coincidir con la restricción "origin" de visitors en schema.sql.
export const VISITOR_ORIGINS: { id: VisitorOrigin; label: string; detailLabel: string; detailRequired: boolean }[] = [
  { id: 'astrea_urbano', label: 'Astrea, casco urbano', detailLabel: 'Barrio', detailRequired: false },
  { id: 'astrea_rural', label: 'Zona rural de Astrea', detailLabel: 'Corregimiento o vereda', detailRequired: true },
  { id: 'cesar', label: 'Otro municipio del Cesar', detailLabel: 'Municipio', detailRequired: true },
  { id: 'otro_departamento', label: 'Otro departamento', detailLabel: 'Municipio y departamento', detailRequired: true },
];

const ORIGIN_LABEL = Object.fromEntries(VISITOR_ORIGINS.map((o) => [o.id, o.label])) as Record<VisitorOrigin, string>;

export function originLabel(origin: VisitorOrigin): string {
  return ORIGIN_LABEL[origin] ?? origin;
}

/** "Zona rural de Astrea · Vereda El Hebrón" */
export function visitorPlace(visitor: Pick<Visitor, 'origin' | 'originDetail'>): string {
  return visitor.originDetail ? `${originLabel(visitor.origin)} · ${visitor.originDetail}` : originLabel(visitor.origin);
}

/** Fecha de hoy en Colombia, AAAA-MM-DD, para compararla con visitDate. */
export function todayInColombia(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

export interface VisitorStats {
  total: number;
  today: number;
  /** Personas distintas (una cédula puede volver otro día). */
  people: number;
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
    people: new Set(list.map((v) => v.document)).size,
    outsideAstrea: list.filter((v) => v.origin === 'cesar' || v.origin === 'otro_departamento').length,
    byOrigin: VISITOR_ORIGINS.map((o) => ({ origin: o.id, label: o.label, count: list.filter((v) => v.origin === o.id).length })),
    topPlaces: [...places.values()].sort((a, b) => b.count - a.count).slice(0, 5),
  };
}
