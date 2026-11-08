import { Card } from '../../components/ui/Card';
import { cn } from '../../lib/cn';
import type { Tally, TourismStats } from '../../store/visitors';

const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

function Figure({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: 'verde' | 'amarillo' | 'carbon' }) {
  return (
    <div className={cn('rounded-lg border-t-4 bg-carbon-50 px-4 py-3', tone === 'verde' ? 'border-verde-600' : tone === 'amarillo' ? 'border-amarillo-500' : 'border-carbon-400')}>
      <p className="text-xs font-semibold tracking-wide text-carbon-600 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-carbon-900">{value}</p>
      <p className="text-xs text-carbon-500">{detail}</p>
    </div>
  );
}

function Bars({ title, items, empty }: { title: string; items: Tally[]; empty: string }) {
  const base = items.reduce((n, i) => n + i.count, 0);
  return (
    <div>
      <h3 className="text-sm font-semibold text-carbon-800">{title}</h3>
      {base === 0 ? (
        <p className="mt-2 text-sm text-carbon-500">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2.5">
          {items.map((item) => {
            const share = Math.round((item.count / base) * 100);
            return (
              <li key={item.label}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-carbon-800">{item.label}</span>
                  <span className="font-semibold tabular-nums text-carbon-900">
                    {item.count} <span className="font-normal text-carbon-500">· {share}%</span>
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-r bg-carbon-100">
                  <div className="h-full rounded-r bg-verde-600" style={{ width: `${share}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const share = (part: number, total: number) => (total > 0 ? `${Math.round((part / total) * 100)}%` : '0%');

/** Perfil turístico del público: la misma clasificación del informe turístico en Excel. */
export function TourismCard({ stats }: { stats: TourismStats }) {
  return (
    <Card
      title="Perfil turístico"
      description="Clasificación de la OMT: quien vive en Astrea es público local; quien viene de otro municipio es visitante."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Figure label="Público local" value={stats.locals} detail={`${share(stats.locals, stats.total)} de los registros`} tone="carbon" />
        <Figure label="Visitantes" value={stats.visitors} detail={`${share(stats.visitors, stats.total)} vienen de otro municipio`} tone="verde" />
        <Figure label="Mercado regional" value={stats.regional} detail="Otros municipios del Cesar" tone="amarillo" />
        <Figure label="Mercado nacional" value={stats.national} detail="Otros departamentos" tone="amarillo" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Bars title="Cómo se enteraron de la feria" items={stats.byHeard} empty="Todavía no hay respuestas." />
        <Bars title="Personas por grupo" items={stats.byGroup} empty="Todavía no hay respuestas." />
      </div>
      {stats.averageGroup > 0 && (
        <p className="mt-5 border-t border-carbon-100 pt-4 text-sm text-carbon-600">
          Grupos de <span className="font-semibold text-carbon-900">{decimal.format(stats.averageGroup)} personas</span> en promedio, contando a quien se
          registra.
        </p>
      )}
    </Card>
  );
}
