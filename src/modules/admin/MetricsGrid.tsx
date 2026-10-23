import { useMemo } from 'react';
import { ChartColumn, GraduationCap, Landmark, PackageCheck, Store, Users } from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { formatMoney } from '../../lib/format';
import { useFairState } from '../../store/fairStore';
import { computeMetrics } from '../../store/selectors';

export function MetricsGrid() {
  const state = useFairState();
  const m = useMemo(() => computeMetrics(state), [state]);
  const ratio = (part: number) => (m.entrepreneurs > 0 ? part / m.entrepreneurs : 0);
  const outOf = (part: number) => (
    <>
      {part}
      <span className="text-lg font-medium text-carbon-400"> / {m.entrepreneurs}</span>
    </>
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard
        label="Total asistentes"
        value={outOf(m.attendees)}
        detail={`Día 1: ${m.attendeesByDay[1]} · Día 2: ${m.attendeesByDay[2]}`}
        icon={Users}
        accent="verde"
        progress={ratio(m.attendees)}
      />
      <StatCard
        label="Asistieron a capacitación"
        value={outOf(m.trainingAttendees)}
        detail={`${m.entrepreneurs - m.trainingAttendees} no han asistido`}
        icon={GraduationCap}
        accent="verde"
        progress={ratio(m.trainingAttendees)}
      />
      <StatCard
        label="Ventas registradas"
        value={formatMoney(m.salesTotal)}
        detail={`Día 1: ${formatMoney(m.salesByDay[1])} · Día 2: ${formatMoney(m.salesByDay[2])}`}
        icon={ChartColumn}
        accent="rojo"
      />
      <StatCard
        label="Kits entregados"
        value={outOf(m.kitsComplete)}
        detail={m.kitsPartial > 0 ? `${m.kitsPartial} con entrega parcial` : 'Sin entregas parciales'}
        icon={PackageCheck}
        accent="amarillo"
        progress={ratio(m.kitsComplete)}
      />
      <StatCard
        label="Cuentas para el bono"
        value={m.bonusAccounts}
        detail={m.bonusPending > 0 ? `${m.bonusPending} asistentes sin cuenta registrada` : 'Todos los asistentes tienen cuenta'}
        icon={Landmark}
        accent="amarillo"
      />
      <StatCard
        label="Emprendedores cargados"
        value={m.entrepreneurs}
        detail={m.pendingQr > 0 ? `${m.pendingQr} sin código QR` : 'Todos tienen código QR'}
        icon={Store}
        accent="carbon"
      />
    </div>
  );
}
