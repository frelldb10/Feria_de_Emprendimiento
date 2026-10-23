import { useCallback, useRef, useState } from 'react';
import type { ScanResult } from '../../store/actions';

/**
 * Corre una lectura a la vez: mientras el servidor responde, las demás se ignoran, así un
 * lector de mano que "dispara" dos veces no manda dos registros.
 */
export function useScanner() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);

  const run = useCallback(async (task: () => Promise<ScanResult>) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    try {
      setResult(await task());
    } finally {
      running.current = false;
      setBusy(false);
    }
  }, []);

  const clear = useCallback(() => setResult(null), []);

  return { result, busy, run, clear };
}
