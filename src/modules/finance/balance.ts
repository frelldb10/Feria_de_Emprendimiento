import { formatForExport } from '../../lib/format';
import type { SheetSpec } from '../../lib/xlsx';
import { SECTIONS, sectionLabel } from '../../store/sections';
import { EVENT_DAYS, SALE_CUTS, type Entrepreneur, type EventDay, type FairState, type SaleCut, type SectionId } from '../../store/types';

export type DayFilter = EventDay | 'all';

export interface SectionBalance {
  section: SectionId | null;
  label: string;
  cuts: Record<SaleCut, number>;
  total: number;
  /** Emprendedores con al menos un valor registrado en el periodo. */
  reporters: number;
  members: number;
}

const emptyCuts = (): Record<SaleCut, number> => ({ 1: 0, 2: 0 });

/** Totales por sección (y del periodo) para un día o para toda la feria. */
export function buildBalance(state: FairState, filter: DayFilter): { sections: SectionBalance[]; overall: SectionBalance } {
  const sectionOf = new Map(state.entrepreneurs.map((e) => [e.id, e.section]));
  const keys: Array<SectionId | null> = [...SECTIONS.map((s) => s.id), null];
  const buckets = new Map(
    keys.map((key) => [
      key,
      {
        section: key,
        label: sectionLabel(key),
        cuts: emptyCuts(),
        total: 0,
        reporters: 0,
        members: state.entrepreneurs.filter((e) => e.section === key).length,
      } satisfies SectionBalance,
    ]),
  );
  const reporters = new Map(keys.map((key) => [key, new Set<string>()]));

  for (const sale of state.sales) {
    if (filter !== 'all' && sale.day !== filter) continue;
    const key = sectionOf.get(sale.entrepreneurId) ?? null;
    const bucket = buckets.get(key)!;
    bucket.cuts[sale.cut] += sale.amount;
    bucket.total += sale.amount;
    reporters.get(key)!.add(sale.entrepreneurId);
  }

  const sections = keys
    .map((key) => ({ ...buckets.get(key)!, reporters: reporters.get(key)!.size }))
    // "Sin sección" solo aparece si hay alguien sin asignar.
    .filter((b) => b.section !== null || b.members > 0 || b.total > 0);

  const overall: SectionBalance = {
    section: null,
    label: 'Total',
    cuts: emptyCuts(),
    total: 0,
    reporters: sections.reduce((n, s) => n + s.reporters, 0),
    members: state.entrepreneurs.length,
  };
  for (const s of sections) {
    for (const cut of SALE_CUTS) overall.cuts[cut] += s.cuts[cut];
    overall.total += s.total;
  }
  return { sections, overall };
}

export interface EntrepreneurSales {
  entrepreneur: Entrepreneur;
  /** null cuando ese corte no se ha registrado (distinto de haber vendido $0). */
  cuts: Record<EventDay, Record<SaleCut, number | null>>;
  dayTotal: Record<EventDay, number>;
  total: number;
}

export function salesByEntrepreneur(state: FairState): EntrepreneurSales[] {
  const rows = new Map<string, EntrepreneurSales>(
    state.entrepreneurs.map((entrepreneur) => [
      entrepreneur.id,
      {
        entrepreneur,
        cuts: { 1: { 1: null, 2: null }, 2: { 1: null, 2: null } },
        dayTotal: { 1: 0, 2: 0 },
        total: 0,
      },
    ]),
  );
  for (const sale of state.sales) {
    const row = rows.get(sale.entrepreneurId);
    if (!row) continue;
    row.cuts[sale.day][sale.cut] = sale.amount;
    row.dayTotal[sale.day] += sale.amount;
    row.total += sale.amount;
  }
  return [...rows.values()];
}

const average = (s: SectionBalance) => (s.reporters > 0 ? Math.round(s.total / s.reporters) : 0);

/** Libro de Excel: hoja de resumen y una hoja por sección con cada emprendedor. */
export function buildSalesSheets(state: FairState): SheetSpec[] {
  const summaryRows: Array<Array<string | number>> = [];
  const boldRows: number[] = [];
  const periods: Array<[DayFilter, string]> = [[1, 'Día 1'], [2, 'Día 2'], ['all', 'Ambos días']];
  for (const [filter, label] of periods) {
    const { sections, overall } = buildBalance(state, filter);
    const row = (name: string, s: SectionBalance) => [
      label,
      name,
      ...SALE_CUTS.map((cut) => s.cuts[cut]),
      s.total,
      `${s.reporters} de ${s.members}`,
      average(s),
    ];
    for (const s of sections) summaryRows.push(row(s.label, s));
    boldRows.push(summaryRows.length);
    summaryRows.push(row('Total', overall));
  }

  const summary: SheetSpec = {
    name: 'Resumen',
    preface: ['Balance de ventas por sección', `Generado: ${formatForExport(new Date().toISOString())}`],
    columns: [
      { header: 'Periodo', width: 16 },
      { header: 'Sección', width: 26 },
      ...SALE_CUTS.map((cut) => ({ header: `Corte ${cut}`, money: true, width: 14 })),
      { header: 'Total', money: true, width: 16 },
      { header: 'Reportaron', width: 13 },
      { header: 'Promedio por emprendedor', money: true, width: 24 },
    ],
    rows: summaryRows,
    boldRows,
  };

  const detail = salesByEntrepreneur(state);
  const sectionKeys: Array<SectionId | null> = [...SECTIONS.map((s) => s.id), null];
  const cutCells = (values: Record<SaleCut, number | null>) => SALE_CUTS.map((cut) => values[cut] ?? '');

  const sectionSheets = sectionKeys
    .map((key): SheetSpec | null => {
      const rows = detail.filter((d) => d.entrepreneur.section === key).sort((a, b) => b.total - a.total);
      if (key === null && rows.length === 0) return null;
      const sum = (pick: (d: EntrepreneurSales) => number) => rows.reduce((n, d) => n + pick(d), 0);
      const sumCut = (day: EventDay, cut: SaleCut) => sum((d) => d.cuts[day][cut] ?? 0);
      return {
        name: sectionLabel(key),
        columns: [
          { header: 'Stand', width: 8 },
          { header: 'Documento', text: true, width: 14 },
          { header: 'Emprendedor', width: 28 },
          { header: 'Emprendimiento', width: 30 },
          ...EVENT_DAYS.flatMap((day) => [
            ...SALE_CUTS.map((cut) => ({ header: `Día ${day} · Corte ${cut}`, money: true, width: 15 })),
            { header: `Total Día ${day}`, money: true, width: 15 },
          ]),
          { header: 'Total feria', money: true, width: 15 },
        ],
        rows: rows.map((d) => [
          d.entrepreneur.stand,
          d.entrepreneur.document,
          d.entrepreneur.ownerName,
          d.entrepreneur.businessName,
          ...EVENT_DAYS.flatMap((day) => [...cutCells(d.cuts[day]), d.dayTotal[day]]),
          d.total,
        ]),
        totals: [
          '',
          '',
          'Total',
          `${rows.length} emprendedores`,
          ...EVENT_DAYS.flatMap((day) => [...SALE_CUTS.map((cut) => sumCut(day, cut)), sum((d) => d.dayTotal[day])]),
          sum((d) => d.total),
        ],
      };
    })
    .filter((sheet): sheet is SheetSpec => sheet !== null);

  return [summary, ...sectionSheets];
}
