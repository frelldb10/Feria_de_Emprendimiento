import { Upload, X } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { plural } from '../../lib/format';
import { sectionLabel } from '../../store/sections';
import type { ParseResult } from './parseEntrepreneurFile';

interface ImportPreviewProps {
  parsed: ParseResult;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ImportPreview({ parsed, onConfirm, onCancel }: ImportPreviewProps) {
  const valid = parsed.rows.filter((r) => r.errors.length === 0 && !r.duplicate).length;
  const withErrors = parsed.rows.filter((r) => r.errors.length > 0).length;
  const duplicates = parsed.rows.filter((r) => r.errors.length === 0 && r.duplicate).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="mr-1 font-semibold text-carbon-800">{parsed.fileName}</span>
        <Badge tone="success">{plural(valid, 'lista', 'listas')} para cargar</Badge>
        {withErrors > 0 && <Badge tone="danger">{plural(withErrors, 'con error', 'con errores')}</Badge>}
        {duplicates > 0 && <Badge tone="warning">{plural(duplicates, 'duplicada', 'duplicadas')}</Badge>}
      </div>

      <div className="max-h-80 overflow-auto rounded-lg border border-carbon-200">
        <table className="w-full min-w-3xl text-left text-sm">
          <thead className="sticky top-0 bg-carbon-100 text-xs tracking-wide text-carbon-600 uppercase">
            <tr>
              <th className="px-3 py-2 font-semibold">Fila</th>
              <th className="px-3 py-2 font-semibold">Documento</th>
              <th className="px-3 py-2 font-semibold">Emprendedor</th>
              <th className="px-3 py-2 font-semibold">Emprendimiento</th>
              <th className="px-3 py-2 font-semibold">Sección</th>
              <th className="px-3 py-2 font-semibold">Stand</th>
              <th className="px-3 py-2 font-semibold">Energía</th>
              <th className="px-3 py-2 font-semibold">Sillas</th>
              <th className="px-3 py-2 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-carbon-100">
            {parsed.rows.map((row) => (
              <tr key={row.line} className={row.errors.length > 0 ? 'bg-rojo-50/60' : undefined}>
                <td className="px-3 py-2 tabular-nums text-carbon-500">{row.line}</td>
                <td className="px-3 py-2 tabular-nums">{row.data.document || '—'}</td>
                <td className="px-3 py-2">{row.data.ownerName || '—'}</td>
                <td className="px-3 py-2">{row.data.businessName || '—'}</td>
                <td className="px-3 py-2">{sectionLabel(row.data.section)}</td>
                <td className="px-3 py-2">{row.data.stand || '—'}</td>
                <td className="px-3 py-2">{row.data.needsPower ? 'Sí' : 'No'}</td>
                <td className="px-3 py-2 tabular-nums">{row.data.chairs}</td>
                <td className="px-3 py-2">
                  {row.errors.length > 0 ? (
                    <span className="font-medium text-rojo-700">{row.errors.join('. ')}</span>
                  ) : row.duplicate ? (
                    <Badge tone="warning">Documento repetido</Badge>
                  ) : (
                    <Badge tone="success">Lista</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-carbon-500">
        Solo se cargan las filas marcadas como listas. Las repetidas ya existen en el sistema o aparecen dos veces en el archivo.
      </p>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" icon={X} onClick={onCancel}>
          Descartar
        </Button>
        <Button icon={Upload} onClick={onConfirm} disabled={valid === 0}>
          Cargar {plural(valid, 'emprendedor', 'emprendedores')}
        </Button>
      </div>
    </div>
  );
}
