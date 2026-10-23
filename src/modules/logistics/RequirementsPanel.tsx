import { useState } from 'react';
import { Armchair, Plug, Store, type LucideIcon } from 'lucide-react';
import { StatusAlert } from '../../components/ui/StatusAlert';
import { setLogisticsCheck } from '../../store/actions';
import type { Entrepreneur, LogisticsCheck, LogisticsField } from '../../store/types';
import { cn } from '../../lib/cn';
import { formatTime } from '../../lib/format';
import { describeError } from '../../lib/supabase';
import { useCanEdit } from '../auth/useCanEdit';

interface Requirement {
  field: LogisticsField;
  icon: LucideIcon;
  title: string;
  value: string;
  doneLabel: string;
  applies: boolean;
}

export function RequirementsPanel({ entrepreneur, check }: { entrepreneur: Entrepreneur; check?: LogisticsCheck }) {
  const canEdit = useCanEdit();
  const [saving, setSaving] = useState<LogisticsField | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(field: LogisticsField, value: boolean) {
    setSaving(field);
    setError(null);
    try {
      await setLogisticsCheck(entrepreneur.id, field, value);
    } catch (failure) {
      setError(describeError(failure));
    } finally {
      setSaving(null);
    }
  }

  const requirements: Requirement[] = [
    {
      field: 'standReady',
      icon: Store,
      title: 'Stand',
      value: entrepreneur.stand || 'Sin asignar',
      doneLabel: 'Montado',
      applies: true,
    },
    {
      field: 'powerConnected',
      icon: Plug,
      title: 'Energía',
      value: entrepreneur.needsPower ? 'Necesita toma eléctrica' : 'No necesita',
      doneLabel: 'Conectada',
      applies: entrepreneur.needsPower,
    },
    {
      field: 'chairsDelivered',
      icon: Armchair,
      title: 'Sillas',
      value: entrepreneur.chairs > 0 ? `${entrepreneur.chairs} sillas` : 'No pidió sillas',
      doneLabel: 'Entregadas',
      applies: entrepreneur.chairs > 0,
    },
  ];

  return (
    <div>
      {error && <StatusAlert tone="danger" title="No se guardó el cambio" className="mb-3">{error}</StatusAlert>}
      <ul className="space-y-2">
        {requirements.map(({ field, icon: Icon, title, value, doneLabel, applies }) => {
          const done = !!check?.[field];
          return (
            <li
              key={field}
              className={cn(
                'flex min-h-16 items-center gap-3 rounded-lg border px-3.5 py-2.5',
                done ? 'border-verde-600 bg-verde-50' : 'border-carbon-200 bg-white',
              )}
            >
              <Icon className={cn('size-6 shrink-0', done ? 'text-verde-700' : 'text-carbon-500')} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold tracking-wide text-carbon-500 uppercase">{title}</p>
                <p className="font-semibold text-carbon-900">{value}</p>
              </div>
              {applies ? (
                <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-semibold text-carbon-800">
                  <input
                    type="checkbox"
                    checked={done}
                    disabled={saving !== null || !canEdit}
                    onChange={(event) => void toggle(field, event.target.checked)}
                    className="size-6 cursor-pointer accent-verde-700 disabled:cursor-wait"
                  />
                  {saving === field ? 'Guardando…' : doneLabel}
                </label>
              ) : (
                <span className="px-2 text-sm text-carbon-400">No aplica</span>
              )}
            </li>
          );
        })}
      </ul>
      {check && (
        <p className="mt-2 text-xs text-carbon-500">
          Última actualización: {formatTime(check.updatedAt)} por {check.operator}
        </p>
      )}
    </div>
  );
}
