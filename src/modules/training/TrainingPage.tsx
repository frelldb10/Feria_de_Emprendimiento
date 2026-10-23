import { useMemo, useState } from 'react';
import { CalendarDays, MapPin } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { RecentScans } from '../../components/scan/RecentScans';
import { ScannerPanel } from '../../components/scan/ScannerPanel';
import { ScanResultScreen } from '../../components/scan/ScanResultScreen';
import { EntrepreneurSearch } from '../../components/shared/EntrepreneurSearch';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { formatDateOnly, formatTime } from '../../lib/format';
import { registerTraining, registerTrainingByCode, type ScanResult } from '../../store/actions';
import { useFairState } from '../../store/fairStore';
import { indexEntrepreneurs } from '../../store/selectors';
import type { Entrepreneur } from '../../store/types';
import { useAuth } from '../auth/AuthContext';
import { ReportDownloadButton } from '../reports/ReportDownloadButton';

export function TrainingPage() {
  const { operator } = useAuth();
  const { entrepreneurs, training } = useFairState();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [lastCode, setLastCode] = useState<string | null>(null);

  const attended = useMemo(() => new Map(training.attendance.map((a) => [a.entrepreneurId, a])), [training.attendance]);
  const entrepreneurIndex = useMemo(() => indexEntrepreneurs(entrepreneurs), [entrepreneurs]);
  const recent = useMemo(
    () => [...training.attendance].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8),
    [training.attendance],
  );
  const withQr = useMemo(() => entrepreneurs.filter((e) => e.qrCode), [entrepreneurs]);
  const { info } = training;

  function handleCode(code: string) {
    const normalized = code.trim().toUpperCase();
    setLastCode(normalized);
    setResult(registerTrainingByCode(normalized, operator));
  }

  function simulateScan() {
    const pending = withQr.filter((e) => !attended.has(e.id));
    const pool = pending.length > 0 ? pending : withQr;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    if (picked?.qrCode) handleCode(picked.qrCode);
  }

  function handleManual(entrepreneur: Entrepreneur) {
    setResult(registerTraining(entrepreneur.id, operator, 'manual'));
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-5 px-4 py-5 sm:py-8">
      <PageHeader
        title="Asistencia a capacitación"
        description={`${training.attendance.length} de ${entrepreneurs.length} emprendedores asistieron.`}
      />

      <div className="rounded-xl border border-carbon-200 bg-white px-4 py-3.5">
        <p className="font-display font-semibold text-carbon-900">{info.title}</p>
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-carbon-600">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4 text-carbon-400" aria-hidden />
            {info.date ? formatDateOnly(info.date) : 'Fecha sin definir'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4 text-carbon-400" aria-hidden />
            {info.place || 'Lugar sin definir'}
          </span>
        </p>
      </div>

      <Card title="Escanear QR" description="El mismo código que el emprendedor usa para entrar a la feria.">
        {withQr.length === 0 ? (
          <p className="text-sm text-carbon-600">
            Aún no hay códigos QR generados. El administrador debe hacer la generación masiva desde el panel.
          </p>
        ) : (
          <ScannerPanel onCode={handleCode} onSimulate={simulateScan} lastCode={lastCode} />
        )}
      </Card>

      <Card title="Búsqueda manual" description="Si el QR no lee o la persona no lo trae.">
        <EntrepreneurSearch
          entrepreneurs={entrepreneurs}
          onSelect={handleManual}
          label="Documento o nombre"
          placeholder="Ej. 1065812345 o Yarledis"
          actionLabel="Registrar"
          renderMeta={(e) => {
            const record = attended.get(e.id);
            return record ? <Badge tone="success">Asistió {formatTime(record.at)}</Badge> : <Badge>Sin registro</Badge>;
          }}
        />
      </Card>

      <Card
        title="Últimos registros"
        actions={<ReportDownloadButton report="capacitacion" disabled={training.attendance.length === 0}>Evidencia en Excel</ReportDownloadButton>}
      >
        <RecentScans entries={recent} entrepreneurs={entrepreneurIndex} emptyTitle="Todavía no hay asistentes registrados" />
      </Card>

      {result && (
        <ScanResultScreen
          result={result}
          onClose={() => setResult(null)}
          labels={{
            context: 'Capacitación',
            ok: 'Asistencia registrada',
            duplicate: 'Ya estaba registrado',
            duplicateDetail: 'Ya marcó asistencia a la capacitación',
            duplicateHint: 'La asistencia ya quedó guardada; no hace falta registrarla otra vez.',
          }}
        />
      )}
    </div>
  );
}
