import { useState } from 'react';
import { Eraser, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { clearAllData, resetToDemoData } from '../../store/fairStore';

type PendingAction = 'demo' | 'clear' | null;

const COPY = {
  demo: {
    title: 'Restablecer datos de demostración',
    body: 'Se reemplazan todos los datos por los 24 emprendedores de prueba. Lo registrado hasta ahora se pierde. Las cuentas de usuario no se tocan.',
    confirm: 'Restablecer',
  },
  clear: {
    title: 'Vaciar todos los datos',
    body: 'Se borran emprendedores, asistencias, capacitación, kits, bonos y ventas para empezar la feria desde cero. Las cuentas de usuario no se borran. No se puede deshacer.',
    confirm: 'Vaciar todo',
  },
};

export function DataControls() {
  const [pending, setPending] = useState<PendingAction>(null);

  function confirm() {
    if (pending === 'demo') resetToDemoData();
    if (pending === 'clear') clearAllData();
    setPending(null);
  }

  return (
    <Card title="Datos">
      <p className="text-sm text-carbon-600">
        Por ahora los datos se guardan en este navegador. Para trabajar con varios celulares en la puerta al mismo tiempo hay
        que conectar un servidor.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" icon={RotateCcw} onClick={() => setPending('demo')}>
          Datos de prueba
        </Button>
        <Button variant="dangerGhost" icon={Eraser} onClick={() => setPending('clear')}>
          Vaciar todo
        </Button>
      </div>

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={pending ? COPY[pending].title : ''}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirm}>
              {pending ? COPY[pending].confirm : ''}
            </Button>
          </>
        }
      >
        <p className="text-carbon-700">{pending ? COPY[pending].body : ''}</p>
      </Modal>
    </Card>
  );
}
