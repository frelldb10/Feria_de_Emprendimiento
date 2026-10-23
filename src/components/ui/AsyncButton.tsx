import { useState } from 'react';
import { Button, type ButtonProps } from './Button';

interface AsyncButtonProps extends Omit<ButtonProps, 'onClick' | 'children'> {
  onRun: () => Promise<void>;
  children: string;
  busyLabel?: string;
}

/** Botón para tareas que tardan (generar un Excel o un Word): se bloquea mientras corren. */
export function AsyncButton({ onRun, children, busyLabel = 'Generando…', disabled, ...props }: AsyncButtonProps) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleClick() {
    setBusy(true);
    setFailed(false);
    try {
      await onRun();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button {...props} onClick={handleClick} disabled={busy || disabled} title={failed ? 'No se pudo generar el archivo. Intenta de nuevo.' : undefined}>
      {busy ? busyLabel : failed ? 'Reintentar' : children}
    </Button>
  );
}
