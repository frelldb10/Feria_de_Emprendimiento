import { formatForExport, normalizeText } from '../../lib/format';
import type { SheetSpec } from '../../lib/xlsx';
import { pettyCashDay, totalsByCategory } from '../../store/pettyCash';
import { sectionLabel } from '../../store/sections';
import { computeMetrics, indexAttendance, indexKits, isKitComplete } from '../../store/selectors';
import { EVENT_DAYS, type EditionEntrepreneur, type EditionSummary, type FairEdition, type FairState } from '../../store/types';
import { buildBalance, salesByEntrepreneur } from '../finance/balance';

/** Resumen y lista de resultados de la feria en curso, tal como se guardan en el historial. */
export function buildEdition(state: FairState): { summary: EditionSummary; entrepreneurs: EditionEntrepreneur[] } {
  const metrics = computeMetrics(state);
  const attendance = indexAttendance(state.attendance);
  const kits = indexKits(state.kits);
  const trained = new Set(state.training.attendance.map((a) => a.entrepreneurId));
  const withBonus = new Set(state.bonuses.map((b) => b.entrepreneurId));
  const sales = new Map(salesByEntrepreneur(state).map((row) => [row.entrepreneur.id, row]));
  const balance = buildBalance(state, 'all');
  const days = EVENT_DAYS.map((day) => pettyCashDay(state.pettyCash, day));

  const summary: EditionSummary = {
    version: 1,
    training: { title: state.training.info.title, date: state.training.info.date, attendees: metrics.trainingAttendees },
    entrepreneurs: metrics.entrepreneurs,
    attendance: {
      day1: metrics.attendeesByDay[1],
      day2: metrics.attendeesByDay[2],
      anyDay: metrics.attendees,
      bothDays: [...attendance.values()].filter((byDay) => byDay[1] && byDay[2]).length,
    },
    kits: { complete: metrics.kitsComplete, partial: metrics.kitsPartial },
    bonusAccounts: metrics.bonusAccounts,
    sales: { day1: metrics.salesByDay[1], day2: metrics.salesByDay[2], total: metrics.salesTotal, reporters: balance.overall.reporters },
    bySection: balance.sections.map((s) => ({ label: s.label, entrepreneurs: s.members, sales: s.total })),
    pettyCash: {
      assigned: days.reduce((sum, d) => sum + d.assigned, 0),
      spent: days.reduce((sum, d) => sum + d.spent, 0),
      byCategory: totalsByCategory(state.pettyCash.expenses)
        .filter((c) => c.count > 0)
        .map((c) => ({ label: c.label, total: c.total })),
    },
  };

  const entrepreneurs = state.entrepreneurs.map((e): EditionEntrepreneur => {
    const kit = kits.get(e.id);
    const row = sales.get(e.id);
    return {
      businessName: e.businessName,
      ownerName: e.ownerName,
      document: e.document,
      section: sectionLabel(e.section),
      days: EVENT_DAYS.filter((day) => attendance.get(e.id)?.[day]),
      training: trained.has(e.id),
      kit: isKitComplete(kit) ? 'completo' : kit ? 'parcial' : 'pendiente',
      bonus: withBonus.has(e.id),
      sales: { day1: row?.dayTotal[1] ?? 0, day2: row?.dayTotal[2] ?? 0 },
    };
  });

  return { summary, entrepreneurs };
}

/* ---------- Comparación entre ferias ---------- */

/** Una columna de la comparación: la feria en curso o una guardada. */
export interface EditionColumn {
  key: string;
  name: string;
  detail: string;
  summary: EditionSummary;
  entrepreneurs: EditionEntrepreneur[];
}

export interface ComparisonRow {
  label: string;
  value: (column: EditionColumn, older: EditionColumn | undefined) => number | null;
  money?: boolean;
  /** Las filas de grupo solo llevan el título. */
  group?: boolean;
}

const average = (total: number, count: number) => (count > 0 ? Math.round(total / count) : 0);

/** Mismo documento, o mismo emprendimiento y responsable cuando no hay documento. */
function personKeys(e: EditionEntrepreneur): string[] {
  const keys = [`n:${normalizeText(e.businessName)}|${normalizeText(e.ownerName)}`];
  if (e.document) keys.push(`d:${e.document}`);
  return keys;
}

/** Cuántos emprendedores de una feria ya habían participado en la anterior. */
export function returningCount(current: EditionEntrepreneur[], previous: EditionEntrepreneur[]): number {
  const seen = new Set(previous.flatMap(personKeys));
  return current.filter((e) => personKeys(e).some((key) => seen.has(key))).length;
}

export const COMPARISON_ROWS: ComparisonRow[] = [
  { label: 'Participación', value: () => null, group: true },
  { label: 'Emprendedores inscritos', value: (c) => c.summary.entrepreneurs },
  { label: 'Asistieron (algún día)', value: (c) => c.summary.attendance.anyDay },
  { label: 'Ingresos Día 1', value: (c) => c.summary.attendance.day1 },
  { label: 'Ingresos Día 2', value: (c) => c.summary.attendance.day2 },
  { label: 'Asistieron los dos días', value: (c) => c.summary.attendance.bothDays },
  { label: 'Ya habían participado en la feria anterior', value: (c, older) => (older ? returningCount(c.entrepreneurs, older.entrepreneurs) : null) },
  { label: 'Capacitación y entregas', value: () => null, group: true },
  { label: 'Asistieron a la capacitación', value: (c) => c.summary.training.attendees },
  { label: 'Kits completos', value: (c) => c.summary.kits.complete },
  { label: 'Cuentas para el bono', value: (c) => c.summary.bonusAccounts },
  { label: 'Ventas', value: () => null, group: true },
  { label: 'Ventas totales', value: (c) => c.summary.sales.total, money: true },
  { label: 'Ventas Día 1', value: (c) => c.summary.sales.day1, money: true },
  { label: 'Ventas Día 2', value: (c) => c.summary.sales.day2, money: true },
  { label: 'Promedio por emprendedor que reportó', value: (c) => average(c.summary.sales.total, c.summary.sales.reporters), money: true },
  ...['Gastronomía', 'Manualidades', 'Moda, Belleza y Estilo'].map(
    (label): ComparisonRow => ({
      label: `Ventas · ${label}`,
      value: (c) => c.summary.bySection.find((s) => s.label === label)?.sales ?? 0,
      money: true,
    }),
  ),
  { label: 'Caja menor', value: () => null, group: true },
  { label: 'Dinero asignado', value: (c) => c.summary.pettyCash.assigned, money: true },
  { label: 'Dinero gastado', value: (c) => c.summary.pettyCash.spent, money: true },
];

export function editionColumn(edition: FairEdition): EditionColumn {
  return {
    key: edition.id,
    name: edition.name,
    detail: `Guardada el ${formatForExport(edition.at).slice(0, 10)}`,
    summary: edition.summary,
    entrepreneurs: edition.entrepreneurs,
  };
}

/* ---------- Excel de una feria guardada ---------- */

const yesNo = (value: boolean) => (value ? 'Sí' : 'No');

export function buildEditionSheets(edition: FairEdition): SheetSpec[] {
  const column = editionColumn(edition);
  const rows = COMPARISON_ROWS.filter((r) => !r.group && r.label !== 'Ya habían participado en la feria anterior');
  return [
    {
      name: 'Resumen',
      preface: [edition.name, `Guardada: ${formatForExport(edition.at)} por ${edition.operator}`, `Capacitación: ${edition.summary.training.title}`],
      columns: [
        { header: 'Dato', width: 40 },
        { header: 'Valor', width: 18 },
      ],
      rows: rows.map((r) => [r.label, r.value(column, undefined) ?? '']),
    },
    {
      name: 'Emprendedores',
      columns: [
        { header: 'Documento', text: true, width: 14 },
        { header: 'Emprendedor', width: 28 },
        { header: 'Emprendimiento', width: 30 },
        { header: 'Sección', width: 22 },
        { header: 'Días asistidos', width: 14 },
        { header: 'Capacitación', width: 13 },
        { header: 'Kit', width: 11 },
        { header: 'Cuenta para el bono', width: 18 },
        { header: 'Ventas Día 1', money: true, width: 15 },
        { header: 'Ventas Día 2', money: true, width: 15 },
        { header: 'Ventas total', money: true, width: 15 },
      ],
      rows: edition.entrepreneurs.map((e) => [
        e.document,
        e.ownerName,
        e.businessName,
        e.section,
        e.days.map((d) => `Día ${d}`).join(' y ') || 'No asistió',
        yesNo(e.training),
        e.kit === 'completo' ? 'Completo' : e.kit === 'parcial' ? 'Parcial' : 'Pendiente',
        yesNo(e.bonus),
        e.sales.day1,
        e.sales.day2,
        e.sales.day1 + e.sales.day2,
      ]),
    },
  ];
}
