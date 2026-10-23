import { useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import { EntrepreneurSummary } from '../../components/shared/EntrepreneurSummary';
import { Button } from '../../components/ui/Button';
import { StatusAlert } from '../../components/ui/StatusAlert';
import { formatTime, maskAccount } from '../../lib/format';
import { describeError } from '../../lib/supabase';
import { correctBonusAccount, registerBonus } from '../../store/actions';
import { useFairState } from '../../store/fairStore';
import { getBonusEligibility } from '../../store/rules';
import type { BankAccount, Entrepreneur, EntrepreneurshipBonus } from '../../store/types';
import { useCanEdit } from '../auth/useCanEdit';
import { BankAccountForm } from './BankAccountForm';
import { ACCOUNT_TYPE_LABEL } from './bankAccount';

function AccountSummary({ account }: { account: BankAccount }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-carbon-50 px-4 py-3 text-sm">
      <div>
        <dt className="text-xs text-carbon-500">Entidad</dt>
        <dd className="font-semibold">{account.bank}</dd>
      </div>
      <div>
        <dt className="text-xs text-carbon-500">Tipo</dt>
        <dd className="font-semibold">{ACCOUNT_TYPE_LABEL[account.type]}</dd>
      </div>
      <div>
        <dt className="text-xs text-carbon-500">Número</dt>
        <dd className="font-mono font-semibold">{maskAccount(account.number)}</dd>
      </div>
      <div>
        <dt className="text-xs text-carbon-500">Titular</dt>
        <dd className="truncate font-semibold">{account.holderName}</dd>
      </div>
    </dl>
  );
}

/** Montar con key={entrepreneur.id} para que el formulario se limpie al cambiar de emprendedor. */
export function BonusDetail({ entrepreneur, onClear }: { entrepreneur: Entrepreneur; onClear: () => void }) {
  const canEdit = useCanEdit();
  const state = useFairState();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState<{ bonus: EntrepreneurshipBonus; corrected: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const eligibility = useMemo(() => getBonusEligibility(state, entrepreneur.id), [state, entrepreneur.id]);

  async function save(task: () => Promise<EntrepreneurshipBonus>, corrected: boolean) {
    setBusy(true);
    setFailure(null);
    try {
      setSaved({ bonus: await task(), corrected });
      setEditing(false);
    } catch (error) {
      setFailure(describeError(error));
    } finally {
      setBusy(false);
    }
  }

  const register = (account: BankAccount) => save(() => registerBonus(entrepreneur, account), false);
  const correct = (bonus: EntrepreneurshipBonus, account: BankAccount) =>
    save(() => correctBonusAccount(bonus, entrepreneur, account), true);

  return (
    <div className="space-y-4">
      <EntrepreneurSummary entrepreneur={entrepreneur} onClear={onClear} />

      {failure && (
        <StatusAlert tone="danger" title="No se guardó la cuenta">
          {failure}
        </StatusAlert>
      )}

      {saved && !editing && (
        <StatusAlert tone="success" title={saved.corrected ? 'Cuenta corregida' : 'Cuenta registrada para el bono'}>
          La transferencia se hace después de la feria con los datos del Excel.
        </StatusAlert>
      )}

      {!eligibility.ok && eligibility.reason === 'no-attendance' && (
        <StatusAlert tone="danger" title="No puede recibir el bono: no registra asistencia">
          {entrepreneur.ownerName} no tiene ingreso registrado en puerta el Día 1 ni el Día 2. El bono es solo para
          quienes participaron en la feria.
        </StatusAlert>
      )}

      {!eligibility.ok && eligibility.reason === 'already-registered' && (
        <>
          {!saved && (
            <StatusAlert tone="success" title="Ya tiene cuenta registrada">
              Registrada a las {formatTime(eligibility.bonus.at)} por {eligibility.bonus.operator}.
            </StatusAlert>
          )}
          {editing ? (
            <BankAccountForm
              entrepreneur={entrepreneur}
              current={eligibility.bonus.account}
              submitLabel="Guardar corrección"
              onSubmit={(account) => correct(eligibility.bonus, account)}
              onCancel={() => setEditing(false)}
              busy={busy}
            />
          ) : (
            <>
              <AccountSummary account={eligibility.bonus.account} />
              {canEdit && (
                <Button
                  variant="secondary"
                  icon={Pencil}
                  onClick={() => {
                    setSaved(null);
                    setEditing(true);
                  }}
                >
                  Corregir datos de la cuenta
                </Button>
              )}
            </>
          )}
        </>
      )}

      {eligibility.ok && (
        <>
          <StatusAlert tone="success" title="Participó en la feria">
            {eligibility.attendance.map((a) => `Día ${a.day}: ingresó a las ${formatTime(a.at)}`).join(' · ')}
          </StatusAlert>
          {canEdit ? (
            <BankAccountForm entrepreneur={entrepreneur} submitLabel="Registrar cuenta para el bono" onSubmit={register} busy={busy} />
          ) : (
            <p className="text-sm text-carbon-600">Todavía no tiene cuenta registrada para el bono.</p>
          )}
        </>
      )}
    </div>
  );
}
