import { useMemo, useState } from 'react';
import { Printer, QrCode, Search } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { cn } from '../../lib/cn';
import { generateMissingQrCodes, setEntrepreneurSection } from '../../store/actions';
import { useFairState } from '../../store/fairStore';
import { SECTIONS } from '../../store/sections';
import { indexAttendance, searchEntrepreneurs } from '../../store/selectors';
import { EVENT_DAYS, type Entrepreneur, type SectionId } from '../../store/types';
import { QrSheetModal } from './QrSheetModal';

export function EntrepreneursTable() {
  const { entrepreneurs, attendance } = useFairState();
  const [query, setQuery] = useState('');
  const [sheet, setSheet] = useState<{ title: string; list: Entrepreneur[] } | null>(null);

  const attendanceIndex = useMemo(() => indexAttendance(attendance), [attendance]);
  const filtered = useMemo(
    () => (query.trim().length >= 2 ? searchEntrepreneurs(entrepreneurs, query, Infinity) : entrepreneurs),
    [entrepreneurs, query],
  );
  const pendingQr = entrepreneurs.filter((e) => !e.qrCode).length;

  function generate() {
    const generated = generateMissingQrCodes();
    if (generated.length > 0) setSheet({ title: `Se generaron ${generated.length} códigos QR`, list: generated });
  }

  return (
    <Card
      title="Emprendedores cargados"
      description={`${entrepreneurs.length} registrados · ${pendingQr} sin código QR`}
      flush
      actions={
        <>
          <Button
            variant="secondary"
            icon={Printer}
            onClick={() => setSheet({ title: 'Hoja de códigos QR', list: entrepreneurs })}
            disabled={entrepreneurs.length === pendingQr}
          >
            Hoja de QR
          </Button>
          <Button icon={QrCode} onClick={generate} disabled={pendingQr === 0}>
            Generación masiva de QR{pendingQr > 0 ? ` (${pendingQr})` : ''}
          </Button>
        </>
      }
    >
      <div className="border-b border-carbon-100 px-4 py-3 sm:px-5">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-carbon-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrar por nombre, documento o stand"
            aria-label="Filtrar emprendedores"
            className="block h-10 w-full rounded-lg border border-carbon-300 pr-3 pl-9 text-sm placeholder:text-carbon-400 focus:border-verde-700 focus:ring-2 focus:ring-verde-700/20 focus:outline-none"
          />
        </div>
      </div>

      <div className="max-h-120 overflow-auto">
        <table className="w-full min-w-280 text-left text-sm">
          <thead className="sticky top-0 z-10 bg-carbon-50 text-xs tracking-wide text-carbon-600 uppercase shadow-[inset_0_-1px_0] shadow-carbon-200">
            <tr>
              <th className="px-4 py-2.5 font-semibold sm:pl-5">Documento</th>
              <th className="px-3 py-2.5 font-semibold">Emprendedor</th>
              <th className="px-3 py-2.5 font-semibold">Emprendimiento</th>
              <th className="px-3 py-2.5 font-semibold">Sección</th>
              <th className="px-3 py-2.5 font-semibold">Stand</th>
              <th className="px-3 py-2.5 font-semibold">Energía</th>
              <th className="px-3 py-2.5 font-semibold">Sillas</th>
              <th className="px-3 py-2.5 font-semibold">Código QR</th>
              <th className="px-3 py-2.5 font-semibold sm:pr-5">Asistencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-carbon-100">
            {filtered.map((e) => {
              const attended = attendanceIndex.get(e.id);
              return (
                <tr key={e.id} className="hover:bg-carbon-50">
                  <td className="px-4 py-2.5 tabular-nums sm:pl-5">{e.document}</td>
                  <td className="px-3 py-2.5 font-medium text-carbon-900">{e.ownerName}</td>
                  <td className="px-3 py-2.5">{e.businessName}</td>
                  <td className="px-3 py-1.5">
                    <select
                      value={e.section ?? ''}
                      onChange={(event) => setEntrepreneurSection(e.id, (event.target.value || null) as SectionId | null)}
                      aria-label={`Sección de ${e.businessName}`}
                      className={cn(
                        'h-9 w-full max-w-52 rounded-md border bg-white px-2 text-sm focus:border-verde-700 focus:outline-none',
                        e.section ? 'border-carbon-200' : 'border-amarillo-500 text-amarillo-900',
                      )}
                    >
                      <option value="">Sin sección</option>
                      {SECTIONS.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">{e.stand || '—'}</td>
                  <td className="px-3 py-2.5">{e.needsPower ? 'Sí' : 'No'}</td>
                  <td className="px-3 py-2.5 tabular-nums">{e.chairs}</td>
                  <td className="px-3 py-2.5">
                    {e.qrCode ? <span className="font-mono text-xs whitespace-nowrap">{e.qrCode}</span> : <Badge tone="warning">Pendiente</Badge>}
                  </td>
                  <td className="px-3 py-2.5 sm:pr-5">
                    <span className="flex gap-1">
                      {EVENT_DAYS.map((day) => (
                        <span
                          key={day}
                          title={attended?.[day] ? `Ingresó el Día ${day}` : `Sin ingreso el Día ${day}`}
                          className={cn(
                            'rounded px-1.5 py-0.5 text-xs font-semibold',
                            attended?.[day] ? 'bg-verde-600 text-white' : 'bg-carbon-100 text-carbon-400',
                          )}
                        >
                          D{day}
                        </span>
                      ))}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-carbon-500">
            {entrepreneurs.length === 0 ? 'Aún no hay emprendedores. Carga el archivo de Excel para empezar.' : 'Sin coincidencias.'}
          </p>
        )}
      </div>

      <QrSheetModal entrepreneurs={sheet?.list ?? null} title={sheet?.title ?? ''} onClose={() => setSheet(null)} />
    </Card>
  );
}
