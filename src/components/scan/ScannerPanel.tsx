import { useState, type FormEvent } from 'react';
import { Keyboard, Repeat } from 'lucide-react';
import { Button } from '../ui/Button';
import { CameraScanner } from './CameraScanner';

interface ScannerPanelProps {
  onCode: (code: string) => void;
  lastCode: string | null;
  /** Mientras el servidor responde no se aceptan más lecturas. */
  busy?: boolean;
  /** true mientras se muestra la pantalla verde o roja: la cámara no envía lecturas. */
  showingResult?: boolean;
}

/**
 * Cámara del celular para leer el QR. El campo de texto sirve con lectores QR de mano
 * (USB o Bluetooth), que "escriben" el código y presionan Enter.
 */
export function ScannerPanel({ onCode, lastCode, busy = false, showingResult = false }: ScannerPanelProps) {
  const [code, setCode] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!code.trim() || busy) return;
    onCode(code);
    setCode('');
  }

  return (
    <div className="space-y-4">
      <CameraScanner onCode={onCode} paused={busy || showingResult} />

      <Button
        size="lg"
        variant="secondary"
        icon={Repeat}
        onClick={() => lastCode && onCode(lastCode)}
        disabled={!lastCode || busy}
        fullWidth
      >
        Leer el último otra vez
      </Button>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Keyboard className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-carbon-400" aria-hidden />
          <label htmlFor="qr-code-input" className="sr-only">
            Código QR leído
          </label>
          <input
            id="qr-code-input"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Código del QR"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="block h-14 w-full rounded-lg border border-carbon-300 bg-white pr-3 pl-11 font-mono text-base uppercase placeholder:font-sans placeholder:normal-case placeholder:text-carbon-400 focus:border-verde-700 focus:ring-2 focus:ring-verde-700/20 focus:outline-none"
          />
        </div>
        <Button type="submit" size="lg" variant="secondary" disabled={!code.trim() || busy}>
          Validar
        </Button>
      </form>
    </div>
  );
}
