import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type Tone = 'neutral' | 'success' | 'danger' | 'warning';

const tones: Record<Tone, string> = {
  neutral: 'bg-carbon-100 text-carbon-700',
  success: 'bg-verde-50 text-verde-800 ring-verde-200',
  danger: 'bg-rojo-50 text-rojo-700 ring-rojo-200',
  warning: 'bg-amarillo-50 text-amarillo-900 ring-amarillo-400/60',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
        tone !== 'neutral' && 'ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
