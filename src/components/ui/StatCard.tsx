import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

type Accent = 'verde' | 'rojo' | 'amarillo' | 'carbon';

// El color solo marca el ícono y la barra de avance; la tarjeta es igual para todas las cifras.
const accents: Record<Accent, { bar: string; icon: string }> = {
  verde: { bar: 'bg-verde-600', icon: 'text-verde-700' },
  rojo: { bar: 'bg-rojo-600', icon: 'text-rojo-600' },
  amarillo: { bar: 'bg-amarillo-500', icon: 'text-amarillo-700' },
  carbon: { bar: 'bg-carbon-700', icon: 'text-carbon-600' },
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
    <div className="rounded-lg border border-carbon-200 bg-white p-4 shadow-card sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-carbon-600">{label}</p>
        <Icon aria-hidden className={cn('size-5 shrink-0', style.icon)} />
      </div>
      <p className="mt-2 text-[1.75rem] leading-tight font-semibold tracking-tight text-carbon-900 tabular-nums">{value}</p>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-carbon-100">
          <div className={cn('h-full rounded-full', style.bar)} style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      {detail && <p className="mt-2 text-sm text-carbon-500">{detail}</p>}
    </div>
  );
}
