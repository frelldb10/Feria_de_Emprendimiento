import { useMemo, useState } from 'react';
import { Store } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Chips } from '../../components/ui/Chips';
import { EmptyState } from '../../components/ui/EmptyState';
import { SearchInput } from '../../components/ui/SearchInput';
import { Tabs } from '../../components/ui/Tabs';
import { formatMoney, normalizeText } from '../../lib/format';
import { recordSale } from '../../store/actions';
import { useFairState } from '../../store/fairStore';
import { SECTIONS } from '../../store/sections';
import { SALE_CUTS, type EventDay, type SaleCut, type SectionId } from '../../store/types';
import { useAuth } from '../auth/AuthContext';
import { SaleRow } from './SaleRow';

type SectionFilter = SectionId | 'all';

export function SalesCapture() {
  const { operator } = useAuth();
  const { entrepreneurs, sales } = useFairState();
  const [day, setDay] = useState<EventDay>(1);
  const [cut, setCut] = useState<SaleCut>(1);
  const [section, setSection] = useState<SectionFilter>('all');
  const [query, setQuery] = useState('');

  const daySales = useMemo(() => sales.filter((s) => s.day === day), [sales, day]);
  const records = useMemo(
    () => new Map(daySales.filter((s) => s.cut === cut).map((s) => [s.entrepreneurId, s])),
    [daySales, cut],
  );
  const dayTotal = (d: EventDay) => sales.filter((s) => s.day === d).reduce((sum, s) => sum + s.amount, 0);

  const visible = useMemo(() => {
    const q = normalizeText(query);
    return entrepreneurs
      .filter((e) => section === 'all' || e.section === section)
      .filter(
        (e) =>
          !q ||
          normalizeText(e.businessName).includes(q) ||
          normalizeText(e.ownerName).includes(q) ||
          normalizeText(e.stand) === q ||
          e.document.includes(q),
      )
      .sort((a, b) => a.stand.localeCompare(b.stand) || a.businessName.localeCompare(b.businessName));
  }, [entrepreneurs, section, query]);

  const pending = visible.filter((e) => !records.has(e.id)).length;
  const visibleTotal = visible.reduce((sum, e) => sum + (records.get(e.id)?.amount ?? 0), 0);

  return (
    <div className="space-y-4">
      <Tabs
        label="Día"
        value={day}
        onChange={setDay}
        items={[
          { id: 1, label: 'Día 1', meta: formatMoney(dayTotal(1)) },
          { id: 2, label: 'Día 2', meta: formatMoney(dayTotal(2)) },
        ]}
      />
      <Tabs
        label="Corte"
        size="lg"
        value={cut}
        onChange={setCut}
        items={SALE_CUTS.map((c) => ({
          id: c,
          label: `Corte ${c}`,
          meta: `${daySales.filter((s) => s.cut === c).length} de ${entrepreneurs.length}`,
        }))}
      />
      <Chips<SectionFilter>
        label="Sección"
        value={section}
        onChange={setSection}
        items={[
          { id: 'all', label: 'Todas', count: entrepreneurs.length },
          ...SECTIONS.map((s) => ({ id: s.id, label: s.label, count: entrepreneurs.filter((e) => e.section === s.id).length })),
        ]}
      />
      <SearchInput value={query} onChange={setQuery} label="Buscar emprendedor" placeholder="Buscar por nombre, documento o stand" />

      <Card
        title={`Día ${day} · Corte ${cut}`}
        description={`${pending} pendientes · ${formatMoney(visibleTotal)} registrados en esta vista`}
        flush
      >
        <p className="border-b border-carbon-100 px-4 py-2.5 text-sm text-carbon-500 sm:px-5">
          {cut === 1
            ? 'Corte 1: escribe lo vendido desde que abrió el stand hasta este momento.'
            : 'Corte 2 (cierre): escribe lo vendido desde el corte 1 hasta el cierre.'}{' '}
          El sistema suma el total del día.
        </p>
        {visible.length === 0 ? (
          <EmptyState icon={Store} title="No hay emprendedores en esta vista" />
        ) : (
          <ul className="divide-y divide-carbon-100">
            {visible.map((e) => {
              const record = records.get(e.id);
              return (
                <SaleRow
                  key={`${e.id}-${day}-${cut}-${record?.id ?? 'nuevo'}`}
                  entrepreneur={e}
                  record={record}
                  onSave={(amount) => recordSale(e.id, day, cut, amount, operator)}
                />
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
