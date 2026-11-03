import { useState } from 'react';
import { Receipt, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { StatusAlert } from '../../components/ui/StatusAlert';
import { formatMoney, formatTime, plural } from '../../lib/format';
import { describeError } from '../../lib/supabase';
import { deletePettyCashExpense } from '../../store/actions';
import { categoryLabel, type PettyCashDay } from '../../store/pettyCash';
import type { PettyCashExpense } from '../../store/types';
import { CATEGORY_ICON } from './categoryIcons';

/** Gastos del día. Solo el administrador puede eliminar uno mal registrado. */
export function ExpenseList({ summary, canDelete }: { summary: PettyCashDay; canDelete: boolean }) {
  const { day, expenses, spent } = summary;
  const [removing, setRemoving] = useState<PettyCashExpense | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  function close() {
    if (busy) return;
    setRemoving(null);
    setFailure(null);
  }

  async function confirm() {
    if (!removing) return;
    setBusy(true);
    setFailure(null);
    try {
      await deletePettyCashExpense(removing);
      setRemoving(null);
    } catch (error) {
      setFailure(describeError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={`Gastos del Día ${day}`} description={`${plural(expenses.length, 'gasto')} · ${formatMoney(spent)}`} flush>
      {expenses.length === 0 ? (
        <EmptyState icon={Receipt} title="Todavía no hay gastos registrados" />
      ) : (
        <ol className="divide-y divide-carbon-100">
          {expenses.map((expense) => {
            const Icon = CATEGORY_ICON[expense.category] ?? Receipt;
            return (
              <li key={expense.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span className="shrink-0 rounded-lg bg-carbon-100 p-2 text-carbon-700">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold break-words text-carbon-900">{expense.description}</span>
                  <span className="block text-sm text-carbon-500">
                    {categoryLabel(expense.category)} · {formatTime(expense.at)} · {expense.operator}
                  </span>
                </span>
                <span className="shrink-0 font-semibold whitespace-nowrap tabular-nums text-carbon-900">{formatMoney(expense.amount)}</span>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setRemoving(expense)}
                    className="-mr-1.5 shrink-0 rounded-lg p-2 text-carbon-400 hover:bg-rojo-50 hover:text-rojo-700"
                    aria-label={`Eliminar el gasto ${expense.description}`}
                    title="Eliminar gasto"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <Modal
        open={removing !== null}
        onClose={close}
        title="Eliminar gasto"
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>
              Cancelar
            </Button>
            <Button variant="danger" icon={Trash2} onClick={() => void confirm()} disabled={busy}>
              {busy ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </>
        }
      >
        {removing && (
          <div className="space-y-3">
            {failure && <StatusAlert tone="danger" title={failure} />}
            <p className="text-carbon-700">
              Se elimina el gasto <span className="font-semibold text-carbon-900">"{removing.description}"</span> de{' '}
              <span className="font-semibold text-carbon-900">{formatMoney(removing.amount)}</span> y el saldo del Día {removing.day} vuelve
              a subir. Queda anotado en la actividad. No se puede deshacer.
            </p>
          </div>
        )}
      </Modal>
    </Card>
  );
}
