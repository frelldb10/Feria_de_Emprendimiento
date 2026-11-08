import { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, ExternalLink, MapPin, Printer, Search, Trash2, UserRoundCheck, Users } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { StatCard } from '../../components/ui/StatCard';
import { StatusAlert } from '../../components/ui/StatusAlert';
import { formatDateTime, normalizeText, plural } from '../../lib/format';
import { describeError } from '../../lib/supabase';
import { deleteVisitor, setVisitorRegistrationOpen } from '../../store/actions';
import { useFairState } from '../../store/fairStore';
import { tourismStats, visitorPlace, visitorStats } from '../../store/visitors';
import type { Visitor } from '../../store/types';
import { useCanEdit } from '../auth/useCanEdit';
import { ReportDownloadButton } from '../reports/ReportDownloadButton';
import { TourismCard } from './TourismCard';
import { VisitorPosterModal } from './VisitorPosterModal';

const SHOWN = 200;

export function VisitorsPage() {
  const canEdit = useCanEdit();
  const { visitors } = useFairState();
  const [poster, setPoster] = useState(false);
  const [query, setQuery] = useState('');
  const stats = useMemo(() => visitorStats(visitors.list), [visitors.list]);
  const tourism = useMemo(() => tourismStats(visitors.list), [visitors.list]);
  const url = `${window.location.origin}/visita`;

  const filtered = useMemo(() => {
    const q = normalizeText(query);
    if (q.length < 2) return visitors.list;
    return visitors.list.filter(
      (v) => normalizeText(v.fullName).includes(q) || v.document.includes(q) || v.phone.includes(q) || normalizeText(v.originDetail).includes(q),
    );
  }, [visitors.list, query]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Visitantes"
        description="Personas que registraron su visita escaneando el QR."
        actions={
          <>
            <Button variant="secondary" icon={Printer} onClick={() => setPoster(true)} disabled={!visitors.installed}>
              Cartel con el QR
            </Button>
            <ReportDownloadButton report="turismo" disabled={visitors.list.length === 0}>
              Informe turístico
            </ReportDownloadButton>
            <ReportDownloadButton report="visitantes" disabled={visitors.list.length === 0} />
          </>
        }
      />

      {!visitors.installed ? (
        <StatusAlert tone="warning" title="Falta actualizar la base de datos">
          En Supabase, abre SQL Editor, ejecuta el SQL de visitantes (o vuelve a ejecutar supabase/schema.sql) y recarga esta página.
        </StatusAlert>
      ) : (
        <>
          {/* En escritorio, las cifras a la izquierda y el QR a la derecha. */}
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard
                  label="Visitantes registrados"
                  value={stats.total}
                  detail="Una sola vez por persona"
                  icon={Users}
                  accent="verde"
                />
                <StatCard label="Hoy" value={stats.today} detail="Registros de la fecha actual" icon={UserRoundCheck} accent="amarillo" />
                <StatCard
                  label="De fuera de Astrea"
                  value={stats.outsideAstrea}
                  detail={stats.total > 0 ? `${Math.round((stats.outsideAstrea / stats.total) * 100)}% del total` : 'Sin registros todavía'}
                  icon={MapPin}
                  accent="rojo"
                />
              </div>

              <div className="grid items-start gap-6 lg:grid-cols-2">
                <Card title="Por procedencia" description={plural(stats.total, 'registro')}>
                  <ul className="space-y-4">
                    {stats.byOrigin.map((o) => {
                      const share = stats.total > 0 ? Math.round((o.count / stats.total) * 100) : 0;
                      return (
                        <li key={o.origin}>
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="font-semibold text-carbon-900">{o.label}</span>
                            <span className="font-semibold tabular-nums text-carbon-900">{o.count}</span>
                          </div>
                          <div className="mt-1.5 h-3 rounded-r bg-carbon-100">
                            <div className="h-full rounded-r bg-verde-600" style={{ width: `${share}%` }} />
                          </div>
                          <p className="mt-1 text-xs text-carbon-500">{share}% de los visitantes</p>
                        </li>
                      );
                    })}
                  </ul>
                </Card>
                <Card title="Lugares más frecuentes" description="Barrio, vereda o municipio que escribieron.">
                  {stats.topPlaces.length === 0 ? (
                    <EmptyState icon={MapPin} title="Todavía no hay lugares registrados" />
                  ) : (
                    <ol className="divide-y divide-carbon-100">
                      {stats.topPlaces.map((p, i) => (
                        <li key={p.place} className="flex items-center gap-3 py-2.5">
                          <span className="w-5 text-right text-sm tabular-nums text-carbon-400">{i + 1}</span>
                          <span className="min-w-0 flex-1 truncate font-medium text-carbon-900">{p.place}</span>
                          <span className="font-semibold tabular-nums text-carbon-900">{p.count}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </Card>
              </div>
              <TourismCard stats={tourism} />
            </div>
            <RegistrationCard url={url} open={visitors.open} canEdit={canEdit} />
          </div>

          <VisitorList visitors={filtered} total={visitors.list.length} query={query} onQuery={setQuery} canDelete={canEdit} />
        </>
      )}

      <VisitorPosterModal open={poster} onClose={() => setPoster(false)} url={url} />
    </div>
  );
}

function RegistrationCard({ url, open, canEdit }: { url: string; open: boolean; canEdit: boolean }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  // En el computador de desarrollo la dirección es localhost: un celular no la puede abrir.
  const local = /localhost|127\.0\.0\.1|^http:\/\/192\.168\./.test(url);

  async function toggle() {
    setBusy(true);
    setMessage(null);
    try {
      await setVisitorRegistrationOpen(!open);
    } catch (error) {
      setMessage({ ok: false, text: describeError(error) });
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setMessage({ ok: true, text: 'Enlace copiado' });
    } catch {
      setMessage({ ok: false, text: 'No se pudo copiar. Selecciona el enlace a mano.' });
    }
  }

  return (
    <Card title="Registro con QR" actions={open ? <Badge tone="success">Abierto</Badge> : <Badge tone="danger">Cerrado</Badge>}>
      <div className="flex items-start gap-4">
        <div className="shrink-0 rounded-md border border-carbon-200 bg-white p-1.5">
          <QRCodeSVG value={url} size={96} level="M" marginSize={1} title="QR del formulario de visitantes" />
        </div>
        <div className="min-w-0 space-y-2">
          <p className="font-mono text-xs break-all text-carbon-600">{url}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={Copy} onClick={() => void copy()} className="h-9 px-3">
              Copiar
            </Button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-carbon-300 bg-white px-3 text-sm font-semibold text-carbon-800 shadow-card hover:bg-carbon-50"
            >
              <ExternalLink className="size-4" aria-hidden />
              Abrir
            </a>
          </div>
        </div>
      </div>
      {local && (
        <p className="mt-3 text-sm text-amarillo-900">
          Esta dirección solo sirve en este computador. Abre la app desde la dirección de Vercel para imprimir el QR.
        </p>
      )}
      <p className="mt-3 text-sm text-carbon-600">
        {open ? 'Cualquier persona con el QR puede registrarse.' : 'El QR muestra que el registro está cerrado.'}
      </p>
      {canEdit && (
        <Button variant={open ? 'secondary' : 'primary'} onClick={() => void toggle()} disabled={busy} fullWidth className="mt-3">
          {busy ? 'Guardando…' : open ? 'Cerrar el registro' : 'Abrir el registro'}
        </Button>
      )}
      {message && (
        <p className={message.ok ? 'mt-2 text-sm font-medium text-verde-700' : 'mt-2 text-sm font-medium text-rojo-700'}>{message.text}</p>
      )}
    </Card>
  );
}

interface VisitorListProps {
  visitors: Visitor[];
  total: number;
  query: string;
  onQuery: (value: string) => void;
  canDelete: boolean;
}

function VisitorList({ visitors, total, query, onQuery, canDelete }: VisitorListProps) {
  const [removing, setRemoving] = useState<Visitor | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  function close() {
    if (busy) return;
    setRemoving(null);
    setFailure(null);
  }

  async function confirm() {
    if (!removing) return;
    setBusy(true);
    setFailure(null);
    try {
      await deleteVisitor(removing);
      setRemoving(null);
    } catch (error) {
      setFailure(describeError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Registros" description={`${plural(total, 'visitante')} · los más recientes primero`} flush>
      <div className="border-b border-carbon-100 px-4 py-3 sm:px-5">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-carbon-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Buscar por nombre, cédula, teléfono o lugar"
            aria-label="Buscar visitantes"
            className="block h-10 w-full rounded-lg border border-carbon-300 pr-3 pl-9 text-sm placeholder:text-carbon-400 focus:border-verde-700 focus:ring-2 focus:ring-verde-700/20 focus:outline-none"
          />
        </div>
      </div>
      {visitors.length === 0 ? (
        <EmptyState icon={UserRoundCheck} title={total === 0 ? 'Todavía no hay visitantes registrados' : 'Sin coincidencias'}>
          {total === 0 && 'Imprime el cartel con el QR y ponlo en la entrada de la feria.'}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl text-left text-sm">
            <thead className="bg-carbon-50 text-xs tracking-wide text-carbon-600 uppercase">
              <tr>
                <th className="px-4 py-2.5 font-semibold sm:pl-5">Fecha y hora</th>
                <th className="px-3 py-2.5 font-semibold">Nombre</th>
                <th className="px-3 py-2.5 font-semibold">Cédula</th>
                <th className="px-3 py-2.5 font-semibold">Teléfono</th>
                <th className={canDelete ? 'px-3 py-2.5 font-semibold' : 'px-3 py-2.5 font-semibold sm:pr-5'}>Procedencia</th>
                {canDelete && (
                  <th className="px-3 py-2.5 sm:pr-5">
                    <span className="sr-only">Acciones</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-carbon-100">
              {visitors.slice(0, SHOWN).map((v) => (
                <tr key={v.id} className="hover:bg-carbon-50">
                  <td className="px-4 py-2.5 whitespace-nowrap text-carbon-600 tabular-nums sm:pl-5">{formatDateTime(v.at)}</td>
                  <td className="px-3 py-2.5 font-medium text-carbon-900">{v.fullName}</td>
                  <td className="px-3 py-2.5 tabular-nums">{v.document}</td>
                  <td className="px-3 py-2.5 tabular-nums">{v.phone || <span className="text-carbon-400">—</span>}</td>
                  <td className="px-3 py-2.5">{visitorPlace(v)}</td>
                  {canDelete && (
                    <td className="px-3 py-1.5 text-right sm:pr-5">
                      <button
                        type="button"
                        onClick={() => setRemoving(v)}
                        className="rounded-lg p-2 text-carbon-400 hover:bg-rojo-50 hover:text-rojo-700"
                        aria-label={`Eliminar el registro de ${v.fullName}`}
                        title="Eliminar registro"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {visitors.length > SHOWN && (
            <p className="border-t border-carbon-100 px-4 py-3 text-sm text-carbon-500 sm:px-5">
              Se muestran los {SHOWN} más recientes. Usa el buscador o descarga el Excel para verlos todos.
            </p>
          )}
        </div>
      )}

      <Modal
        open={removing !== null}
        onClose={close}
        title="Eliminar registro"
        footer={
          <>
            <Button variant="secondary" onClick={close} disabled={busy}>
              Cancelar
            </Button>
            <Button variant="danger" icon={Trash2} onClick={() => void confirm()} disabled={busy}>
              {busy ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </>
        }
      >
        {removing && (
          <div className="space-y-3">
            {failure && <StatusAlert tone="danger" title={failure} />}
            <p className="text-carbon-700">
              Se elimina el registro de <span className="font-semibold text-carbon-900">{removing.fullName}</span> (cédula{' '}
              {removing.document}). Úsalo para registros de prueba o mal hechos. No se puede deshacer.
            </p>
          </div>
        )}
      </Modal>
    </Card>
  );
}
