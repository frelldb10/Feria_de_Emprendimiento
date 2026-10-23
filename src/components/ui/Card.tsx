import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface CardProps {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** Sin relleno interno, para listas y tablas que van de borde a borde. */
  flush?: boolean;
  children: ReactNode;
}

export function Card({ title, description, actions, className, flush = false, children }: CardProps) {
  const hasHeader = title || description || actions;
  return (
    <section className={cn('rounded-xl border border-carbon-200 bg-white', className)}>
      {hasHeader && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-carbon-100 px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="font-display text-base font-semibold text-carbon-900">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-carbon-500">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(!flush && 'px-4 py-4 sm:px-5')}>{children}</div>
    </section>
  );
}
