import type { Cell, Row, Sheet } from 'write-excel-file/browser';

type Value = string | number;

export interface ColumnSpec {
  header: string;
  width?: number;
  /** Pesos: se escribe como número con formato $ 1.250.000. */
  money?: boolean;
  /** Texto literal: evita que Excel convierta documentos y cuentas en notación científica. */
  text?: boolean;
}

export interface SheetSpec {
  name: string;
  columns: ColumnSpec[];
  rows: Value[][];
  /** Índices de filas (dentro de rows) que van en negrita, como subtotales. */
  boldRows?: number[];
  /** Líneas que van antes de la tabla, como el nombre y la fecha de la capacitación. */
  preface?: string[];
  /** Fila final en negrita (totales). */
  totals?: Value[];
}

const HEADER_FILL = '#EEECE7';
const MONEY_FORMAT = '"$"#,##0';

function toCell(value: Value, column: ColumnSpec | undefined, bold = false): Cell {
  const style = bold ? { fontWeight: 'bold' as const } : {};
  if (typeof value === 'number') {
    return { value, type: Number, ...(column?.money ? { format: MONEY_FORMAT } : {}), ...style };
  }
  return { value, type: String, ...(column?.text ? { format: '@' } : {}), ...style };
}

function buildSheet(spec: SheetSpec): Sheet<Blob> {
  const preface: Row[] = (spec.preface ?? []).map((line, i) => [
    { value: line, type: String, ...(i === 0 ? { fontWeight: 'bold' as const } : {}) },
  ]);
  if (preface.length > 0) preface.push([]);

  const header: Row = spec.columns.map((c) => ({
    value: c.header,
    type: String,
    fontWeight: 'bold' as const,
    backgroundColor: HEADER_FILL,
  }));
  const bold = new Set(spec.boldRows ?? []);
  const body: Row[] = spec.rows.map((row, r) => row.map((value, i) => toCell(value, spec.columns[i], bold.has(r))));
  const totals: Row[] = spec.totals ? [spec.totals.map((value, i) => toCell(value, spec.columns[i], true))] : [];

  return {
    // Excel no acepta más de 31 caracteres ni ciertos símbolos en el nombre de la hoja.
    sheet: spec.name.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31),
    data: [...preface, header, ...body, ...totals],
    columns: spec.columns.map((c) => ({ width: c.width ?? Math.max(12, c.header.length + 2) })),
    stickyRowsCount: preface.length + 1,
  };
}

/** Descarga un .xlsx real; la librería se carga solo al exportar. */
export async function downloadWorkbook(fileName: string, sheets: SheetSpec[]): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  await writeXlsxFile(sheets.map(buildSheet)).toFile(fileName);
}
