import { useMemo, useState, type FormEvent } from 'react';
import { Archive } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { StatusAlert } from '../../components/ui/StatusAlert';
import { formatMoney } from '../../lib/format';
import { describeError } from '../../lib/supabase';
import { archiveFair } from '../../store/actions';
import { useFairState } from '../../store/fairStore';
import { buildEdition } from './edition';

const defaultName = () => `Feria de Emprendimiento ${new Date().getFullYear()}`;

export function ArchiveModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useFairState();
  const edition = useMemo(() => buildEdition(state), [state]);
  const [name, setName] = useState(defaultName);
  const [clear, setClear] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const empty = edition.summary.entrepreneurs === 0;
  const repeated = state.editions.list.some((e) => e.name.trim().toLowerCase() === name.trim().toLowerCase());

  function close() {
    if (busy) return;
    setName(defaultName());
    setClear(false);
    setFailure(null);
    setSaved(null);
    onClose();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy || empty || name.trim().length < 3) return;
    setBusy(true);
    setFailure(null);
    try {
      await archiveFair(name.trim(), edition, clear);
      setSaved(clear ? 'La feria quedó en el historial y los datos se vaciaron para empezar la nueva.' : 'La feria quedó guardada en el historial.');
    } catch (error) {
      setFailure(describeError(error));
    } finally {
      setBusy(false);
    }
  }

  const { summary } = edition;
  return (
    <Modal
      open={open}
      onClose={close}
      title={saved ? 'Feria guardada' : 'Guardar feria en el historial'}
      description={saved ? undefined : 'Para compararla con las próximas ferias.'}
      footer={
        saved ? (
          <Button onClick={close}>Listo</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="archive-form"
              variant={clear ? 'danger' : 'primary'}
              icon={Archive}
              disabled={busy || empty || name.trim().length < 3}
            >
              {busy ? 'Guardando…' : clear ? 'Guardar y vaciar' : 'Guardar'}
            </Button>
          </>
        )
      }
    >
      {saved ? (
        <StatusAlert tone="success" title={saved} />
      ) : (
        <form id="archive-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
          {failure && <StatusAlert tone="danger" title="No se guardó la feria">{failure}</StatusAlert>}
          {empty && <StatusAlert tone="warning" title="No hay datos de la feria para guardar" />}
          <TextField
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            required
            hint={repeated ? 'Ya hay una feria guardada con ese nombre; conviene distinguirlas (por ejemplo, con el mes).' : undefined}
          />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-carbon-50 px-4 py-3 text-sm">
            <dt className="text-carbon-500">Emprendedores</dt>
            <dd className="text-right font-semibold tabular-nums">{summary.entrepreneurs}</dd>
            <dt className="text-carbon-500">Asistieron</dt>
            <dd className="text-right font-semibold tabular-nums">{summary.attendance.anyDay}</dd>
            <dt className="text-carbon-500">Ventas</dt>
            <dd className="text-right font-semibold tabular-nums">{formatMoney(summary.sales.total)}</dd>
            <dt className="text-carbon-500">Caja menor gastada</dt>
            <dd className="text-right font-semibold tabular-nums">{formatMoney(summary.pettyCash.spent)}</dd>
          </dl>
          <p className="text-sm text-carbon-600">
            Se guardan las cifras y la lista de emprendedores con sus resultados (asistencia, capacitación, kit, bono y ventas). No se
            guardan teléfonos, cuentas bancarias ni fotos: si los necesitas, descarga antes los reportes.
          </p>
          <Checkbox
            checked={clear}
            onChange={setClear}
            label="Vaciar los datos para empezar la nueva feria"
            description="Borra emprendedores, asistencias, capacitación, kits, bonos, ventas, caja menor y visitantes. Las cuentas de usuario y el historial se mantienen."
          />
          {clear && (
            <StatusAlert tone="warning" title="Los datos de la feria actual se borran en todos los equipos">
              Esto no se puede deshacer. Descarga antes los reportes que necesites.
            </StatusAlert>
          )}
        </form>
      )}
    </Modal>
  );
}
