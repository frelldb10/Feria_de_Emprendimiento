import { useMemo, useState } from 'react';
import { ChevronRight, PackageCheck } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { EntrepreneurSearch } from '../../components/shared/EntrepreneurSearch';
import { EntrepreneurSummary } from '../../components/shared/EntrepreneurSummary';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { cn } from '../../lib/cn';
import { useFairState } from '../../store/fairStore';
import { indexKits, isKitComplete } from '../../store/selectors';
import type { Entrepreneur, KitDelivery } from '../../store/types';
import { KitWordButton } from '../reports/ReportDownloadButton';
import { KitChecklist } from './KitChecklist';
import { RequirementsPanel } from './RequirementsPanel';

function KitBadge({ delivery }: { delivery?: KitDelivery }) {
  if (isKitComplete(delivery)) return <Badge tone="success">Kit completo</Badge>;
  if (delivery) return <Badge tone="warning">Kit parcial</Badge>;
  return <Badge>Kit pendiente</Badge>;
}

export function LogisticsPage() {
  const { entrepreneurs, kits, logistics } = useFairState();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const kitIndex = useMemo(() => indexKits(kits), [kits]);
  const pending = useMemo(
    () => entrepreneurs.filter((e) => !isKitComplete(kitIndex.get(e.id))),
    [entrepreneurs, kitIndex],
  );
  const selected = selectedId ? entrepreneurs.find((e) => e.id === selectedId) : undefined;

  function select(entrepreneur: Entrepreneur) {
    setSelectedId(entrepreneur.id);
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-5 px-4 py-6 sm:px-6 lg:max-w-6xl lg:px-8 lg:py-8">
      <PageHeader
        title="Logística y kits"
        description={`${entrepreneurs.length - pending.length} de ${entrepreneurs.length} kits entregados completos.`}
        actions={<KitWordButton />}
      />

      {/*
        Celular: buscador y, debajo, el emprendedor elegido o la lista de pendientes.
        Escritorio: buscador y emprendedor elegido a la izquierda; pendientes siempre a la derecha.
      */}
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="space-y-5">
          <EntrepreneurSearch
            entrepreneurs={entrepreneurs}
            onSelect={select}
            renderMeta={(e) => <KitBadge delivery={kitIndex.get(e.id)} />}
          />

          {selected ? (
            <>
              <EntrepreneurSummary entrepreneur={selected} onClear={() => setSelectedId(null)}>
                <KitBadge delivery={kitIndex.get(selected.id)} />
              </EntrepreneurSummary>
              <Card title="Requerimientos">
                <RequirementsPanel entrepreneur={selected} check={logistics[selected.id]} />
              </Card>
              <Card title="Entrega del kit">
                <KitChecklist key={selected.id} entrepreneur={selected} delivery={kitIndex.get(selected.id)} />
              </Card>
            </>
          ) : (
            <p className="hidden rounded-lg border border-dashed border-carbon-300 px-5 py-8 text-center text-sm text-carbon-500 lg:block">
              Busca un emprendedor o elígelo en la lista de pendientes para revisar su stand y entregar el kit.
            </p>
          )}
        </div>

        <Card title="Pendientes de kit" description="Toca un emprendedor para atenderlo." flush className={selected ? 'hidden lg:block' : undefined}>
          {pending.length === 0 ? (
            <EmptyState icon={PackageCheck} title="Todos los kits están entregados" />
          ) : (
            <ul className="divide-y divide-carbon-100">
              {pending.slice(0, 12).map((entrepreneur) => (
                <li key={entrepreneur.id}>
                  <button
                    type="button"
                    onClick={() => select(entrepreneur)}
                    aria-current={entrepreneur.id === selectedId ? 'true' : undefined}
                    className={cn(
                      'flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-carbon-50 sm:px-5',
                      entrepreneur.id === selectedId && 'bg-verde-50 hover:bg-verde-50',
                    )}
                  >
                    <span className="w-12 shrink-0 font-mono text-sm font-semibold text-carbon-600">{entrepreneur.stand || '—'}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-carbon-900">{entrepreneur.businessName}</span>
                      <span className="block truncate text-sm text-carbon-500">{entrepreneur.ownerName}</span>
                    </span>
                    <KitBadge delivery={kitIndex.get(entrepreneur.id)} />
                    <ChevronRight className="size-5 shrink-0 text-carbon-400" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {pending.length > 12 && (
            <p className="border-t border-carbon-100 px-4 py-3 text-sm text-carbon-500 sm:px-5">
              Y {pending.length - 12} más. Usa el buscador para encontrarlos.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
