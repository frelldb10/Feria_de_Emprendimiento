import { formatDateOnly, formatForExport } from '../../lib/format';
import type { SheetSpec } from '../../lib/xlsx';
import type { FairState } from '../../store/types';
import { GROUP_SIZES, HEARD_FROM, optionLabel, originLabel, visitorStats } from '../../store/visitors';

/** Libro de Excel: resumen por procedencia, cada visitante, lugares más frecuentes y registros por día. */
export function buildVisitorSheets(state: FairState): SheetSpec[] {
  const list = [...state.visitors.list].sort((a, b) => a.at.localeCompare(b.at));
  const stats = visitorStats(list);
  const byDate = new Map<string, number>();
  for (const v of list) byDate.set(v.visitDate, (byDate.get(v.visitDate) ?? 0) + 1);
  const share = (count: number) => (stats.total > 0 ? count / stats.total : 0);
  const places = new Map<string, { place: string; origin: string; count: number }>();
  for (const v of list) {
    if (!v.originDetail) continue;
    const key = `${v.origin}|${v.originDetail.toLowerCase()}`;
    const entry = places.get(key) ?? { place: v.originDetail, origin: originLabel(v.origin), count: 0 };
    if (entry.place === entry.place.toLowerCase() && v.originDetail !== v.originDetail.toLowerCase()) entry.place = v.originDetail;
    entry.count += 1;
    places.set(key, entry);
  }
  const topPlaces = [...places.values()].sort((a, b) => b.count - a.count || a.place.localeCompare(b.place));

  return [
    {
      name: 'Resumen',
      title: 'Visitantes por procedencia',
      highlights: [
        { label: 'Visitantes registrados', value: stats.total },
        { label: 'Personas distintas', value: stats.people, tone: 'neutral' },
        { label: 'De fuera de Astrea', value: stats.outsideAstrea, tone: 'amarillo' },
      ],
      columns: [
        { header: 'Procedencia', width: 36 },
        { header: 'Visitantes', width: 14, center: true },
        { header: 'Porcentaje', percent: true, width: 14 },
      ],
      rows: stats.byOrigin.map((o) => [o.label, o.count, share(o.count)]),
      totals: ['Total', stats.total, stats.total > 0 ? 1 : 0],
    },
    {
      name: 'Visitantes',
      title: 'Cada persona que registró su visita',
      columns: [
        { header: 'N°', width: 6, center: true },
        { header: 'Fecha y hora', width: 17 },
        { header: 'Nombre', width: 30 },
        { header: 'Cédula', text: true, width: 13 },
        { header: 'Teléfono', text: true, width: 13 },
        { header: 'Procedencia', width: 24 },
        { header: 'Barrio, vereda o municipio', width: 26 },
        { header: 'Grupo', width: 11, center: true },
        { header: 'Cómo se enteró', width: 20 },
      ],
      rows: list.map((v, i) => [
        i + 1,
        formatForExport(v.at),
        v.fullName,
        v.document,
        v.phone,
        originLabel(v.origin),
        v.originDetail,
        optionLabel(GROUP_SIZES, v.groupSize),
        optionLabel(HEARD_FROM, v.heardFrom),
      ]),
      emptyText: 'Todavía no hay visitantes registrados.',
    },
    {
      name: 'Lugares',
      title: 'Barrios, veredas y municipios de donde vienen',
      columns: [
        { header: 'Lugar', width: 32 },
        { header: 'Procedencia', width: 28 },
        { header: 'Visitantes', width: 12, center: true },
        { header: 'Porcentaje', percent: true, width: 12 },
      ],
      rows: topPlaces.map((p) => [p.place, p.origin, p.count, share(p.count)]),
      emptyText: 'Todavía no hay lugares registrados.',
    },
    {
      name: 'Por día',
      title: 'Visitas registradas por día',
      columns: [
        { header: 'Fecha', width: 40 },
        { header: 'Visitantes', width: 14, center: true },
        { header: 'Porcentaje', percent: true, width: 14 },
      ],
      rows: [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => [formatDateOnly(date), count, share(count)]),
      totals: ['Total', stats.total, stats.total > 0 ? 1 : 0],
      emptyText: 'Todavía no hay visitantes registrados.',
    },
  ];
}
