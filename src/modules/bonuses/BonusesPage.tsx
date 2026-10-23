import { useMemo, useState } from 'react';
import { Landmark } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { EntrepreneurSearch } from '../../components/shared/EntrepreneurSearch';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatTime, maskAccount, plural } from '../../lib/format';
import { useFairState } from '../../store/fairStore';
import { indexAttendance, indexEntrepreneurs } from '../../store/selectors';
import type { Entrepreneur } from '../../store/types';
import { ReportDownloadButton } from '../reports/ReportDownloadButton';
import { BonusDetail } from './BonusDetail';

export function BonusesPage() {
  const { entrepreneurs, attendance, bonuses } = useFairState();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const attendanceIndex = useMemo(() => indexAttendance(attendance), [attendance]);
  const entrepreneurIndex = useMemo(() => indexEntrepreneurs(entrepreneurs), [entrepreneurs]);
  const bonusIndex = useMemo(() => new Map(bonuses.map((b) => [b.entrepreneurId, b])), [bonuses]);
  const pending = attendanceIndex.size - [...attendanceIndex.keys()].filter((id) => bonusIndex.has(id)).length;
  const recent = useMemo(() => [...bonuses].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8), [bonuses]);
  const selected = selectedId ? entrepreneurIndex.get(selectedId) : undefined;

  function select(entrepreneur: Entrepreneur) {
    setSelectedId(entrepreneur.id);
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-5 px-4 py-5 sm:py-8">
      <PageHeader
        title="Bono de emprendimiento"
        description={`${plural(bonuses.length, 'cuenta registrada', 'cuentas registradas')} · ${plural(pending, 'asistente', 'asistentes')} sin cuenta.`}
      />

      <Card title="Registrar cuenta" description="Solo para emprendedores que participaron en la feria (Día 1, Día 2 o ambos).">
        <div className="space-y-4">
          <EntrepreneurSearch
            entrepreneurs={entrepreneurs}
            onSelect={select}
            renderMeta={(e) => {
              if (bonusIndex.has(e.id)) return <Badge tone="success">Cuenta registrada</Badge>;
              if (attendanceIndex.has(e.id)) return <Badge>Participó · sin cuenta</Badge>;
              return <Badge tone="danger">Sin asistencia</Badge>;
            }}
          />
          {selected && <BonusDetail key={selected.id} entrepreneur={selected} onClear={() => setSelectedId(null)} />}
        </div>
      </Card>

      <Card
        title="Cuentas registradas"
        description="El Excel trae los números completos para hacer las transferencias."
        actions={<ReportDownloadButton report="bonos" disabled={bonuses.length === 0} />}
        flush
      >
        {recent.length === 0 ? (
          <EmptyState icon={Landmark} title="Aún no hay cuentas registradas" />
        ) : (
          <ol className="divide-y divide-carbon-100">
            {recent.map((bonus) => {
              const entrepreneur = entrepreneurIndex.get(bonus.entrepreneurId);
              return (
                <li key={bonus.id}>
                  <button
                    type="button"
                    onClick={() => entrepreneur && select(entrepreneur)}
                    className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-carbon-50 sm:px-5"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-carbon-900">{entrepreneur?.businessName}</span>
                      <span className="block truncate text-sm text-carbon-500">
                        {bonus.account.bank} · <span className="font-mono">{maskAccount(bonus.account.number)}</span>
                      </span>
                    </span>
                    <span className="shrink-0 text-sm whitespace-nowrap tabular-nums text-carbon-500">{formatTime(bonus.at)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
