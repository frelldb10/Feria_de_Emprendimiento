import { Clock, Trash2 } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { formatTime } from '../../lib/format';
import type { Entrepreneur, RegistrationMethod } from '../../store/types';

interface ScanEntry {
  id: string;
  entrepreneurId: string;
  at: string;
  method: RegistrationMethod;
}

interface RecentScansProps<T extends ScanEntry> {
  entries: T[];
  entrepreneurs: Map<string, Entrepreneur>;
  emptyTitle: string;
  /** Si viene, cada registro tiene un botón para eliminarlo (solo el administrador). */
  onDelete?: (entry: T) => void;
}

export function RecentScans<T extends ScanEntry>({ entries, entrepreneurs, emptyTitle, onDelete }: RecentScansProps<T>) {
  if (entries.length === 0) {
    return (
      <EmptyState icon={Clock} title={emptyTitle}>
        Los registros aparecen aquí a medida que se hacen.
      </EmptyState>
    );
  }

  return (
    <ol className="-my-2 divide-y divide-carbon-100">
      {entries.map((entry) => {
        const entrepreneur = entrepreneurs.get(entry.entrepreneurId);
        const name = entrepreneur?.businessName ?? 'Emprendedor eliminado';
        return (
          <li key={entry.id} className="flex items-center gap-3 py-2.5">
            <span className="w-20 shrink-0 text-sm font-semibold whitespace-nowrap tabular-nums text-carbon-600">
              {formatTime(entry.at)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-carbon-900">{name}</span>
              <span className="block truncate text-sm text-carbon-500">{entrepreneur?.ownerName}</span>
            </span>
            <Badge tone={entry.method === 'qr' ? 'neutral' : 'warning'}>{entry.method === 'qr' ? 'QR' : 'Manual'}</Badge>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(entry)}
                className="-mr-1.5 shrink-0 rounded-lg p-2 text-carbon-400 hover:bg-rojo-50 hover:text-rojo-700"
                aria-label={`Eliminar el registro de ${name}`}
                title="Eliminar registro"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
