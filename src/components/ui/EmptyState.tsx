import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-8 text-center">
      <Icon className="size-8 text-carbon-400" aria-hidden />
      <p className="mt-3 font-semibold text-carbon-800">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-carbon-500">{children}</div>}
    </div>
  );
}
