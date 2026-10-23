import { useEffect, useId, useState } from 'react';
import { Camera, RotateCcw, X } from 'lucide-react';
import { cn } from '../../lib/cn';

interface PhotoCaptureProps {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  required?: boolean;
}

/**
 * En el celular, capture="environment" abre directamente la cámara trasera.
 * En computador abre el selector de archivos.
 */
export function PhotoCapture({ label, file, onChange, error, required }: PhotoCaptureProps) {
  const id = useId();
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-carbon-800">
        {label}
        {required && <span className="text-rojo-600"> *</span>}
      </p>
      <input
        id={id}
        type="file"
        accept="image/*"
        capture="environment"
        className="peer sr-only"
        aria-invalid={error ? true : undefined}
        onChange={(event) => {
          onChange(event.target.files?.[0] ?? null);
          event.target.value = '';
        }}
      />

      {file && preview ? (
        <div className="flex items-center gap-3 rounded-lg border border-carbon-200 bg-white p-2.5">
          <img src={preview} alt="Foto de evidencia" className="size-20 shrink-0 rounded-md object-cover" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-semibold text-carbon-900">{file.name}</p>
            <p className="text-carbon-500">{Math.round(file.size / 1024)} KB</p>
            <label htmlFor={id} className="mt-1 inline-flex cursor-pointer items-center gap-1.5 font-semibold text-verde-700 hover:text-verde-800">
              <RotateCcw className="size-4" aria-hidden />
              Tomar otra
            </label>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-lg p-2 text-carbon-500 hover:bg-carbon-100 hover:text-carbon-900"
            aria-label="Quitar foto"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className={cn(
            'flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-4 text-center transition-colors',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-verde-700 peer-focus-visible:ring-offset-2',
            error ? 'border-rojo-600 bg-rojo-50' : 'border-carbon-300 bg-carbon-50 hover:border-verde-600 hover:bg-verde-50',
          )}
        >
          <Camera className="size-7 text-carbon-600" aria-hidden />
          <span className="font-semibold text-carbon-800">Tomar foto de evidencia</span>
          <span className="text-sm text-carbon-500">Se abre la cámara del celular</span>
        </label>
      )}
      {error && <p className="mt-1.5 text-sm font-medium text-rojo-700">{error}</p>}
    </div>
  );
}
