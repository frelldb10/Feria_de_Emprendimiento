import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

type Accent = 'verde' | 'rojo' | 'amarillo' | 'carbon';

const accents: Record<Accent, { bar: string; icon: string }> = {
  verde: { bar: 'bg-verde-600', icon: 'bg-verde-50 text-verde-700' },
  rojo: { bar: 'bg-rojo-600', icon: 'bg-rojo-50 text-rojo-700' },
  amarillo: { bar: 'bg-amarillo-400', icon: 'bg-amarillo-50 text-amarillo-700' },
  carbon: { bar: 'bg-carbon-700', icon: 'bg-carbon-100 text-carbon-700' },
};

interface StatCardProps {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon: LucideIcon;
  accent: Accent;
  /** 0 a 1. Si viene, se dibuja una barra de avance bajo el valor. */
  progress?: number;
}

export function StatCard({ label, value, detail, icon: Icon, accent, progress }: StatCardProps) {
  const style = accents[accent];
  return (
    <div className="relative overflow-hidden rounded-xl border border-carbon-200 bg-white p-4 sm:p-5">
      <span aria-hidden className={cn('absolute inset-x-0 top-0 h-1', style.bar)} />
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-carbon-600">{label}</p>
        <span className={cn('rounded-lg p-2', style.icon)}>
          <Icon aria-hidden className="size-5" />
        </span>
      </div>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-carbon-900">{value}</p>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-carbon-100">
          <div className={cn('h-full rounded-full', style.bar)} style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      {detail && <p className="mt-2 text-sm text-carbon-500">{detail}</p>}
    </div>
  );
}
