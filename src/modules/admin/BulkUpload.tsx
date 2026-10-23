import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusAlert } from '../../components/ui/StatusAlert';
import { plural } from '../../lib/format';
import { describeError } from '../../lib/supabase';
import { downloadWorkbook } from '../../lib/xlsx';
import { importEntrepreneurs } from '../../store/actions';
import { FileDropzone } from './FileDropzone';
import { ImportPreview } from './ImportPreview';
import { parseEntrepreneurFile, TEMPLATE_EXAMPLES, TEMPLATE_HEADERS, type ParseResult } from './parseEntrepreneurFile';

function downloadTemplate() {
  const textColumns = new Set(['documento', 'telefono']);
  return downloadWorkbook('plantilla-emprendedores.xlsx', [
    {
      name: 'Emprendedores',
      columns: TEMPLATE_HEADERS.map((header) => ({ header, text: textColumns.has(header), width: header === 'seccion' ? 24 : 18 })),
      rows: TEMPLATE_EXAMPLES,
    },
  ]);
}

export function BulkUpload({ existingDocuments }: { existingDocuments: Set<string> }) {
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
      setParsed(await parseEntrepreneurFile(file, existingDocuments));
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
      description="Obligatorias: documento, nombre y emprendimiento. La columna sección define el balance de ventas."
      actions={
        <Button variant="secondary" icon={FileDown} onClick={downloadTemplate}>
          Descargar plantilla
        </Button>
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
