import type { InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

export function SearchInput({ value, onChange, label, ...props }: SearchInputProps) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-carbon-400" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        autoComplete="off"
        className="block h-12 w-full rounded-lg border border-carbon-300 bg-white pr-3.5 pl-11 text-base placeholder:text-carbon-400 focus:border-verde-700 focus:ring-2 focus:ring-verde-700/20 focus:outline-none"
        {...props}
      />
    </div>
  );
}
