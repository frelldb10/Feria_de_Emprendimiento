import { useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/cn';
import { formatThousands, formatTime } from '../../lib/format';
import type { Entrepreneur, SaleRecord } from '../../store/types';

interface SaleRowProps {
  entrepreneur: Entrepreneur;
  record?: SaleRecord;
  onSave: (amount: number) => void;
}

/** Montar con una key que incluya día, corte e id del registro para que se reinicie al cambiar. */
export function SaleRow({ entrepreneur, record, onSave }: SaleRowProps) {
  const [text, setText] = useState(record ? formatThousands(record.amount) : '');
  const digits = text.replace(/\D/g, '');
  const dirty = digits !== (record ? String(record.amount) : '');

  function handleChange(value: string) {
    const clean = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 10);
    setText(clean ? formatThousands(Number(clean)) : '');
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (digits && dirty) onSave(Number(digits));
  }

  return (
    <li>
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:px-5"
      >
        <div className="col-span-2 min-w-0 sm:col-span-1">
          <p className="truncate font-semibold text-carbon-900">
            <span className="mr-2 font-mono text-xs font-medium text-carbon-500">{entrepreneur.stand || '—'}</span>
            {entrepreneur.businessName}
          </p>
          <p className={cn('truncate text-sm', record ? 'text-verde-700' : 'text-amarillo-700')}>
            {record ? `Registrado ${formatTime(record.at)} · ${record.operator}` : 'Pendiente en este corte'}
          </p>
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-semibold text-carbon-500">$</span>
          <input
            value={text}
            onChange={(event) => handleChange(event.target.value)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            aria-label={`Ventas de ${entrepreneur.businessName}`}
            className="block h-12 w-full rounded-lg border border-carbon-300 bg-white pr-3 pl-7 text-right text-lg font-semibold tabular-nums placeholder:text-carbon-300 focus:border-verde-700 focus:ring-2 focus:ring-verde-700/20 focus:outline-none"
          />
        </div>
        <Button type="submit" size="lg" variant={record && !dirty ? 'secondary' : 'primary'} disabled={!digits || !dirty} className="w-28">
          {!record ? 'Guardar' : dirty ? 'Actualizar' : 'Guardado'}
        </Button>
      </form>
    </li>
  );
}
