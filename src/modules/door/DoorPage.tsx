import { useMemo, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';
import { RecentScans } from '../../components/scan/RecentScans';
import { ScannerPanel } from '../../components/scan/ScannerPanel';
import { ScanResultScreen } from '../../components/scan/ScanResultScreen';
import { useScanner } from '../../components/scan/useScanner';
import { EntrepreneurSearch } from '../../components/shared/EntrepreneurSearch';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
import { formatTime, plural } from '../../lib/format';
import { registerAttendance, registerAttendanceByCode } from '../../store/actions';
import { useFairState } from '../../store/fairStore';
import { indexAttendance, indexEntrepreneurs } from '../../store/selectors';
import type { Entrepreneur, EventDay } from '../../store/types';
import { useCanEdit } from '../auth/useCanEdit';

// Cada celular de puerta recuerda en qué día está trabajando.
const DAY_KEY = 'feria-astrea:puerta:dia';

function readStoredDay(): EventDay {
  try {
    return localStorage.getItem(DAY_KEY) === '2' ? 2 : 1;
  } catch {
    return 1;
  }
}

export function DoorPage() {
  const canEdit = useCanEdit();
  const { entrepreneurs, attendance } = useFairState();
  const [day, setDay] = useState<EventDay>(readStoredDay);
  const { result, busy, run, clear } = useScanner();
  const [lastCode, setLastCode] = useState<string | null>(null);

  const attendanceIndex = useMemo(() => indexAttendance(attendance), [attendance]);
  const entrepreneurIndex = useMemo(() => indexEntrepreneurs(entrepreneurs), [entrepreneurs]);
  const dayEntries = useMemo(
    () => attendance.filter((a) => a.day === day).sort((a, b) => b.at.localeCompare(a.at)),
    [attendance, day],
  );
  const counts = useMemo(
    () => ({
      1: attendance.filter((a) => a.day === 1).length,
      2: attendance.filter((a) => a.day === 2).length,
    }),
    [attendance],
  );
  const withQr = useMemo(() => entrepreneurs.filter((e) => e.qrCode), [entrepreneurs]);

  function changeDay(next: EventDay) {
    setDay(next);
    try {
      localStorage.setItem(DAY_KEY, String(next));
    } catch {
      // Sin almacenamiento solo se pierde la preferencia.
    }
  }

  function handleCode(code: string) {
    const normalized = code.trim().toUpperCase();
    setLastCode(normalized);
    void run(() => registerAttendanceByCode(normalized, day));
  }

  function handleManual(entrepreneur: Entrepreneur) {
    void run(() => registerAttendance(entrepreneur.id, day, 'manual'));
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-5 px-4 py-6 sm:px-6 lg:max-w-6xl lg:px-8 lg:py-8">
      <PageHeader
        title="Control de ingreso"
        description={`${counts[day]} de ${entrepreneurs.length} emprendedores han ingresado el Día ${day}.`}
      />

      {/* En el celular va todo en una columna; en escritorio, los últimos ingresos a la derecha. */}
      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <div className="space-y-5">
          <Tabs
            label="Día del evento"
            size="lg"
            value={day}
            onChange={changeDay}
            items={[
              { id: 1, label: 'Día 1', meta: plural(counts[1], 'ingreso') },
              { id: 2, label: 'Día 2', meta: plural(counts[2], 'ingreso') },
            ]}
          />

          {canEdit && (
            <>
              <Card title="Escanear QR">
                {withQr.length === 0 ? (
                  <p className="text-sm text-carbon-600">
                    Aún no hay códigos QR generados. El administrador debe hacer la generación masiva desde el panel.
                  </p>
                ) : (
                  <ScannerPanel onCode={handleCode} lastCode={lastCode} busy={busy} showingResult={result !== null} />
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
                    const record = attendanceIndex.get(e.id)?.[day];
                    return record ? (
                      <Badge tone="success">Ingresó {formatTime(record.at)}</Badge>
                    ) : (
                      <Badge>Sin ingreso el Día {day}</Badge>
                    );
                  }}
                />
              </Card>
            </>
          )}
        </div>

        <Card title={`Últimos ingresos del Día ${day}`}>
          <RecentScans
            entries={dayEntries.slice(0, canEdit ? 10 : 30)}
            entrepreneurs={entrepreneurIndex}
            emptyTitle="Todavía no hay ingresos"
          />
        </Card>
      </div>

      {result && (
        <ScanResultScreen
          result={result}
          onClose={clear}
          labels={{
            context: `Día ${day}`,
            ok: 'Ingreso registrado',
            duplicate: 'QR ya registrado',
            duplicateDetail: `Ya ingresó el Día ${day}`,
            duplicateHint: 'No permitas un segundo ingreso con este código.',
          }}
        />
      )}
    </div>
  );
}
