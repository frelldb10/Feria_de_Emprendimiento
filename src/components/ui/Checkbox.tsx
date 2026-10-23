import { useId, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

/** Fila completa tocable (mín. 56 px) con casilla nativa grande. */
export function Checkbox({ checked, onChange, label, description, disabled = false }: CheckboxProps) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex min-h-14 cursor-pointer items-center gap-3.5 rounded-lg border px-4 py-3 transition-colors',
        checked ? 'border-verde-600 bg-verde-50' : 'border-carbon-200 bg-white hover:border-carbon-300',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-6 shrink-0 cursor-pointer rounded accent-verde-700 disabled:cursor-not-allowed"
      />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-carbon-900">{label}</span>
        {description && <span className="block text-sm text-carbon-500">{description}</span>}
      </span>
    </label>
  );
}
