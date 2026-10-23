import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

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
