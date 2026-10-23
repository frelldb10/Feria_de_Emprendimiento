import { useId, useState } from 'react';
import { FileSpreadsheet, LoaderCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

export function FileDropzone({ onFile, busy = false }: { onFile: (file: File) => void; busy?: boolean }) {
  const id = useId();
  const [dragging, setDragging] = useState(false);

  return (
    <div>
      <input
        id={id}
        type="file"
        accept=".xlsx,.csv"
        className="peer sr-only"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = '';
        }}
      />
      <label
        htmlFor={id}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file && !busy) onFile(file);
        }}
        className={cn(
          'flex min-h-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-verde-700 peer-focus-visible:ring-offset-2',
          dragging ? 'border-verde-600 bg-verde-50' : 'border-carbon-300 bg-carbon-50 hover:border-carbon-400',
          busy && 'cursor-wait opacity-70',
        )}
      >
        {busy ? (
          <LoaderCircle className="size-9 animate-spin text-carbon-500" aria-hidden />
        ) : (
          <FileSpreadsheet className="size-9 text-verde-700" aria-hidden />
        )}
        <span className="font-semibold text-carbon-900">
          {busy ? 'Leyendo archivo…' : 'Arrastra aquí el archivo de emprendedores'}
        </span>
        <span className="text-sm text-carbon-500">
          o <span className="font-semibold text-verde-700 underline underline-offset-2">búscalo en el equipo</span> · Excel
          (.xlsx) o CSV
        </span>
      </label>
    </div>
  );
}
