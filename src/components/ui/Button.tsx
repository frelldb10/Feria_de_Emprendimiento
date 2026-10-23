import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'dangerGhost';
type Size = 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-verde-700 text-white hover:bg-verde-800 active:bg-verde-900 disabled:bg-carbon-300',
  secondary:
    'border border-carbon-300 bg-white text-carbon-800 hover:bg-carbon-100 active:bg-carbon-200 disabled:text-carbon-400',
  danger: 'bg-rojo-600 text-white hover:bg-rojo-700 active:bg-rojo-800 disabled:bg-carbon-300',
  ghost: 'text-carbon-700 hover:bg-carbon-100 active:bg-carbon-200 disabled:text-carbon-400',
  dangerGhost: 'text-rojo-700 hover:bg-rojo-50 active:bg-rojo-100 disabled:text-carbon-400',
};

// "lg" es el tamaño para operadores de campo: 56 px de alto, fácil de tocar con el pulgar.
const sizes: Record<Size, string> = {
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-14 px-5 text-base gap-2.5',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  fullWidth = false,
  className,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg font-semibold transition-colors disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {Icon && <Icon aria-hidden className={size === 'lg' ? 'size-5' : 'size-4'} />}
      {children}
    </button>
  );
}
