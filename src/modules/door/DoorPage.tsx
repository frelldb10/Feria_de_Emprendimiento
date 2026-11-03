import { useMemo, useState } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { RecentScans } from '../../components/scan/RecentScans';
import { ScannerPanel } from '../../components/scan/ScannerPanel';
import { ScanResultScreen } from '../../components/scan/ScanResultScreen';
import { useScanner } from '../../components/scan/useScanner';
import { EntrepreneurSearch } from '../../components/shared/EntrepreneurSearch';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { StatusAlert } from '../../components/ui/StatusAlert';
import { Tabs } from '../../components/ui/Tabs';
import { formatTime, plural } from '../../lib/format';
import { describeError } from '../../lib/supabase';
import { deleteAttendance, registerAttendance, registerAttendanceByCode } from '../../store/actions';
import { useFairState } from '../../store/fairStore';
import { indexAttendance, indexEntrepreneurs } from '../../store/selectors';
import type { AttendanceRecord, Entrepreneur, EventDay } from '../../store/types';
import { NewEntrepreneurModal } from '../admin/NewEntrepreneurModal';
import { useAuth } from '../auth/AuthContext';
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
  // Agregar emprendedores y corregir ingresos es solo del administrador, no del operador de puerta.
  const isAdmin = useAuth().user?.role === 'admin';
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<AttendanceRecord | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeFailure, setRemoveFailure] = useState<string | null>(null);
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

  function closeRemove() {
    if (removeBusy) return;
    setRemoving(null);
    setRemoveFailure(null);
  }

  async function confirmRemove() {
    if (!removing) return;
    setRemoveBusy(true);
    setRemoveFailure(null);
    try {
      await deleteAttendance(removing, entrepreneurIndex.get(removing.entrepreneurId)?.businessName ?? 'un emprendedor');
      setRemoving(null);
    } catch (error) {
      setRemoveFailure(describeError(error));
    } finally {
      setRemoveBusy(false);
    }
  }

  const removingName = removing ? (entrepreneurIndex.get(removing.entrepreneurId)?.businessName ?? 'Emprendedor eliminado') : '';

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

              <Card
                title="Búsqueda manual"
                description="Si el QR no lee o la persona no lo trae."
                actions={
                  isAdmin && (
                    <Button variant="secondary" icon={UserPlus} onClick={() => setCreating(true)}>
                      Nuevo emprendedor
                    </Button>
                  )
                }
              >
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

        <Card
          title={isAdmin ? `Ingresos del Día ${day}` : `Últimos ingresos del Día ${day}`}
          description={isAdmin && dayEntries.length > 0 ? 'Con la papelera eliminas un ingreso mal registrado.' : undefined}
        >
          {/* El administrador ve todos los ingresos del día para poder corregir cualquiera. */}
          <div className={isAdmin ? 'max-h-[36rem] overflow-y-auto' : undefined}>
            <RecentScans
              entries={isAdmin ? dayEntries : dayEntries.slice(0, canEdit ? 10 : 30)}
              entrepreneurs={entrepreneurIndex}
              emptyTitle="Todavía no hay ingresos"
              onDelete={isAdmin ? setRemoving : undefined}
            />
          </div>
        </Card>
      </div>

      <NewEntrepreneurModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={handleManual}
        submitLabel={`Crear y registrar ingreso del Día ${day}`}
      />

      <Modal
        open={removing !== null}
        onClose={closeRemove}
        title="Eliminar ingreso"
        footer={
          <>
            <Button variant="secondary" onClick={closeRemove} disabled={removeBusy}>
              Cancelar
            </Button>
            <Button variant="danger" icon={Trash2} onClick={() => void confirmRemove()} disabled={removeBusy}>
              {removeBusy ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </>
        }
      >
        {removing && (
          <div className="space-y-3">
            {removeFailure && <StatusAlert tone="danger" title={removeFailure} />}
            <p className="text-carbon-700">
              Se elimina el ingreso del Día {removing.day} de <span className="font-semibold text-carbon-900">{removingName}</span>, registrado a
              las {formatTime(removing.at)} por {removing.operator}. Después podrá volver a ingresar con su QR. Queda anotado en la actividad.
            </p>
          </div>
        )}
      </Modal>

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
