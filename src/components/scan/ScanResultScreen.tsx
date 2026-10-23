import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Ban, CircleCheckBig, ScanQrCode } from 'lucide-react';
import type { ScanResult } from '../../store/actions';
import { formatTime } from '../../lib/format';
import { cn } from '../../lib/cn';

const AUTO_CLOSE_MS = 2500;

export interface ScanLabels {
  /** Arriba del título: "Día 1", "Capacitación"... */
  context: string;
  ok: string;
  duplicate: string;
  /** Se completa con la hora: "Ya ingresó el Día 1" + " a las 9:05 a. m." */
  duplicateDetail: string;
  duplicateHint: string;
}

interface ScanResultScreenProps {
  result: ScanResult;
  labels: ScanLabels;
  onClose: () => void;
}

/**
 * Ocupa toda la pantalla para que el operador lo vea de reojo mientras atiende la fila.
 * Verde se cierra solo; rojo exige tocar "Entendido" para que nadie lo pase por alto.
 */
export function ScanResultScreen({ result, labels, onClose }: ScanResultScreenProps) {
  const ok = result.status === 'ok';
  const buttonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    buttonRef.current?.focus();
    navigator.vibrate?.(ok ? 60 : [220, 90, 220]);
    if (!ok) return;
    const timer = setTimeout(() => onCloseRef.current(), AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [ok, result]);

  let title: string;
  let body: ReactNode;
  const Icon = ok ? CircleCheckBig : result.status === 'duplicate' ? Ban : ScanQrCode;

  if (result.status === 'ok') {
    title = labels.ok;
    body = (
      <>
        <p className="font-display text-3xl leading-tight font-semibold sm:text-4xl">{result.entrepreneur.businessName}</p>
        <p className="mt-1 text-lg">{result.entrepreneur.ownerName}</p>
        <p className="mt-4 text-base font-medium opacity-90">
          {result.entrepreneur.stand ? `Stand ${result.entrepreneur.stand} · ` : ''}
          {formatTime(result.at)}
        </p>
      </>
    );
  } else if (result.status === 'duplicate') {
    title = labels.duplicate;
    body = (
      <>
        <p className="font-display text-3xl leading-tight font-semibold sm:text-4xl">{result.entrepreneur.businessName}</p>
        <p className="mt-1 text-lg">{result.entrepreneur.ownerName}</p>
        <p className="mx-auto mt-5 max-w-sm rounded-lg bg-black/15 px-4 py-3 text-base font-medium">
          {labels.duplicateDetail} a las {formatTime(result.previousAt)}
          <br />
          Registró: {result.previousOperator}
        </p>
        <p className="mt-4 text-base">{labels.duplicateHint}</p>
      </>
    );
  } else {
    title = 'Código no reconocido';
    body = (
      <>
        <p className="font-mono text-2xl font-semibold break-all">{result.code || '(vacío)'}</p>
        <p className="mx-auto mt-4 max-w-sm text-base">
          No corresponde a ningún emprendedor registrado. Búscalo por nombre o documento.
        </p>
      </>
    );
  }

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="scan-result-title"
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto px-6 py-10 text-center text-white',
        ok ? 'bg-verde-600' : 'bg-rojo-600',
      )}
    >
      <Icon className="size-24 shrink-0 sm:size-28" strokeWidth={1.75} aria-hidden />
      <p className="mt-5 text-sm font-semibold tracking-widest uppercase opacity-90">{labels.context}</p>
      <h2 id="scan-result-title" className="mt-1 font-display text-2xl font-bold sm:text-3xl">
        {title}
      </h2>
      <div className="mt-6">{body}</div>

      <button
        ref={buttonRef}
        type="button"
        onClick={onClose}
        className={cn(
          'relative mt-10 h-14 w-full max-w-sm overflow-hidden rounded-lg bg-white text-lg font-semibold',
          ok ? 'text-verde-800' : 'text-rojo-700',
        )}
      >
        {ok ? 'Siguiente' : 'Entendido'}
        {ok && (
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-1 origin-left animate-countdown bg-verde-600/40 motion-reduce:hidden"
            style={{ animationDuration: `${AUTO_CLOSE_MS}ms` }}
          />
        )}
      </button>
    </div>,
    document.body,
  );
}
