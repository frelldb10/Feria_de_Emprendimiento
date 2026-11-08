import { useMemo } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { BrandStripe } from '../../components/brand/BrandStripe';
import { PageHeader } from '../../components/layout/PageHeader';
import { cn } from '../../lib/cn';
import { plural } from '../../lib/format';
import { useFairState } from '../../store/fairStore';
import { REPORTS, type ReportDefinition, type ReportGroup } from './reportDefinitions';
import { KitWordButton, ReportDownloadButton } from './ReportDownloadButton';

const GROUPS: Array<{ id: Exclude<ReportGroup, 'general'>; title: string; description: string }> = [
  { id: 'operacion', title: 'Operación de la feria', description: 'Puerta, capacitación y entregas' },
  { id: 'finanzas', title: 'Finanzas', description: 'Bonos, ventas y caja menor' },
  { id: 'publico', title: 'Público', description: 'Personas que visitaron la feria' },
];

// El color del ícono identifica el grupo, con los mismos tonos de los logos.
const ICON_TONE: Record<ReportGroup, string> = {
  general: 'bg-verde-700 text-white',
  operacion: 'bg-verde-50 text-verde-700 ring-1 ring-inset ring-verde-200',
  finanzas: 'bg-amarillo-50 text-amarillo-700 ring-1 ring-inset ring-amarillo-400/60',
  publico: 'bg-carbon-100 text-carbon-700 ring-1 ring-inset ring-carbon-200',
};

function SheetList({ report }: { report: ReportDefinition }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Hojas del archivo">
      {report.contents.map((sheet) => (
        <li key={sheet} className="inline-flex items-center gap-1 rounded-md bg-carbon-50 px-2 py-1 text-xs font-medium text-carbon-600 ring-1 ring-inset ring-carbon-200">
          <FileSpreadsheet className="size-3.5 text-verde-700" aria-hidden />
          {sheet}
        </li>
      ))}
    </ul>
  );
}

function ReportCard({ report, count }: { report: ReportDefinition; count: number }) {
  const Icon = report.icon;
  return (
    <article className="flex flex-col rounded-lg border border-carbon-200 bg-white shadow-card">
      <div className="flex items-start gap-3 px-5 pt-5">
        <span className={cn('rounded-lg p-2.5', ICON_TONE[report.group])}>
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-carbon-900">{report.title}</h3>
          <p className="mt-0.5 text-sm text-carbon-500">{report.description}</p>
        </div>
      </div>
      <div className="px-5 pt-4 pb-5">
        <SheetList report={report} />
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-carbon-100 bg-carbon-50/60 px-5 py-3">
        <span className={cn('text-sm font-semibold', count > 0 ? 'text-carbon-700' : 'text-carbon-400')}>{plural(count, 'registro')}</span>
        <div className="flex flex-wrap justify-end gap-2">
          {report.id === 'kits' && <KitWordButton />}
          <ReportDownloadButton report={report.id} variant="primary" disabled={count === 0}>
            Descargar Excel
          </ReportDownloadButton>
        </div>
      </div>
    </article>
  );
}

export function ReportsPage() {
  const state = useFairState();
  const counts = useMemo(() => new Map(REPORTS.map((r) => [r.id, r.count(state)])), [state]);
  const general = REPORTS.find((r) => r.group === 'general')!;
  const generalCount = counts.get(general.id) ?? 0;
  const GeneralIcon = general.icon;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Reportes"
        description="Archivos de Excel con el membrete de la Alcaldía, cifras destacadas y listos para imprimir en hoja carta."
      />

      <article className="overflow-hidden rounded-lg border border-carbon-200 bg-white shadow-card">
        <BrandStripe />
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center">
          <span className={cn('self-start rounded-lg p-3', ICON_TONE.general)}>
            <GeneralIcon className="size-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-verde-700 uppercase">Recomendado para entregar</p>
              <h2 className="mt-0.5 text-lg font-semibold text-carbon-900 sm:text-xl">{general.title}</h2>
              <p className="mt-1 max-w-2xl text-sm text-carbon-500">{general.description}</p>
            </div>
            <SheetList report={general} />
          </div>
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <ReportDownloadButton report={general.id} variant="primary" disabled={generalCount === 0}>
              Descargar informe general
            </ReportDownloadButton>
            <span className="text-sm text-carbon-500">{plural(generalCount, 'emprendedor', 'emprendedores')}</span>
          </div>
        </div>
      </article>

      {GROUPS.map((group) => {
        const reports = REPORTS.filter((r) => r.group === group.id);
        return (
          <section key={group.id} aria-labelledby={`grupo-${group.id}`} className="space-y-3">
            <div className="flex items-baseline gap-3 border-b border-carbon-200 pb-2">
              <h2 id={`grupo-${group.id}`} className="text-sm font-semibold tracking-wide text-carbon-800 uppercase">
                {group.title}
              </h2>
              <p className="text-sm text-carbon-500">{group.description}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {reports.map((report) => (
                <ReportCard key={report.id} report={report} count={counts.get(report.id) ?? 0} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
