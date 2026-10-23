import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

type AlertTone = 'success' | 'danger' | 'warning' | 'info';

const styles: Record<AlertTone, { box: string; icon: string; Icon: LucideIcon }> = {
  success: { box: 'border-verde-600 bg-verde-50 text-verde-900', icon: 'text-verde-700', Icon: CircleCheck },
  danger: { box: 'border-rojo-600 bg-rojo-50 text-rojo-800', icon: 'text-rojo-600', Icon: CircleAlert },
  warning: { box: 'border-amarillo-500 bg-amarillo-50 text-amarillo-900', icon: 'text-amarillo-700', Icon: TriangleAlert },
  info: { box: 'border-carbon-400 bg-carbon-50 text-carbon-800', icon: 'text-carbon-500', Icon: Info },
};

interface StatusAlertProps {
  tone: AlertTone;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function StatusAlert({ tone, title, children, className }: StatusAlertProps) {
  const { box, icon, Icon } = styles[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-lg border-l-4 px-4 py-3', box, className)}
    >
      <Icon aria-hidden className={cn('mt-0.5 size-5 shrink-0', icon)} />
      <div className="min-w-0 text-sm">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-1 leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}
