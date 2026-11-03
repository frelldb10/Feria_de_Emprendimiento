import { parseCsv } from '../../lib/csv';
import { normalizeText } from '../../lib/format';
import { parseSection } from '../../store/sections';
import type { Entrepreneur, NewEntrepreneur } from '../../store/types';

// ownStand es la pregunta al revés de needsStand ("¿Cuenta con stand propio?" del formulario de inscripción).
type FieldKey = keyof NewEntrepreneur | 'ownStand';
type Columns = Partial<Record<FieldKey, number>>;

// Encabezados aceptados por columna, ya pasados por headerText.
const HEADER_ALIASES: Record<FieldKey, string[]> = {
  businessName: ['nombre del emprendimiento', 'emprendimiento', 'negocio', 'marca'],
  ownerName: ['responsable', 'nombre del responsable', 'nombre', 'nombre completo', 'emprendedor', 'nombre del emprendedor'],
  phone: ['telefono', 'celular', 'contacto', 'whatsapp', 'numero de contacto', 'numero de contacto whatsapp'],
  document: ['documento', 'numero de documento', 'cedula', 'cc', 'identificacion', 'numero de identificacion', 'nit'],
  category: ['categoria', 'sector', 'linea', 'tipo de emprendimiento'],
  section: ['seccion', 'seccion de la feria', 'area'],
  stand: ['stand', 'puesto', 'numero de stand'],
  needsStand: ['necesita stand', 'requiere stand'],
  ownStand: ['cuenta con stand propio', 'tiene stand propio', 'stand propio'],
  needsPower: ['necesita energia', 'energia', 'requiere energia', 'toma electrica', 'su emprendimiento requiere electricidad'],
  chairs: ['cuantas sillas', 'sillas', 'numero de sillas', 'cantidad de sillas'],
};

const REQUIRED: { key: FieldKey; label: string }[] = [
  { key: 'businessName', label: 'NOMBRE DEL EMPRENDIMIENTO' },
  { key: 'ownerName', label: 'RESPONSABLE' },
];

const YES = new Set(['si', 's', 'x', '1', 'true', 'yes']);
const NO_CHAIRS = new Set(['', 'no', 'ninguna', 'ninguno']);

/** Formato de la feria: el título "¿Qué necesita para su puesto?" agrupa las tres últimas columnas. */
export const TEMPLATE = {
  columns: [
    { header: 'N°', width: 6 },
    { header: 'NOMBRE DEL EMPRENDIMIENTO', width: 32 },
    { header: 'RESPONSABLE', width: 32 },
    { header: 'TELÉFONO', width: 16 },
  ],
  group: '¿QUÉ NECESITA PARA SU PUESTO?',
  groupColumns: [
    { header: '¿Necesita STAND?', width: 15 },
    { header: '¿Necesita ENERGÍA?', width: 15 },
    { header: '¿Cuántas SILLAS?', width: 15 },
  ],
  examples: [
    ['1', 'Arepas de la Abuela', 'Nombre Apellido', '3000000001', 'SÍ', 'SÍ', '2'],
    ['2', 'Tejidos del Cesar', 'Nombre Apellido', '3000000002', 'NO', 'NO', '2'],
    ['3', 'Estilo y Belleza', 'Nombre Apellido', '3000000003', 'SÍ', 'SÍ', '1'],
  ],
};

export interface ParsedRow {
  /** Fila del archivo, contando los encabezados. */
  line: number;
  data: NewEntrepreneur;
  errors: string[];
  duplicate: boolean;
}

export interface ParseResult {
  fileName: string;
  /** Hoja o tabla que se leyó, cuando el archivo tiene varias. */
  source: string | null;
  rows: ParsedRow[];
}

interface Table {
  name: string;
  rows: string[][];
}

/** Todas las tablas del archivo: cada hoja de Excel o cada tabla de Word. */
async function readTables(file: File): Promise<Table[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    return [{ name: '', rows: parseCsv(await file.text()) }];
  }
  if (name.endsWith('.xlsx')) {
    // Se carga solo cuando hace falta para no engordar la app de los operadores.
    const { default: readXlsxFile } = await import('read-excel-file/browser');
    const sheets = await readXlsxFile(file);
    return sheets.map((sheet) => ({
      name: `Hoja "${sheet.sheet.trim()}"`,
      rows: sheet.data.map((row) => row.map((cell) => (cell === null ? '' : String(cell)))),
    }));
  }
  if (name.endsWith('.docx')) {
    const { readWordTables } = await import('./wordTable');
    return (await readWordTables(file)).map((rows, i) => ({ name: `Tabla ${i + 1}`, rows }));
  }
  if (name.endsWith('.xls')) {
    throw new Error('El formato .xls (Excel 97-2003) no se puede leer. Ábrelo en Excel y guárdalo como .xlsx o .csv.');
  }
  if (name.endsWith('.doc')) {
    throw new Error('El formato .doc (Word 97-2003) no se puede leer. Ábrelo en Word y guárdalo como .docx.');
  }
  throw new Error('Formato no compatible. Usa un archivo de Excel (.xlsx), CSV o Word (.docx).');
}

/** "¿Necesita STAND?" → "necesita stand": sin tildes, signos ni mayúsculas. */
function headerText(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Ubica cada campo en una fila de encabezados. */
function mapColumns(cells: string[]): Columns {
  const header = cells.map(headerText);
  const columns: Columns = {};
  for (const key of Object.keys(HEADER_ALIASES) as FieldKey[]) {
    const index = header.findIndex((h) => HEADER_ALIASES[key].includes(h));
    if (index !== -1) columns[key] = index;
  }
  return columns;
}

interface Row {
  cells: string[];
  line: number;
}

interface Header {
  /** Posición, dentro de las filas con datos, de la primera fila de encabezados. */
  position: number;
  /** 2 cuando un título agrupa columnas y sus nombres van en la fila de abajo. */
  height: number;
  columns: Columns;
}

const score = (columns: Columns) =>
  REQUIRED.filter(({ key }) => columns[key] !== undefined).length * 100 + Object.keys(columns).length;

/**
 * Los encabezados no siempre están en la primera fila (arriba puede haber un título): se toma,
 * entre las primeras 10, la que reconoce más columnas. Si la fila de abajo trae más nombres en
 * columnas que la de arriba deja vacías, es un encabezado en dos filas, como el de la plantilla.
 */
function findHeader(rows: Row[]): Header {
  let best: Header = { position: 0, height: 1, columns: {} };
  rows.slice(0, 10).forEach((row, position) => {
    const columns = mapColumns(row.cells);
    const used = new Set(Object.values(columns));
    let height = 1;
    const below = rows[position + 1] ? mapColumns(rows[position + 1].cells) : {};
    for (const [key, index] of Object.entries(below) as [FieldKey, number][]) {
      if (columns[key] === undefined && !used.has(index)) {
        columns[key] = index;
        height = 2;
      }
    }
    if (score(columns) > score(best.columns)) best = { position, height, columns };
  });
  return best;
}

const nameKey = (ownerName: string, businessName: string) => `${normalizeText(businessName)}|${normalizeText(ownerName)}`;

export async function parseEntrepreneurFile(
  file: File,
  existing: Pick<Entrepreneur, 'document' | 'ownerName' | 'businessName'>[],
): Promise<ParseResult> {
  const tables = (await readTables(file))
    .map((table) => {
      const rows = table.rows
        .map((cells, index) => ({ cells: cells.map((c) => c.trim()), line: index + 1 }))
        .filter((row) => row.cells.some(Boolean));
      return { name: table.name, rows, header: findHeader(rows) };
    })
    .filter((table) => table.rows.length > 0);
  if (tables.length === 0) throw new Error('El archivo está vacío.');

  // En un libro con varias hojas (o un Word con varias tablas) se usa la que mejor coincide.
  const table = tables.reduce((a, b) => (score(b.header.columns) > score(a.header.columns) ? b : a));
  const { columns, position, height } = table.header;

  const missing = REQUIRED.filter(({ key }) => columns[key] === undefined);
  if (missing.length > 0) {
    throw new Error(
      `No se encontraron las columnas obligatorias: ${missing.map((m) => m.label).join(' y ')}. ` +
        'Revisa que los encabezados estén escritos así o descarga la plantilla.',
    );
  }

  const get = (row: Row, key: FieldKey) => {
    const index = columns[key];
    return index === undefined ? '' : (row.cells[index] ?? '');
  };
  // Filas sin emprendimiento, responsable, documento ni teléfono: numeración vacía o totales.
  const dataRows = table.rows
    .slice(position + height)
    .filter((row) => (['businessName', 'ownerName', 'document', 'phone'] as FieldKey[]).some((key) => get(row, key) !== ''));
  if (dataRows.length === 0) throw new Error('El archivo solo tiene encabezados, sin emprendedores.');

  const knownDocuments = new Set(existing.map((e) => e.document).filter(Boolean));
  const knownNames = new Set(existing.map((e) => nameKey(e.ownerName, e.businessName)));
  const yes = (value: string) => YES.has(normalizeText(value));

  const parsed = dataRows.map((row): ParsedRow => {
    const document = get(row, 'document').replace(/[.\s-]/g, '');
    const ownerName = get(row, 'ownerName');
    const businessName = get(row, 'businessName');
    const chairsText = get(row, 'chairs');
    const chairs = NO_CHAIRS.has(normalizeText(chairsText)) ? 0 : Number(chairsText);

    const errors: string[] = [];
    if (!businessName) errors.push('Falta el nombre del emprendimiento');
    if (!ownerName) errors.push('Falta el responsable');
    if (!Number.isInteger(chairs) || chairs < 0) errors.push('Sillas debe ser un número entero');
    // Sin sección escrita se intenta con el tipo de emprendimiento; si tampoco, se asigna luego en la tabla.
    let section = parseSection(get(row, 'section'));
    if (section === undefined) errors.push(`Sección "${get(row, 'section')}" no reconocida`);
    if (section === null) section = parseSection(get(row, 'category')) ?? null;

    let needsStand = true;
    if (columns.needsStand !== undefined) needsStand = yes(get(row, 'needsStand'));
    else if (columns.ownStand !== undefined) needsStand = !yes(get(row, 'ownStand'));

    // Repetido: mismo documento, o mismo emprendimiento y responsable (cuando no hay documento).
    const key = nameKey(ownerName, businessName);
    const duplicate =
      (document !== '' && knownDocuments.has(document)) || (ownerName !== '' && businessName !== '' && knownNames.has(key));
    if (document) knownDocuments.add(document);
    knownNames.add(key);

    return {
      line: row.line,
      errors,
      duplicate,
      data: {
        document,
        ownerName,
        businessName,
        phone: get(row, 'phone').replace(/\s/g, ''),
        category: get(row, 'category'),
        section: section ?? null,
        stand: get(row, 'stand').toUpperCase(),
        needsStand,
        needsPower: yes(get(row, 'needsPower')),
        chairs: Number.isInteger(chairs) && chairs > 0 ? chairs : 0,
      },
    };
  });

  return { fileName: file.name, source: tables.length > 1 ? table.name : null, rows: parsed };
}
