import { formatForExport } from '../../lib/format';
import type { SheetSpec } from '../../lib/xlsx';
import { categoryLabel, pettyCashDay, totalsByCategory } from '../../store/pettyCash';
import { EVENT_DAYS, type FairState } from '../../store/types';

/** Libro de Excel: resumen por día, cada gasto y totales por categoría. */
export function buildPettyCashSheets(state: FairState): SheetSpec[] {
  const { pettyCash } = state;
  const days = EVENT_DAYS.map((day) => pettyCashDay(pettyCash, day));
  const sum = (values: number[]) => values.reduce((total, n) => total + n, 0);

  const summary: SheetSpec = {
    name: 'Resumen',
    preface: ['Caja menor de la Feria de Emprendimiento', `Generado: ${formatForExport(new Date().toISOString())}`],
    columns: [
      { header: 'Día', width: 10 },
      { header: 'Asignado', money: true, width: 16 },
      { header: 'Gastado', money: true, width: 16 },
      { header: 'Saldo', money: true, width: 16 },
      { header: 'Gastos', width: 10 },
      { header: 'Asignado por', width: 26 },
      { header: 'Fecha de asignación', width: 20 },
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
    totals: [
      'Total',
      sum(days.map((d) => d.assigned)),
      sum(days.map((d) => d.spent)),
      sum(days.map((d) => d.balance)),
      sum(days.map((d) => d.expenses.length)),
      '',
      '',
    ],
  };

  const expenses = [...pettyCash.expenses].sort((a, b) => a.day - b.day || a.at.localeCompare(b.at));
  const detail: SheetSpec = {
    name: 'Gastos',
    columns: [
      { header: 'N°', width: 6 },
      { header: 'Día', width: 8 },
      { header: 'Fecha y hora', width: 18 },
      { header: 'Categoría', width: 28 },
      { header: 'Descripción', width: 48 },
      { header: 'Valor', money: true, width: 16 },
      { header: 'Registrado por', width: 26 },
    ],
    rows: expenses.map((e, i) => [
      i + 1,
      `Día ${e.day}`,
      formatForExport(e.at),
      categoryLabel(e.category),
      e.description,
      e.amount,
      e.operator,
    ]),
    totals: ['', '', '', '', 'Total', sum(expenses.map((e) => e.amount)), ''],
  };

  const perDay = days.map((d) => totalsByCategory(d.expenses));
  const overall = totalsByCategory(pettyCash.expenses);
  const byCategory: SheetSpec = {
    name: 'Por categoría',
    columns: [
      { header: 'Categoría', width: 28 },
      ...EVENT_DAYS.map((day) => ({ header: `Día ${day}`, money: true, width: 16 })),
      { header: 'Total', money: true, width: 16 },
      { header: 'Gastos', width: 10 },
    ],
    rows: overall.map((c, i) => [c.label, ...perDay.map((totals) => totals[i].total), c.total, c.count]),
    totals: ['Total', ...days.map((d) => d.spent), sum(overall.map((c) => c.total)), expenses.length],
  };

  return [summary, detail, byCategory];
}
