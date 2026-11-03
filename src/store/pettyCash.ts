import type { EventDay, FairState, PettyCashCategory, PettyCashExpense, PettyCashFund } from './types';

// Deben coincidir con la restricción "category" de petty_cash_expenses en schema.sql.
export const PETTY_CASH_CATEGORIES: { id: PettyCashCategory; label: string }[] = [
  { id: 'transporte', label: 'Transporte' },
  { id: 'alimentacion', label: 'Alimentación y refrigerios' },
  { id: 'papeleria', label: 'Papelería e impresiones' },
  { id: 'ferreteria', label: 'Ferretería y materiales' },
  { id: 'aseo', label: 'Aseo' },
  { id: 'imprevistos', label: 'Imprevistos' },
];

const CATEGORY_LABEL = Object.fromEntries(PETTY_CASH_CATEGORIES.map((c) => [c.id, c.label])) as Record<PettyCashCategory, string>;

export function categoryLabel(category: PettyCashCategory): string {
  return CATEGORY_LABEL[category] ?? category;
}

export interface PettyCashDay {
  day: EventDay;
  /** undefined mientras el administrador no asigne dinero para ese día. */
  fund: PettyCashFund | undefined;
  assigned: number;
  spent: number;
  balance: number;
  /** Del más reciente al más antiguo. */
  expenses: PettyCashExpense[];
}

export function pettyCashDay(pettyCash: FairState['pettyCash'], day: EventDay): PettyCashDay {
  const fund = pettyCash.funds.find((f) => f.day === day);
  const expenses = pettyCash.expenses.filter((e) => e.day === day).sort((a, b) => b.at.localeCompare(a.at));
  const assigned = fund?.amount ?? 0;
  const spent = expenses.reduce((sum, e) => sum + e.amount, 0);
  return { day, fund, assigned, spent, balance: assigned - spent, expenses };
}

export interface CategoryTotal {
  category: PettyCashCategory;
  label: string;
  total: number;
  count: number;
}

/** Total y número de gastos por categoría, en el orden de la lista de categorías. */
export function totalsByCategory(expenses: PettyCashExpense[]): CategoryTotal[] {
  return PETTY_CASH_CATEGORIES.map(({ id, label }) => {
    const items = expenses.filter((e) => e.category === id);
    return { category: id, label, total: items.reduce((sum, e) => sum + e.amount, 0), count: items.length };
  });
}
