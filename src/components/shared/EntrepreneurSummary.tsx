import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import type { Entrepreneur } from '../../store/types';

interface EntrepreneurSummaryProps {
  entrepreneur: Entrepreneur;
  onClear?: () => void;
  children?: ReactNode;
}

export function EntrepreneurSummary({ entrepreneur, onClear, children }: EntrepreneurSummaryProps) {
  return (
    <div className="rounded-xl border border-carbon-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-carbon-500 uppercase">{entrepreneur.category || 'Emprendimiento'}</p>
          <h2 className="font-display text-xl leading-snug font-semibold text-carbon-900">{entrepreneur.businessName}</h2>
          <p className="text-carbon-600">{entrepreneur.ownerName}</p>
        </div>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="-m-1 rounded-lg p-2 text-carbon-500 hover:bg-carbon-100 hover:text-carbon-900"
            aria-label="Cambiar de emprendedor"
          >
            <X className="size-5" aria-hidden />
          </button>
        )}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-carbon-50 px-3 py-2">
          <dt className="text-xs text-carbon-500">Documento</dt>
          <dd className="font-semibold tabular-nums">{entrepreneur.document}</dd>
        </div>
        <div className="rounded-lg bg-carbon-50 px-3 py-2">
          <dt className="text-xs text-carbon-500">Stand</dt>
          <dd className="font-semibold">{entrepreneur.stand || 'Sin asignar'}</dd>
        </div>
        <div className="col-span-2 flex items-baseline justify-between gap-3 rounded-lg bg-carbon-50 px-3 py-2">
          <dt className="text-xs text-carbon-500">Código QR</dt>
          <dd className="font-mono text-sm font-semibold">{entrepreneur.qrCode ?? 'Sin generar'}</dd>
        </div>
      </dl>
      {children && <div className="mt-3 flex flex-wrap gap-1.5">{children}</div>}
    </div>
  );
}
