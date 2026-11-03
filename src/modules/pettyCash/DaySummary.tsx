import { useEffect, useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { MoneyField } from '../../components/ui/Field';
import { cn } from '../../lib/cn';
import { formatDateTime, formatMoney } from '../../lib/format';
import { describeError } from '../../lib/supabase';
import { setPettyCashFund } from '../../store/actions';
import type { PettyCashDay } from '../../store/pettyCash';

interface DaySummaryProps {
  summary: PettyCashDay;
  /** Solo el administrador asigna el dinero del día. */
  canAssign: boolean;
}

/** Asignado, gastado y saldo del día. Montar con key={day} para que el formulario se reinicie al cambiar de día. */
export function DaySummary({ summary, canAssign }: DaySummaryProps) {
  const { day, fund, assigned, spent, balance } = summary;
  const used = assigned > 0 ? Math.min(spent / assigned, 1) : 0;

  return (
    <Card
      title={`Día ${day}`}
      description={fund ? `Asignado por ${fund.operator} · ${formatDateTime(fund.at)}` : 'Todavía no se ha asignado dinero para este día.'}
    >
      <dl className="grid gap-2 sm:grid-cols-3 sm:gap-3">
        <Figure label="Asignado" value={assigned} />
        <Figure label="Gastado" value={spent} />
        <Figure label="Saldo" value={balance} highlight={fund ? (balance > 0 ? 'verde' : 'rojo') : undefined} />
      </dl>
      {fund && (
        <>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-carbon-100">
            <div className={cn('h-full rounded-full', used >= 1 ? 'bg-rojo-600' : 'bg-verde-600')} style={{ width: `${Math.round(used * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-sm text-carbon-500">Se ha gastado el {Math.round(used * 100)}% de lo asignado.</p>
        </>
      )}
      {canAssign && <FundForm day={day} current={fund?.amount} spent={spent} />}
    </Card>
  );
}

function Figure({ label, value, highlight }: { label: string; value: number; highlight?: 'verde' | 'rojo' }) {
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-lg bg-carbon-50 px-4 py-3 sm:block">
      <dt className="text-sm text-carbon-600">{label}</dt>
      <dd
        className={cn(
          'font-display text-xl font-semibold tabular-nums sm:text-2xl',
          highlight === 'verde' ? 'text-verde-700' : highlight === 'rojo' ? 'text-rojo-700' : 'text-carbon-900',
        )}
      >
        {formatMoney(value)}
      </dd>
    </div>
  );
}

function FundForm({ day, current, spent }: { day: PettyCashDay['day']; current: number | undefined; spent: number }) {
  const [digits, setDigits] = useState(current === undefined ? '' : String(current));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const amount = Number(digits);
  const dirty = digits !== '' && amount !== current;
  const tooLow = digits !== '' && amount < spent;

  // Si otro administrador lo cambia, el campo se pone al día.
  useEffect(() => {
    setDigits(current === undefined ? '' : String(current));
  }, [current]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!dirty || tooLow || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await setPettyCashFund(day, amount);
      setMessage({ ok: true, text: 'Guardado' });
    } catch (error) {
      setMessage({ ok: false, text: describeError(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-5 border-t border-carbon-100 pt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <MoneyField
            label={`Dinero entregado para el Día ${day}`}
            value={digits}
            onChange={(value) => {
              setDigits(value);
              setMessage(null);
            }}
            error={tooLow ? `Ya se gastaron ${formatMoney(spent)} este día; lo asignado no puede ser menor.` : undefined}
            hint="Si se entrega más dinero durante el día, escribe el total."
          />
        </div>
        <Button type="submit" variant={current === undefined ? 'primary' : 'secondary'} icon={Save} disabled={!dirty || tooLow || busy} className="sm:mt-7">
          {busy ? 'Guardando…' : current === undefined ? 'Asignar' : 'Guardar'}
        </Button>
      </div>
      {message && (
        <p className={cn('mt-2 text-sm font-medium', message.ok ? 'text-verde-700' : 'text-rojo-700')}>{message.text}</p>
      )}
    </form>
  );
}
