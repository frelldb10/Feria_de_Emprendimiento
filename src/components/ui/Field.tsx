import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import { formatThousands } from '../../lib/format';

const controlClass =
  'block w-full rounded-lg border bg-white px-3.5 text-base text-carbon-900 placeholder:text-carbon-400 ' +
  'focus:border-verde-700 focus:outline-none focus:ring-2 focus:ring-verde-700/20 disabled:bg-carbon-50';

interface FieldShellProps {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

function FieldShell({ id, label, hint, error, required, children }: FieldShellProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-carbon-800">
        {label}
        {required && <span className="text-rojo-600"> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="mt-1.5 text-sm font-medium text-rojo-700">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-msg`} className="mt-1.5 text-sm text-carbon-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  hint?: ReactNode;
  error?: string;
  size?: 'md' | 'lg';
}

export function TextField({ label, hint, error, size = 'md', className, id, required, ...props }: TextFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required}>
      <input
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
        className={cn(controlClass, size === 'lg' ? 'h-14' : 'h-11', error ? 'border-rojo-600' : 'border-carbon-300', className)}
        {...props}
      />
    </FieldShell>
  );
}

interface MoneyFieldProps extends Omit<TextFieldProps, 'value' | 'onChange'> {
  /** Solo dígitos: "250000". */
  value: string;
  onChange: (digits: string) => void;
}

/** Pesos sin decimales: se escribe 250000 y se ve $ 250.000. */
export function MoneyField({ label, hint, error, size = 'md', className, id, required, value, onChange, ...props }: MoneyFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required}>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-semibold text-carbon-500">$</span>
        <input
          id={fieldId}
          required={required}
          value={value ? formatThousands(Number(value)) : ''}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 10))}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
          className={cn(
            controlClass,
            'pl-8 font-semibold tabular-nums',
            size === 'lg' ? 'h-14 text-lg' : 'h-11',
            error ? 'border-rojo-600' : 'border-carbon-300',
            className,
          )}
          {...props}
        />
      </div>
    </FieldShell>
  );
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label: string;
  hint?: ReactNode;
  error?: string;
  size?: 'md' | 'lg';
}

export function SelectField({ label, hint, error, size = 'md', className, id, required, children, ...props }: SelectFieldProps) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required}>
      <select
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${fieldId}-msg` : undefined}
        className={cn(controlClass, size === 'lg' ? 'h-14' : 'h-11', error ? 'border-rojo-600' : 'border-carbon-300', className)}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
}
