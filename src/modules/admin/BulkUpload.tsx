import { useState } from 'react';
import { FileDown, FileText } from 'lucide-react';
import { AsyncButton } from '../../components/ui/AsyncButton';
import { Card } from '../../components/ui/Card';
import { StatusAlert } from '../../components/ui/StatusAlert';
import { plural } from '../../lib/format';
import { describeError } from '../../lib/supabase';
import { importEntrepreneurs } from '../../store/actions';
import type { Entrepreneur } from '../../store/types';
import { FileDropzone } from './FileDropzone';
import { ImportPreview } from './ImportPreview';
import { parseEntrepreneurFile, type ParseResult } from './parseEntrepreneurFile';

// Las plantillas cargan sus librerías solo al descargarlas.
const loadTemplates = () => import('./templates');

export function BulkUpload({ existing }: { existing: Entrepreneur[] }) {
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [imported, setImported] = useState<number | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    setImported(null);
    setParsed(null);
    try {
      setParsed(await parseEntrepreneurFile(file, existing));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmImport() {
    if (!parsed) return;
    const rows = parsed.rows.filter((r) => r.errors.length === 0 && !r.duplicate).map((r) => r.data);
    setBusy(true);
    setError(null);
    try {
      setImported(await importEntrepreneurs(rows));
      setParsed(null);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title="Carga masiva de emprendedores"
      description="Columnas: N°, nombre del emprendimiento, responsable, teléfono, y si necesita stand, energía y cuántas sillas. Obligatorias: emprendimiento y responsable."
      actions={
        <>
          <AsyncButton variant="secondary" icon={FileDown} onRun={() => loadTemplates().then((m) => m.downloadExcelTemplate())}>
            Plantilla Excel
          </AsyncButton>
          <AsyncButton variant="secondary" icon={FileText} onRun={() => loadTemplates().then((m) => m.downloadWordTemplate())}>
            Plantilla Word
          </AsyncButton>
        </>
      }
    >
      <div className="space-y-3">
        {imported !== null && (
          <StatusAlert tone="success" title={`Se cargaron ${plural(imported, 'emprendedor', 'emprendedores')}`}>
            Ahora genera sus códigos QR desde la tabla de emprendedores.
          </StatusAlert>
        )}
        {error && (
          <StatusAlert tone="danger" title="No se pudo cargar el archivo">
            {error}
          </StatusAlert>
        )}
        {parsed ? (
          <ImportPreview parsed={parsed} onConfirm={() => void confirmImport()} onCancel={() => setParsed(null)} busy={busy} />
        ) : (
          <FileDropzone onFile={handleFile} busy={busy} />
        )}
      </div>
    </Card>
  );
}
