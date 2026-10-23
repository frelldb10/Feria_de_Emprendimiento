import { useId, useMemo, useState, type ReactNode } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import { searchEntrepreneurs } from '../../store/selectors';
import type { Entrepreneur } from '../../store/types';

interface EntrepreneurSearchProps {
  entrepreneurs: Entrepreneur[];
  onSelect: (entrepreneur: Entrepreneur) => void;
  label?: string;
  placeholder?: string;
  /** Texto del botón de cada resultado. Sin él se muestra una flecha. */
  actionLabel?: string;
  renderMeta?: (entrepreneur: Entrepreneur) => ReactNode;
  clearOnSelect?: boolean;
}

export function EntrepreneurSearch({
  entrepreneurs,
  onSelect,
  label = 'Buscar emprendedor',
  placeholder = 'Nombre, documento o stand',
  actionLabel,
  renderMeta,
  clearOnSelect = true,
}: EntrepreneurSearchProps) {
  const inputId = useId();
  const listId = useId();
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchEntrepreneurs(entrepreneurs, query), [entrepreneurs, query]);
  const searching = query.trim().length >= 2;

  function select(entrepreneur: Entrepreneur) {
    onSelect(entrepreneur);
    if (clearOnSelect) setQuery('');
  }

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-carbon-800">
        {label}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-carbon-400" aria-hidden />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && results.length === 1) {
              event.preventDefault();
              select(results[0]);
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          aria-controls={listId}
          className="block h-14 w-full rounded-lg border border-carbon-300 bg-white pr-3.5 pl-11 text-base placeholder:text-carbon-400 focus:border-verde-700 focus:ring-2 focus:ring-verde-700/20 focus:outline-none"
        />
      </div>
      <p className="sr-only" aria-live="polite">
        {searching ? `${results.length} resultados` : ''}
      </p>

      {searching &&
        (results.length > 0 ? (
          <ul id={listId} className="mt-2 divide-y divide-carbon-100 overflow-hidden rounded-lg border border-carbon-200 bg-white">
            {results.map((entrepreneur) => (
              <li key={entrepreneur.id}>
                <button
                  type="button"
                  onClick={() => select(entrepreneur)}
                  className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-carbon-50 active:bg-carbon-100"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-carbon-900">{entrepreneur.businessName}</span>
                    <span className="block truncate text-sm text-carbon-500">
                      {entrepreneur.ownerName} · CC {entrepreneur.document}
                      {entrepreneur.stand && ` · Stand ${entrepreneur.stand}`}
                    </span>
                    {renderMeta && <span className="mt-1 flex flex-wrap gap-1.5">{renderMeta(entrepreneur)}</span>}
                  </span>
                  {actionLabel ? (
                    <span className="shrink-0 rounded-lg bg-verde-700 px-3 py-2 text-sm font-semibold text-white">{actionLabel}</span>
                  ) : (
                    <ChevronRight className="size-5 shrink-0 text-carbon-400" aria-hidden />
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p id={listId} className="mt-2 rounded-lg bg-carbon-100 px-4 py-3 text-sm text-carbon-600">
            No hay coincidencias para “{query.trim()}”.
          </p>
        ))}
    </div>
  );
}
