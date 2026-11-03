import { useMemo, useState } from 'react';
import { Archive, ArrowDownRight, ArrowUpRight, Download, History, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { AsyncButton } from '../../components/ui/AsyncButton';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { StatusAlert } from '../../components/ui/StatusAlert';
import { cn } from '../../lib/cn';
import { fileStamp, formatDateTime, formatMoney, plural } from '../../lib/format';
import { describeError } from '../../lib/supabase';
import { downloadWorkbook } from '../../lib/xlsx';
import { deleteEdition } from '../../store/actions';
import { useFairState } from '../../store/fairStore';
import type { FairEdition } from '../../store/types';
import { useCanEdit } from '../auth/useCanEdit';
import { ArchiveModal } from './ArchiveModal';
import { buildEdition, buildEditionSheets, COMPARISON_ROWS, editionColumn, type EditionColumn } from './edition';

export function HistoryPage() {
  const state = useFairState();
  const canEdit = useCanEdit();
  const { editions } = state;
  const [archiving, setArchiving] = useState(false);

  const current = useMemo(() => buildEdition(state), [state]);
  const columns = useMemo<EditionColumn[]>(
    () => [
      { key: 'actual', name: 'Feria en curso', detail: 'Datos de hoy', ...current },
      ...editions.list.map(editionColumn),
    ],
    [current, editions.list],
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Historial de ferias"
        description="Cada feria guardada queda aquí para compararla con las siguientes."
        actions={
          canEdit &&
          editions.installed && (
            <Button icon={Archive} onClick={() => setArchiving(true)}>
              Guardar feria actual
            </Button>
          )
        }
      />

      {!editions.installed ? (
        <StatusAlert tone="warning" title="Falta actualizar la base de datos">
          En Supabase, abre SQL Editor, vuelve a ejecutar supabase/schema.sql y recarga esta página.
        </StatusAlert>
      ) : (
        <>
          {editions.list.length === 0 ? (
            <Card>
              <EmptyState icon={History} title="Todavía no hay ferias guardadas">
                Cuando termine la feria, toca "Guardar feria actual". Así la próxima feria se podrá comparar con esta, cifra por cifra.
              </EmptyState>
            </Card>
          ) : (
            <ComparisonTable columns={columns} />
          )}
          {editions.list.length > 0 && <SavedEditions editions={editions.list} canDelete={canEdit} />}
        </>
      )}

      <ArchiveModal open={archiving} onClose={() => setArchiving(false)} />
    </div>
  );
}

function Change({ value, older, money }: { value: number; older: number | null; money?: boolean }) {
  if (older === null) return null;
  if (value === older) return <span className="text-xs text-carbon-400">Igual</span>;
  const up = value > older;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  const text =
    older === 0 ? `${up ? '+' : '−'}${money ? formatMoney(Math.abs(value - older)) : Math.abs(value - older)}` : `${up ? '+' : '−'}${Math.round((Math.abs(value - older) / older) * 100)}%`;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold', up ? 'text-verde-700' : 'text-rojo-700')}>
      <Arrow className="size-3.5" aria-hidden />
      {text}
    </span>
  );
}

/** Una columna por feria, de la actual a la más antigua; cada cifra se compara con la feria de su derecha. */
function ComparisonTable({ columns }: { columns: EditionColumn[] }) {
  return (
    <Card title="Comparación" description="Cada cifra muestra el cambio frente a la feria anterior (la columna de la derecha)." flush>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: `${16 + columns.length * 11}rem` }}>
          <thead className="bg-carbon-50 text-left text-xs tracking-wide text-carbon-600 uppercase">
            <tr>
              <th className="sticky left-0 z-10 bg-carbon-50 px-4 py-3 font-semibold sm:pl-5">Dato</th>
              {columns.map((c, i) => (
                <th key={c.key} className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                  <span className={cn('block normal-case tracking-normal', i === 0 ? 'text-verde-700' : 'text-carbon-900')}>{c.name}</span>
                  <span className="block text-[0.6875rem] font-medium tracking-normal text-carbon-500 normal-case">{c.detail}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-carbon-100">
            {COMPARISON_ROWS.map((row) =>
              row.group ? (
                <tr key={row.label} className="bg-carbon-50/60">
                  <th colSpan={columns.length + 1} className="sticky left-0 px-4 pt-4 pb-2 text-left text-xs font-semibold tracking-wider text-carbon-500 uppercase sm:pl-5">
                    {row.label}
                  </th>
                </tr>
              ) : (
                <tr key={row.label}>
                  <th scope="row" className="sticky left-0 z-10 bg-white px-4 py-2.5 text-left font-medium text-carbon-800 sm:pl-5">
                    {row.label}
                  </th>
                  {columns.map((c, i) => {
                    const older = columns[i + 1];
                    const value = row.value(c, older);
                    const olderValue = older && value !== null ? row.value(older, columns[i + 2]) : null;
                    return (
                      <td key={c.key} className="px-4 py-2.5 text-right whitespace-nowrap tabular-nums">
                        <span className="block font-semibold text-carbon-900">
                          {value === null ? '—' : row.money ? formatMoney(value) : value}
                        </span>
                        {value !== null && <Change value={value} older={olderValue} money={row.money} />}
                      </td>
                    );
                  })}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function SavedEditions({ editions, canDelete }: { editions: FairEdition[]; canDelete: boolean }) {
  const [removing, setRemoving] = useState<FairEdition | null>(null);
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
      await deleteEdition(removing);
      setRemoving(null);
    } catch (error) {
      setFailure(describeError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Ferias guardadas" description="El Excel de cada una trae el resumen y la lista de emprendedores con sus resultados." flush>
      <ul className="divide-y divide-carbon-100">
        {editions.map((edition) => (
          <li key={edition.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
            <span className="rounded-lg bg-carbon-100 p-2.5 text-carbon-700">
              <Archive className="size-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-carbon-900">{edition.name}</span>
              <span className="block text-sm text-carbon-500">
                {plural(edition.summary.entrepreneurs, 'emprendedor', 'emprendedores')} · {formatMoney(edition.summary.sales.total)} en ventas ·
                Guardada {formatDateTime(edition.at)} por {edition.operator}
              </span>
            </span>
            <span className="flex gap-2">
              <AsyncButton
                variant="secondary"
                icon={Download}
                onRun={() => downloadWorkbook(`feria-astrea_historial_${fileStamp(new Date(edition.at))}.xlsx`, buildEditionSheets(edition))}
              >
                Excel
              </AsyncButton>
              {canDelete && (
                <Button variant="dangerGhost" icon={Trash2} onClick={() => setRemoving(edition)} aria-label={`Eliminar ${edition.name} del historial`}>
                  Eliminar
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>

      <Modal
        open={removing !== null}
        onClose={close}
        title="Eliminar del historial"
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
              Se elimina <span className="font-semibold text-carbon-900">{removing.name}</span> del historial y ya no se podrá comparar. Si
              la necesitas, descarga antes su Excel. No se puede deshacer.
            </p>
          </div>
        )}
      </Modal>
    </Card>
  );
}
