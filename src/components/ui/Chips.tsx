import { cn } from '../../lib/cn';

export interface ChipItem<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface ChipsProps<T extends string> {
  items: ChipItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

/** Filtro de una sola opción que se desplaza de lado en pantallas angostas. */
export function Chips<T extends string>({ items, value, onChange, label }: ChipsProps<T>) {
  return (
    <div role="group" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(item.id)}
            className={cn(
              'h-10 shrink-0 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors',
              selected ? 'border-carbon-900 bg-carbon-900 text-white' : 'border-carbon-300 bg-white text-carbon-700 hover:border-carbon-400',
            )}
          >
            {item.label}
            {item.count !== undefined && <span className={cn('ml-1.5', selected ? 'text-carbon-300' : 'text-carbon-400')}>{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
