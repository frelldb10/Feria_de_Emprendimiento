import { Card } from '../../components/ui/Card';
import { formatMoney, plural } from '../../lib/format';
import { totalsByCategory, type PettyCashDay } from '../../store/pettyCash';
import { CATEGORY_ICON } from './categoryIcons';

/** En qué se fue el dinero del día. Solo aparecen las categorías con gastos. */
export function CategoryTotals({ summary }: { summary: PettyCashDay }) {
  const totals = totalsByCategory(summary.expenses)
    .filter((t) => t.count > 0)
    .sort((a, b) => b.total - a.total);
  if (totals.length === 0) return null;
  const max = Math.max(...totals.map((t) => t.total));

  return (
    <Card title="Por categoría" description={`Día ${summary.day}`}>
      <ul className="space-y-4">
        {totals.map((t) => {
          const Icon = CATEGORY_ICON[t.category];
          const share = summary.spent > 0 ? Math.round((t.total / summary.spent) * 100) : 0;
          return (
            <li key={t.category}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 font-semibold text-carbon-900">
                  <Icon className="size-4 shrink-0 text-carbon-500" aria-hidden />
                  <span className="truncate">{t.label}</span>
                </span>
                <span className="font-semibold tabular-nums text-carbon-900">{formatMoney(t.total)}</span>
              </div>
              <div className="mt-1.5 h-3 rounded-r bg-carbon-100">
                <div className="h-full rounded-r bg-amarillo-500" style={{ width: `${(t.total / max) * 100}%` }} />
              </div>
              <p className="mt-1 text-xs text-carbon-500">
                {share}% de lo gastado · {plural(t.count, 'gasto')}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
