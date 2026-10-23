import { useMemo, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Chips } from '../../components/ui/Chips';
import { Tabs } from '../../components/ui/Tabs';
import { cn } from '../../lib/cn';
import { formatMoney } from '../../lib/format';
import { useFairState } from '../../store/fairStore';
import { SECTIONS } from '../../store/sections';
import { SALE_CUTS, type SectionId } from '../../store/types';
import { buildBalance, salesByEntrepreneur, type DayFilter, type EntrepreneurSales } from './balance';
import { DayComparison } from './DayComparison';

const PERIOD_LABEL: Record<string, string> = { 1: 'Día 1', 2: 'Día 2', all: 'Ambos días' };

function periodTotal(row: EntrepreneurSales, filter: DayFilter) {
  return filter === 'all' ? row.total : row.dayTotal[filter];
}

function hasReport(row: EntrepreneurSales, filter: DayFilter) {
  const days = filter === 'all' ? ([1, 2] as const) : [filter];
  return days.some((day) => SALE_CUTS.some((cut) => row.cuts[day][cut] !== null));
}

export function SalesBalance() {
  const state = useFairState();
  const [filter, setFilter] = useState<DayFilter>(1);
  const [detailSection, setDetailSection] = useState<SectionId>('gastronomia');

  const { sections, overall } = useMemo(() => buildBalance(state, filter), [state, filter]);
  const detail = useMemo(
    () =>
      salesByEntrepreneur(state)
        .filter((row) => row.entrepreneur.section === detailSection)
        .sort((a, b) => periodTotal(b, filter) - periodTotal(a, filter)),
    [state, filter, detailSection],
  );
  const max = Math.max(...sections.map((s) => s.total), 1);

  return (
    <div className="space-y-5">
      <DayComparison />

      <h2 className="pt-2 font-display text-lg font-semibold text-carbon-900">Balance por periodo</h2>
      <Tabs
        label="Periodo"
        value={filter}
        onChange={setFilter}
        items={[
          { id: 1, label: 'Día 1' },
          { id: 2, label: 'Día 2' },
          { id: 'all', label: 'Ambos días' },
        ]}
      />

      <div className="rounded-xl border border-carbon-200 bg-white px-5 py-4">
        <p className="text-sm font-medium text-carbon-600">Total vendido · {PERIOD_LABEL[filter]}</p>
        <p className="mt-1 font-display text-4xl font-semibold tabular-nums text-carbon-900">{formatMoney(overall.total)}</p>
        <p className="mt-1 text-sm text-carbon-500">
          {overall.reporters} de {overall.members} emprendedores con ventas registradas
        </p>
      </div>

      <Card title="Ventas por sección" description={PERIOD_LABEL[filter]}>
        <ul className="space-y-4">
          {sections.map((s) => {
            const share = overall.total > 0 ? Math.round((s.total / overall.total) * 100) : 0;
            return (
              <li key={s.label} title={`${s.label}: ${formatMoney(s.total)} (${share}% del total) · ${s.reporters} de ${s.members} reportaron`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-carbon-900">{s.label}</span>
                  <span className="font-semibold tabular-nums text-carbon-900">{formatMoney(s.total)}</span>
                </div>
                <div className="mt-1.5 h-3 rounded-r bg-carbon-100">
                  <div
                    className={cn('h-full rounded-r', s.section ? 'bg-verde-600' : 'bg-carbon-400')}
                    style={{ width: `${(s.total / max) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-carbon-500">
                  {share}% del total · {s.reporters} de {s.members} emprendedores reportaron
                </p>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="Por corte" description="Lo recogido en cada uno de los dos cortes del día." flush>
        {/* En el celular cada sección es un bloque; desde tableta se ve como tabla. */}
        <ul className="divide-y divide-carbon-100 sm:hidden">
          {[...sections, overall].map((s) => (
            <li key={s.label} className={cn('px-4 py-3', s === overall && 'bg-carbon-50')}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold text-carbon-900">{s.label}</span>
                <span className="font-semibold tabular-nums">{formatMoney(s.total)}</span>
              </div>
              <dl className="mt-1.5 grid grid-cols-2 gap-2 text-sm tabular-nums">
                {SALE_CUTS.map((cut) => (
                  <div key={cut}>
                    <dt className="text-xs text-carbon-500">Corte {cut}</dt>
                    <dd>{formatMoney(s.cuts[cut])}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-136 text-sm">
            <thead className="bg-carbon-50 text-xs tracking-wide text-carbon-600 uppercase">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold sm:pl-5">Sección</th>
                {SALE_CUTS.map((cut) => (
                  <th key={cut} className="px-3 py-2.5 text-right font-semibold">
                    Corte {cut}
                  </th>
                ))}
                <th className="px-4 py-2.5 text-right font-semibold sm:pr-5">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-carbon-100 tabular-nums">
              {sections.map((s) => (
                <tr key={s.label}>
                  <td className="px-4 py-2.5 font-medium text-carbon-900 sm:pl-5">{s.label}</td>
                  {SALE_CUTS.map((cut) => (
                    <td key={cut} className="px-3 py-2.5 text-right">
                      {formatMoney(s.cuts[cut])}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-right font-semibold sm:pr-5">{formatMoney(s.total)}</td>
                </tr>
              ))}
              <tr className="bg-carbon-50 font-semibold">
                <td className="px-4 py-2.5 sm:pl-5">Total</td>
                {SALE_CUTS.map((cut) => (
                  <td key={cut} className="px-3 py-2.5 text-right">
                    {formatMoney(overall.cuts[cut])}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right sm:pr-5">{formatMoney(overall.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Detalle por emprendedor" description={`Ordenado de mayor a menor venta · ${PERIOD_LABEL[filter]}`} flush>
        <div className="border-b border-carbon-100 px-4 py-3 sm:px-5">
          <Chips
            label="Sección"
            value={detailSection}
            onChange={setDetailSection}
            items={SECTIONS.map((s) => ({ id: s.id, label: s.label }))}
          />
        </div>
        <ol className="divide-y divide-carbon-100">
          {detail.map((row, i) => (
            <li key={row.entrepreneur.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
              <span className="w-6 shrink-0 text-right text-sm tabular-nums text-carbon-400">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-carbon-900">{row.entrepreneur.businessName}</span>
                <span className="block truncate text-sm text-carbon-500">
                  {row.entrepreneur.stand} · {row.entrepreneur.ownerName}
                </span>
              </span>
              {hasReport(row, filter) ? (
                <span className="font-semibold tabular-nums text-carbon-900">{formatMoney(periodTotal(row, filter))}</span>
              ) : (
                <span className="text-sm text-carbon-400">Sin reporte</span>
              )}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
