import type { KeyboardEvent } from 'react';
import { cn } from '../../lib/cn';

export interface TabItem<T extends string | number> {
  id: T;
  label: string;
  meta?: string;
}

interface TabsProps<T extends string | number> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: 'md' | 'lg';
  className?: string;
}

/** Control segmentado. En "lg" cada pestaña mide 56 px de alto para usarla con una mano. */
export function Tabs<T extends string | number>({ items, value, onChange, label, size = 'md', className }: TabsProps<T>) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const index = items.findIndex((item) => item.id === value);
    const step = event.key === 'ArrowRight' ? 1 : -1;
    const next = items[(index + step + items.length) % items.length];
    onChange(next.id);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-tab="${next.id}"]`)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn('grid gap-1 rounded-xl bg-carbon-100 p-1', className)}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            data-tab={item.id}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={cn(
              'flex flex-col items-center justify-center rounded-lg px-3 font-semibold transition-colors',
              size === 'lg' ? 'min-h-14 text-base' : 'min-h-10 text-sm',
              selected ? 'bg-white text-carbon-900 shadow-sm ring-1 ring-carbon-200' : 'text-carbon-600 hover:text-carbon-900',
            )}
          >
            <span>{item.label}</span>
            {item.meta && (
              <span className={cn('text-xs font-medium', selected ? 'text-verde-700' : 'text-carbon-500')}>{item.meta}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
