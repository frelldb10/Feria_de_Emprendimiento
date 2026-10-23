import { parseCsv } from '../../lib/csv';
import { normalizeText } from '../../lib/format';
import { parseSection } from '../../store/sections';
import type { NewEntrepreneur } from '../../store/types';

type FieldKey = keyof NewEntrepreneur;

// Encabezados aceptados por columna (se comparan en minúsculas y sin tildes).
const HEADER_ALIASES: Record<FieldKey, string[]> = {
  document: ['documento', 'cedula', 'cc', 'numero de documento', 'identificacion', 'nit'],
  ownerName: ['nombre', 'emprendedor', 'nombre completo', 'nombre del emprendedor'],
  businessName: ['emprendimiento', 'nombre del emprendimiento', 'negocio', 'marca'],
  phone: ['telefono', 'celular', 'contacto'],
  category: ['categoria', 'sector', 'linea'],
  section: ['seccion', 'seccion de la feria', 'area'],
  stand: ['stand', 'puesto'],
  needsPower: ['energia', 'requiere energia', 'toma electrica'],
  chairs: ['sillas', 'numero de sillas', 'cantidad de sillas'],
};

const REQUIRED: Partial<Record<FieldKey, string>> = {
  document: 'documento',
  ownerName: 'nombre',
  businessName: 'emprendimiento',
};

const YES = new Set(['si', 's', 'x', '1', 'true', 'yes']);

export const TEMPLATE_HEADERS = ['documento', 'nombre', 'emprendimiento', 'seccion', 'telefono', 'categoria', 'stand', 'energia', 'sillas'];
export const TEMPLATE_EXAMPLES = [
  ['1065000001', 'Nombre Apellido', 'Arepas de la Abuela', 'Gastronomía', '3000000001', 'Comidas', 'A-01', 'si', '2'],
  ['1065000002', 'Nombre Apellido', 'Tejidos del Cesar', 'Manualidades', '3000000002', 'Tejidos', 'A-02', 'no', '2'],
  ['1065000003', 'Nombre Apellido', 'Estilo y Belleza', 'Moda, Belleza y Estilo', '3000000003', 'Belleza', 'A-03', 'si', '1'],
];

export interface ParsedRow {
  /** Fila del archivo, contando el encabezado como fila 1. */
  line: number;
  data: NewEntrepreneur;
  errors: string[];
  duplicate: boolean;
}

export interface ParseResult {
  fileName: string;
  rows: ParsedRow[];
}

async function readRows(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    return parseCsv(await file.text());
  }
  if (name.endsWith('.xlsx')) {
    // Se carga solo cuando hace falta para no engordar la app de los operadores.
    const { readSheet } = await import('read-excel-file/browser');
    const data = await readSheet(file);
    return data.map((row) => row.map((cell) => (cell === null ? '' : String(cell))));
  }
  if (name.endsWith('.xls')) {
    throw new Error('El formato .xls (Excel 97-2003) no se puede leer. Ábrelo en Excel y guárdalo como .xlsx o .csv.');
  }
  throw new Error('Formato no compatible. Usa un archivo de Excel (.xlsx) o CSV.');
}

export async function parseEntrepreneurFile(file: File, existingDocuments: Set<string>): Promise<ParseResult> {
  const rows = (await readRows(file))
    .map((cells, index) => ({ cells: cells.map((c) => c.trim()), line: index + 1 }))
    .filter((row) => row.cells.some(Boolean));
  if (rows.length === 0) throw new Error('El archivo está vacío.');

  const header = rows[0].cells.map(normalizeText);
  const columns: Partial<Record<FieldKey, number>> = {};
  for (const key of Object.keys(HEADER_ALIASES) as FieldKey[]) {
    const index = header.findIndex((h) => HEADER_ALIASES[key].includes(h));
    if (index !== -1) columns[key] = index;
  }

  const missing = (Object.keys(REQUIRED) as FieldKey[]).filter((key) => columns[key] === undefined);
  if (missing.length > 0) {
    throw new Error(
      `Faltan columnas obligatorias: ${missing.map((key) => REQUIRED[key]).join(', ')}. Descarga la plantilla para ver el formato.`,
    );
  }
  if (rows.length === 1) throw new Error('El archivo solo tiene encabezados, sin emprendedores.');

  const seen = new Set<string>();
  const parsed = rows.slice(1).map(({ cells, line }): ParsedRow => {
    const get = (key: FieldKey) => {
      const index = columns[key];
      return index === undefined ? '' : (cells[index] ?? '');
    };

    const document = get('document').replace(/[.\s-]/g, '');
    const chairsText = get('chairs');
    const chairs = chairsText === '' ? 0 : Number(chairsText);
    const errors: string[] = [];
    if (!document) errors.push('Falta el documento');
    if (!get('ownerName')) errors.push('Falta el nombre');
    if (!get('businessName')) errors.push('Falta el emprendimiento');
    if (!Number.isInteger(chairs) || chairs < 0) errors.push('Sillas debe ser un número entero');
    const section = parseSection(get('section'));
    if (section === undefined) errors.push(`Sección "${get('section')}" no reconocida`);

    const duplicate = document !== '' && (existingDocuments.has(document) || seen.has(document));
    if (document) seen.add(document);

    return {
      line,
      errors,
      duplicate,
      data: {
        document,
        ownerName: get('ownerName'),
        businessName: get('businessName'),
        phone: get('phone'),
        category: get('category'),
        section: section ?? null,
        stand: get('stand').toUpperCase(),
        needsPower: YES.has(normalizeText(get('needsPower'))),
        chairs: Number.isInteger(chairs) && chairs > 0 ? chairs : 0,
      },
    };
  });

  return { fileName: file.name, rows: parsed };
}
