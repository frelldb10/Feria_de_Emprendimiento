import { useMemo } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { plural } from '../../lib/format';
import { useFairState } from '../../store/fairStore';
import { REPORTS } from './reportDefinitions';
import { KitWordButton, ReportDownloadButton } from './ReportDownloadButton';

export function ReportsPage() {
  const state = useFairState();
  const counts = useMemo(() => new Map(REPORTS.map((r) => [r.id, r.count(state)])), [state]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader title="Reportes" description="Cada reporte se descarga por separado como archivo de Excel (.xlsx)." />

      <div className="grid gap-4 md:grid-cols-2">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          const count = counts.get(report.id) ?? 0;
          return (
            <article key={report.id} className="flex flex-col rounded-xl border border-carbon-200 bg-white p-5">
              <div className="flex items-start gap-3">
                <span className="rounded-lg bg-carbon-100 p-2.5 text-carbon-700">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-semibold">{report.title}</h2>
                  <p className="text-sm text-carbon-500">{report.description}</p>
                </div>
              </div>

              <p className="mt-4 mb-5 flex items-start gap-2 text-sm text-carbon-700">
                <FileSpreadsheet className="mt-0.5 size-4 shrink-0 text-verde-700" aria-hidden />
                {report.evidence}
              </p>

              <div className="mt-auto flex items-center justify-between gap-3 border-t border-carbon-100 pt-4">
                <span className="text-sm font-semibold text-carbon-700">{plural(count, 'registro')}</span>
                <div className="flex flex-wrap justify-end gap-2">
                  {report.id === 'kits' && <KitWordButton />}
                  <ReportDownloadButton report={report.id} variant="primary" disabled={count === 0}>
                    Descargar Excel
                  </ReportDownloadButton>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
