import { Ban, CircleCheck, GraduationCap, Landmark, PackageCheck, QrCode, ScanQrCode, Upload, type LucideIcon } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { cn } from '../../lib/cn';
import { formatTime } from '../../lib/format';
import { useFairState } from '../../store/fairStore';
import type { ActivityKind } from '../../store/types';

const KIND_STYLE: Record<ActivityKind, { icon: LucideIcon; className: string }> = {
  attendance: { icon: CircleCheck, className: 'bg-verde-50 text-verde-700' },
  duplicate: { icon: Ban, className: 'bg-rojo-50 text-rojo-600' },
  'unknown-code': { icon: ScanQrCode, className: 'bg-rojo-50 text-rojo-600' },
  training: { icon: GraduationCap, className: 'bg-verde-50 text-verde-700' },
  kit: { icon: PackageCheck, className: 'bg-amarillo-50 text-amarillo-700' },
  bonus: { icon: Landmark, className: 'bg-carbon-100 text-carbon-700' },
  import: { icon: Upload, className: 'bg-carbon-100 text-carbon-700' },
  qr: { icon: QrCode, className: 'bg-carbon-100 text-carbon-700' },
};

export function ActivityFeed() {
  const { activity } = useFairState();

  return (
    <Card
      title="Actividad reciente"
      description="Se actualiza sola con ingresos, capacitación, kits y bonos."
      flush
    >
      {activity.length === 0 ? (
        <EmptyState icon={CircleCheck} title="Sin movimientos todavía" />
      ) : (
        <ol className="max-h-104 divide-y divide-carbon-100 overflow-y-auto">
          {activity.slice(0, 15).map((entry) => {
            const { icon: Icon, className } = KIND_STYLE[entry.kind];
            return (
              <li key={entry.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                <span className={cn('mt-0.5 rounded-md p-1.5', className)}>
                  <Icon className="size-4" aria-hidden />
                </span>
                <p className="min-w-0 flex-1 text-sm text-carbon-800">{entry.message}</p>
                <time dateTime={entry.at} className="shrink-0 text-xs tabular-nums text-carbon-500">
                  {formatTime(entry.at)}
                </time>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
