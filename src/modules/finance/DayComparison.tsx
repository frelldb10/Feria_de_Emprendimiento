import { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { cn } from '../../lib/cn';
import { formatMoney } from '../../lib/format';
import { useFairState } from '../../store/fairStore';
import { EVENT_DAYS, SALE_CUTS, type EventDay } from '../../store/types';
import { buildBalance } from './balance';

// Colores validados para daltonismo (verde y ámbar). El valor siempre va escrito junto a la barra.
const DAY_STYLE: Record<EventDay, { bar: string; swatch: string }> = {
  1: { bar: 'bg-verde-700', swatch: 'bg-verde-700' },
  2: { bar: 'bg-amarillo-600', swatch: 'bg-amarillo-600' },
};

interface Group {
  label: string;
  values: Record<EventDay, number>;
}

function Legend() {
  return (
    <div className="flex gap-4 text-sm text-carbon-700">
      {EVENT_DAYS.map((day) => (
        <span key={day} className="inline-flex items-center gap-1.5">
          <span aria-hidden className={cn('size-3 rounded-sm', DAY_STYLE[day].swatch)} />
          Día {day}
        </span>
      ))}
    </div>
  );
}

function GroupedBars({ groups, title }: { groups: Group[]; title: string }) {
  const max = Math.max(1, ...groups.flatMap((g) => EVENT_DAYS.map((d) => g.values[d])));
  return (
    <figure>
      <figcaption className="mb-3 text-sm font-semibold text-carbon-800">{title}</figcaption>
      <ul className="space-y-4">
        {groups.map((group) => (
          <li key={group.label}>
            <p className="mb-1.5 text-sm font-medium text-carbon-900">{group.label}</p>
            <div className="space-y-0.5">
              {EVENT_DAYS.map((day) => {
                const value = group.values[day];
                return (
                  <div
                    key={day}
                    className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-2"
                    title={`${group.label} · Día ${day}: ${formatMoney(value)}`}
                  >
                    <span className="text-xs text-carbon-500">Día {day}</span>
                    <div className="h-3.5">
                      <div
                        className={cn('h-full rounded-r', DAY_STYLE[day].bar)}
                        style={{ width: value > 0 ? `max(${(value / max) * 100}%, 3px)` : 0 }}
                      />
                    </div>
                    <span className="w-24 text-right text-sm font-semibold tabular-nums text-carbon-900">{formatMoney(value)}</span>
                  </div>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function DayComparison() {
  const state = useFairState();
  const days = useMemo(() => ({ 1: buildBalance(state, 1), 2: buildBalance(state, 2) }), [state]);

  const labels = [...new Set([...days[1].sections, ...days[2].sections].map((s) => s.label))];
  const totalOf = (day: EventDay, label: string) => days[day].sections.find((s) => s.label === label)?.total ?? 0;
  const bySection: Group[] = labels.map((label) => ({ label, values: { 1: totalOf(1, label), 2: totalOf(2, label) } }));
  const byCut: Group[] = SALE_CUTS.map((cut) => ({
    label: `Corte ${cut}`,
    values: { 1: days[1].overall.cuts[cut], 2: days[2].overall.cuts[cut] },
  }));

  const total1 = days[1].overall.total;
  const total2 = days[2].overall.total;
  const change = total1 > 0 ? Math.round(((total2 - total1) / total1) * 100) : null;
  const Arrow = (change ?? 0) >= 0 ? ArrowUpRight : ArrowDownRight;
  // Si el Día 2 va a mitad de jornada, la comparación todavía no es justa: se avisa.
  const lastCut = SALE_CUTS[SALE_CUTS.length - 1];
  const day2Partial = total2 > 0 && days[2].overall.cuts[lastCut] === 0 && days[1].overall.cuts[lastCut] > 0;

  return (
    <Card title="Día 1 frente a Día 2" description="Ventas registradas en cada día de la feria." actions={<Legend />}>
      <div className="grid grid-cols-2 gap-3">
        {EVENT_DAYS.map((day) => (
          <div key={day} className="rounded-lg bg-carbon-50 px-4 py-3">
            <p className="flex items-center gap-1.5 text-sm text-carbon-600">
              <span aria-hidden className={cn('size-2.5 rounded-sm', DAY_STYLE[day].swatch)} />
              Día {day}
            </p>
            <p className="font-display text-xl font-semibold tabular-nums text-carbon-900 sm:text-2xl">
              {formatMoney(day === 1 ? total1 : total2)}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-sm text-carbon-700">
        {total2 === 0 ? (
          'Todavía no hay ventas registradas del Día 2.'
        ) : change === null ? (
          'No hubo ventas registradas el Día 1 para comparar.'
        ) : (
          <>
            <Arrow className="size-4" aria-hidden />
            El Día 2 vendió {Math.abs(change)}% {change >= 0 ? 'más' : 'menos'} que el Día 1 ({formatMoney(Math.abs(total2 - total1))}{' '}
            {change >= 0 ? 'más' : 'menos'}).{day2Partial && ` Falta el corte ${lastCut} del Día 2, así que la diferencia todavía es parcial.`}
          </>
        )}
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <GroupedBars title="Por sección" groups={bySection} />
        <GroupedBars title="Por corte (todas las secciones)" groups={byCut} />
      </div>
    </Card>
  );
}
