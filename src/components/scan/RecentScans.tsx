import { Clock } from 'lucide-react';
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

interface RecentScansProps {
  entries: ScanEntry[];
  entrepreneurs: Map<string, Entrepreneur>;
  emptyTitle: string;
}

export function RecentScans({ entries, entrepreneurs, emptyTitle }: RecentScansProps) {
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
        return (
          <li key={entry.id} className="flex items-center gap-3 py-2.5">
            <span className="w-20 shrink-0 text-sm font-semibold whitespace-nowrap tabular-nums text-carbon-600">
              {formatTime(entry.at)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-carbon-900">{entrepreneur?.businessName ?? 'Emprendedor eliminado'}</span>
              <span className="block truncate text-sm text-carbon-500">{entrepreneur?.ownerName}</span>
            </span>
            <Badge tone={entry.method === 'qr' ? 'neutral' : 'warning'}>{entry.method === 'qr' ? 'QR' : 'Manual'}</Badge>
          </li>
        );
      })}
    </ol>
  );
}
