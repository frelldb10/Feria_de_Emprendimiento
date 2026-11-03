import { useMemo, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatusAlert } from '../../components/ui/StatusAlert';
import { Tabs } from '../../components/ui/Tabs';
import { formatMoney } from '../../lib/format';
import { useFairState } from '../../store/fairStore';
import { pettyCashDay } from '../../store/pettyCash';
import { EVENT_DAYS, type EventDay } from '../../store/types';
import { useAuth } from '../auth/AuthContext';
import { ReportDownloadButton } from '../reports/ReportDownloadButton';
import { CategoryTotals } from './CategoryTotals';
import { DaySummary } from './DaySummary';
import { ExpenseForm } from './ExpenseForm';
import { ExpenseList } from './ExpenseList';

export function PettyCashPage() {
  const { user } = useAuth();
  const { pettyCash } = useFairState();
  const [day, setDay] = useState<EventDay>(1);
  const days = useMemo(() => ({ 1: pettyCashDay(pettyCash, 1), 2: pettyCashDay(pettyCash, 2) }), [pettyCash]);
  const summary = days[day];

  // El administrador asigna y corrige; el rol de caja menor registra gastos; el observador solo mira.
  const isAdmin = user?.role === 'admin';
  const canSpend = isAdmin || user?.role === 'petty_cash';

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-5 sm:py-8">
      <PageHeader
        title="Caja menor"
        description="Dinero entregado y gastos de cada día de la feria."
        actions={
          <ReportDownloadButton report="caja-menor" disabled={pettyCash.expenses.length === 0}>
            Reporte en Excel
          </ReportDownloadButton>
        }
      />

      {!pettyCash.installed ? (
        <StatusAlert tone="warning" title="Falta actualizar la base de datos">
          En Supabase, abre SQL Editor, vuelve a ejecutar supabase/schema.sql y recarga esta página.
        </StatusAlert>
      ) : (
        <>
          <Tabs
            label="Día"
            size="lg"
            value={day}
            onChange={setDay}
            items={EVENT_DAYS.map((d) => ({
              id: d,
              label: `Día ${d}`,
              meta: days[d].fund ? `Saldo ${formatMoney(days[d].balance)}` : 'Sin asignar',
            }))}
          />
          <DaySummary key={`resumen-${day}`} summary={summary} canAssign={isAdmin} />
          {canSpend && <ExpenseForm key={`gasto-${day}`} summary={summary} isAdmin={isAdmin} />}
          <ExpenseList summary={summary} canDelete={isAdmin} />
          <CategoryTotals summary={summary} />
        </>
      )}
    </div>
  );
}
