import { useState, type FormEvent } from 'react';
import { Keyboard, Repeat, ScanLine } from 'lucide-react';
import { Button } from '../ui/Button';

interface ScannerPanelProps {
  onCode: (code: string) => void;
  onSimulate: () => void;
  lastCode: string | null;
  /** Mientras el servidor responde no se aceptan más lecturas. */
  busy?: boolean;
}

/**
 * Cámara simulada. El campo de texto también sirve con lectores QR de mano (USB o Bluetooth),
 * que "escriben" el código y presionan Enter.
 */
export function ScannerPanel({ onCode, onSimulate, lastCode, busy = false }: ScannerPanelProps) {
  const [code, setCode] = useState('');

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!code.trim() || busy) return;
    onCode(code);
    setCode('');
  }

  return (
    <div className="space-y-4">
      <div className="relative mx-auto aspect-square w-full max-w-72 overflow-hidden rounded-2xl bg-carbon-950">
        <div aria-hidden className="absolute inset-8">
          <span className="absolute top-0 left-0 size-10 rounded-tl-lg border-t-4 border-l-4 border-white" />
          <span className="absolute top-0 right-0 size-10 rounded-tr-lg border-t-4 border-r-4 border-white" />
          <span className="absolute bottom-0 left-0 size-10 rounded-bl-lg border-b-4 border-l-4 border-white" />
          <span className="absolute right-0 bottom-0 size-10 rounded-br-lg border-r-4 border-b-4 border-white" />
          <span className="absolute inset-x-2 top-1/2 h-0.5 animate-scanline bg-verde-500 shadow-[0_0_12px_2px] shadow-verde-500/60 motion-reduce:animate-none" />
        </div>
        <p className="absolute inset-x-0 bottom-3 text-center text-xs font-medium text-carbon-300">
          Cámara simulada · apunta al código QR
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button size="lg" icon={ScanLine} onClick={onSimulate} disabled={busy} fullWidth>
          {busy ? 'Registrando…' : 'Simular lectura'}
        </Button>
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
      </div>

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
