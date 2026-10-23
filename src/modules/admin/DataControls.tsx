import { useState } from 'react';
import { Eraser, Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { StatusAlert } from '../../components/ui/StatusAlert';
import { describeError } from '../../lib/supabase';
import { clearAllData, loadDemoEntrepreneurs } from '../../store/actions';

type PendingAction = 'demo' | 'clear' | null;

const COPY = {
  demo: {
    title: 'Cargar emprendedores de prueba',
    body: 'Se agregan 24 emprendedores ficticios con su código QR, para ensayar la puerta, la capacitación, los kits, los bonos y las ventas. Los que ya existan no se tocan.',
    confirm: 'Cargar',
  },
  clear: {
    title: 'Vaciar todos los datos',
    body: 'Se borran emprendedores, asistencias, capacitación, kits, bonos y ventas en todos los equipos, para empezar la feria desde cero. Las cuentas de usuario no se borran. No se puede deshacer.',
    confirm: 'Vaciar todo',
  },
};

export function DataControls() {
  const [pending, setPending] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    setMessage(null);
    try {
      if (pending === 'demo') {
        const added = await loadDemoEntrepreneurs();
        setMessage({ ok: true, text: added > 0 ? `Se cargaron ${added} emprendedores de prueba.` : 'Los emprendedores de prueba ya estaban cargados.' });
      } else {
        await clearAllData();
        setMessage({ ok: true, text: 'Se vaciaron los datos de la feria.' });
      }
    } catch (error) {
      setMessage({ ok: false, text: describeError(error) });
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  return (
    <Card title="Datos">
      <p className="text-sm text-carbon-600">
        Los datos se guardan en el servidor y se ven al instante en todos los equipos conectados.
      </p>
      {message && (
        <StatusAlert tone={message.ok ? 'success' : 'danger'} title={message.text} className="mt-3" />
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" icon={Users} onClick={() => setPending('demo')}>
          Emprendedores de prueba
        </Button>
        <Button variant="dangerGhost" icon={Eraser} onClick={() => setPending('clear')}>
          Vaciar todo
        </Button>
      </div>

      <Modal
        open={pending !== null}
        onClose={() => !busy && setPending(null)}
        title={pending ? COPY[pending].title : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)} disabled={busy}>
              Cancelar
            </Button>
            <Button variant={pending === 'clear' ? 'danger' : 'primary'} onClick={() => void confirm()} disabled={busy}>
              {busy ? 'Un momento…' : pending ? COPY[pending].confirm : ''}
            </Button>
          </>
        }
      >
        <p className="text-carbon-700">{pending ? COPY[pending].body : ''}</p>
      </Modal>
    </Card>
  );
}
