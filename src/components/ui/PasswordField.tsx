import { useId, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff, Shuffle } from 'lucide-react';
import { cn } from '../../lib/cn';

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'size'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  /** Muestra un botón para inventar una contraseña (lo usa el administrador). */
  onGenerate?: () => void;
  initiallyVisible?: boolean;
}

export function PasswordField({ label, value, onChange, error, hint, onGenerate, initiallyVisible = false, required, ...props }: PasswordFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(initiallyVisible);
  const message = error ?? hint;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-carbon-800">
        {label}
        {required && <span className="text-rojo-600"> *</span>}
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            id={id}
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={message ? `${id}-msg` : undefined}
            className={cn(
              'block h-14 w-full rounded-lg border bg-white pr-12 pl-3.5 text-base text-carbon-900 focus:border-verde-700 focus:ring-2 focus:ring-verde-700/20 focus:outline-none',
              visible && 'font-mono',
              error ? 'border-rojo-600' : 'border-carbon-300',
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md p-2 text-carbon-500 hover:bg-carbon-100 hover:text-carbon-900"
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {visible ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
          </button>
        </div>
        {onGenerate && (
          <button
            type="button"
            onClick={() => {
              onGenerate();
              setVisible(true);
            }}
            className="inline-flex h-14 shrink-0 items-center gap-2 rounded-lg border border-carbon-300 bg-white px-3.5 text-sm font-semibold text-carbon-800 hover:bg-carbon-100"
          >
            <Shuffle className="size-4" aria-hidden />
            Generar
          </button>
        )}
      </div>
      {message && (
        <p id={`${id}-msg`} className={cn('mt-1.5 text-sm', error ? 'font-medium text-rojo-700' : 'text-carbon-500')}>
          {message}
        </p>
      )}
    </div>
  );
}
