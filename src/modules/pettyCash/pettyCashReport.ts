import { formatForExport } from '../../lib/format';
import type { SheetSpec } from '../../lib/xlsx';
import { categoryLabel, pettyCashDay, totalsByCategory } from '../../store/pettyCash';
import { EVENT_DAYS, type FairState } from '../../store/types';

/** Libro de Excel: resumen por día, cada gasto y totales por categoría. */
export function buildPettyCashSheets(state: FairState): SheetSpec[] {
  const { pettyCash } = state;
  const days = EVENT_DAYS.map((day) => pettyCashDay(pettyCash, day));
  const sum = (values: number[]) => values.reduce((total, n) => total + n, 0);
  const assigned = sum(days.map((d) => d.assigned));
  const spent = sum(days.map((d) => d.spent));
  const balance = assigned - spent;

  const summary: SheetSpec = {
    name: 'Resumen por día',
    title: 'Dinero asignado y gastado por día',
    highlights: [
      { label: 'Dinero asignado', value: assigned, money: true, tone: 'neutral' },
      { label: 'Dinero gastado', value: spent, money: true, tone: 'amarillo' },
      { label: 'Saldo', value: balance, money: true, tone: balance < 0 ? 'rojo' : 'verde' },
      { label: 'Gastos registrados', value: pettyCash.expenses.length, tone: 'neutral' },
    ],
    columns: [
      { header: 'Día', width: 10, center: true },
      { header: 'Asignado', money: true, width: 16 },
      { header: 'Gastado', money: true, width: 16 },
      { header: 'Saldo', money: true, width: 16 },
      { header: 'Gastos', width: 10, center: true },
      { header: 'Asignado por', width: 26 },
      { header: 'Fecha de asignación', width: 18 },
    ],
    rows: days.map((d) => [
      `Día ${d.day}`,
      d.assigned,
      d.spent,
      d.balance,
      d.expenses.length,
      d.fund?.operator ?? 'Sin asignar',
      d.fund ? formatForExport(d.fund.at) : '',
    ]),
    totals: ['Total', assigned, spent, balance, pettyCash.expenses.length, '', ''],
  };

  const expenses = [...pettyCash.expenses].sort((a, b) => a.day - b.day || a.at.localeCompare(b.at));
  const detail: SheetSpec = {
    name: 'Gastos',
    title: 'Detalle de cada gasto',
    columns: [
      { header: 'N°', width: 6, center: true },
      { header: 'Día', width: 8, center: true },
      { header: 'Fecha y hora', width: 17 },
      { header: 'Categoría', width: 26 },
      { header: 'Descripción', width: 46 },
      { header: 'Valor', money: true, width: 15 },
      { header: 'Registrado por', width: 24 },
    ],
    rows: expenses.map((e, i) => [i + 1, `Día ${e.day}`, formatForExport(e.at), categoryLabel(e.category), e.description, e.amount, e.operator]),
    totals: ['', '', '', '', 'Total', spent, ''],
    emptyText: 'Todavía no se ha registrado ningún gasto.',
  };

  const perDay = days.map((d) => totalsByCategory(d.expenses));
  const overall = totalsByCategory(pettyCash.expenses);
  const byCategory: SheetSpec = {
    name: 'Por categoría',
    title: 'Gastos por categoría',
    columns: [
      { header: 'Categoría', width: 28 },
      ...EVENT_DAYS.map((day) => ({ header: `Día ${day}`, money: true, width: 15 })),
      { header: 'Total', money: true, width: 15 },
      { header: '% del gasto', percent: true, width: 12 },
      { header: 'Gastos', width: 10, center: true },
    ],
    rows: overall.map((c, i) => [c.label, ...perDay.map((totals) => totals[i].total), c.total, spent > 0 ? c.total / spent : 0, c.count]),
    totals: ['Total', ...days.map((d) => d.spent), spent, spent > 0 ? 1 : 0, expenses.length],
  };

  return [summary, detail, byCategory];
}
