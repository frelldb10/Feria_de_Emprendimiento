import type { Cell, CellObject, Feature, Image, Row, Sheet } from 'write-excel-file/browser';
import { loadReportImages, type ReportImages } from './xlsxImages';

/** En el navegador las imágenes pueden ser Blob, File o ArrayBuffer. */
type FileContent = Image['content'];

type Value = string | number;

/** Número con su propio formato, para columnas que mezclan cantidades y pesos (como un resumen). */
export interface FormattedNumber {
  value: number;
  money?: boolean;
  percent?: boolean;
}

export type CellValue = Value | FormattedNumber;

export type Tone = 'verde' | 'rojo' | 'amarillo' | 'neutral';

export interface ColumnSpec {
  header: string;
  width?: number;
  /** Pesos: se escribe como número con formato $ 1.250.000. */
  money?: boolean;
  /** Texto literal: evita que Excel convierta documentos y cuentas en notación científica. */
  text?: boolean;
  /** Proporción de 0 a 1 que se muestra como porcentaje. */
  percent?: boolean;
  /** Datos cortos que se leen mejor centrados: día, stand, N°. */
  center?: boolean;
  /** Resalta con color los estados conocidos: Sí y Completo en verde, No y Pendiente en rojo, Parcial en amarillo. */
  badge?: boolean;
}

/** Cifra destacada que va en un recuadro encima de la tabla. */
export interface Highlight {
  label: string;
  value: Value;
  money?: boolean;
  percent?: boolean;
  tone?: Tone;
}

export interface SheetSpec {
  name: string;
  /** Subtítulo de la hoja, debajo del nombre del reporte. Si falta, se usa el nombre de la hoja. */
  title?: string;
  /** Líneas de contexto antes de la tabla, como la fecha y el lugar de la capacitación. */
  notes?: string[];
  highlights?: Highlight[];
  columns: ColumnSpec[];
  rows: CellValue[][];
  /** Índices de filas (dentro de rows) que van en negrita, como subtotales. */
  boldRows?: number[];
  /** Índices de filas que son títulos de grupo: solo se usa su primera celda, que ocupa todo el ancho. */
  groupRows?: number[];
  /** Fila final de totales. */
  totals?: CellValue[];
  /** Texto cuando la tabla no tiene filas. */
  emptyText?: string;
}

export interface WorkbookMeta {
  /** Nombre del reporte: va como título grande en cada hoja. */
  title: string;
  /** Quién lo descargó. */
  generatedBy?: string;
}

/* ---------- Paleta (la misma de la app, tomada de los logos) ---------- */

const INK = '#242422';
const BODY = '#34332F';
const MUTED = '#5C5952';
const SOFT = '#77736B';
const LINE = '#DEDBD3';
const ZEBRA = '#F7F6F3';
const SUBTOTAL = '#EEECE7';
const WHITE = '#FFFFFF';
const GREEN = '#007A35';
const GREEN_DARK = '#0A4A24';
const GREEN_TINT = '#EDF8F1';
const GREEN_SOFT = '#D3EEDC';

const TONES: Record<Tone, { text: string; fill: string; strong: string }> = {
  verde: { text: '#007A35', fill: '#EDF8F1', strong: '#009240' },
  rojo: { text: '#B81E17', fill: '#FDEEED', strong: '#DA251D' },
  amarillo: { text: '#8A6A00', fill: '#FFFBE0', strong: '#EBBB1B' },
  neutral: { text: INK, fill: ZEBRA, strong: '#4A4A42' },
};

const BADGE_TONE: Record<string, Tone> = {
  Sí: 'verde',
  Completo: 'verde',
  No: 'rojo',
  Pendiente: 'rojo',
  'No asistió': 'rojo',
  'Sin asignar': 'rojo',
  Parcial: 'amarillo',
};

const MONEY_FORMAT = '"$" #,##0;[Red]-"$" #,##0';
const COUNT_FORMAT = '#,##0';
const PERCENT_FORMAT = '0%';

/** Ancho mínimo (en caracteres) para que el encabezado y los recuadros no se amontonen. */
const MIN_TABLE_CHARS = 86;
/** Hasta este ancho (en píxeles) la hoja cabe en una carta vertical. */
const PORTRAIT_MAX_PX = 720;

const generatedAt = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short' });

/**
 * Ancho de columna de Excel a píxeles. Con Calibri 11 como letra base (que se fija al escribir el
 * archivo), cada unidad mide 7 píxeles; sin fijarla, Excel usa la de su tema y los anchos cambian.
 */
const FONT = { fontFamily: 'Calibri', fontSize: 11 };
const toPx = (chars: number) => Math.round(chars * 7);

function columnWidths(columns: ColumnSpec[]): number[] {
  const widths = columns.map((c) => c.width ?? Math.max(12, c.header.length + 2));
  const total = widths.reduce((a, b) => a + b, 0);
  if (total >= MIN_TABLE_CHARS) return widths;
  // Las hojas angostas se ensanchan parejo para que el encabezado del reporte no se corte al imprimir.
  return widths.map((w) => Math.round(((w * MIN_TABLE_CHARS) / total) * 10) / 10);
}

function numberFormat(spec: { money?: boolean; percent?: boolean }): string {
  if (spec.money) return MONEY_FORMAT;
  if (spec.percent) return PERCENT_FORMAT;
  return COUNT_FORMAT;
}

function alignOf(column: ColumnSpec | undefined, value: CellValue): 'left' | 'center' | 'right' {
  if (column?.center || column?.badge) return 'center';
  if (typeof value !== 'string' || column?.money || column?.percent) return 'right';
  return 'left';
}

function valueCell(value: CellValue, column: ColumnSpec | undefined, style: Omit<CellObject, 'value' | 'type'>): CellObject {
  const align = alignOf(column, value);
  // Un margen interno para que una cifra alineada a la derecha no quede pegada al texto de la columna vecina.
  const base = { align, ...(align === 'center' ? {} : { indent: 1 }), ...style };
  if (typeof value === 'object') {
    return { value: value.value, type: Number, format: numberFormat(value), ...base };
  }
  if (typeof value === 'number') {
    return { value, type: Number, format: numberFormat(column ?? {}), ...base };
  }
  return { value, type: String, ...(column?.text ? { format: '@' } : {}), ...base };
}

/**
 * Reparte los recuadros de cifras entre columnas seguidas, buscando que todos queden lo más parejos
 * posible (la menor suma de diferencias al cuadrado frente al ancho ideal).
 */
function splitColumns(widthsPx: number[], parts: number): number[] {
  const n = widthsPx.length;
  const prefix = [0];
  for (const w of widthsPx) prefix.push(prefix[prefix.length - 1] + w);
  const ideal = prefix[n] / parts;
  const best = Array.from({ length: parts + 1 }, () => Array<number>(n + 1).fill(Infinity));
  const cut = Array.from({ length: parts + 1 }, () => Array<number>(n + 1).fill(0));
  best[0][0] = 0;
  for (let j = 1; j <= parts; j++) {
    for (let i = j; i <= n; i++) {
      for (let k = j - 1; k < i; k++) {
        const cost = best[j - 1][k] + (prefix[i] - prefix[k] - ideal) ** 2;
        if (cost < best[j][i]) {
          best[j][i] = cost;
          cut[j][i] = k;
        }
      }
    }
  }
  const spans: number[] = [];
  for (let j = parts, i = n; j > 0; j--) {
    const k = cut[j][i];
    spans.unshift(i - k);
    i = k;
  }
  return spans;
}

const grouped = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

/** Tamaño de letra de la cifra para que quepa en su recuadro (si no cabe, Excel muestra ####). */
function fitFontSize(h: Highlight, boxPx: number): number {
  const text =
    typeof h.value === 'string' ? h.value : h.percent ? `${Math.round(h.value * 100)}%` : `${h.money ? '$ ' : ''}${grouped.format(h.value)}`;
  // Un dígito de Calibri en negrita mide cerca de 0,72 px por punto de letra; 18 px son la sangría y el margen.
  return Math.max(10, Math.min(16, Math.floor((boxPx - 18) / (text.length * 0.72))));
}

/** Columna y desplazamiento donde cae un punto horizontal (en píxeles). */
function anchorAt(x: number, widthsPx: number[]): { column: number; offsetX: number } {
  let left = 0;
  for (let i = 0; i < widthsPx.length; i++) {
    if (x < left + widthsPx[i] || i === widthsPx.length - 1) return { column: i + 1, offsetX: Math.max(0, Math.round(x - left)) };
    left += widthsPx[i];
  }
  return { column: 1, offsetX: 0 };
}

interface BuiltSheet {
  sheet: Sheet<FileContent>;
  name: string;
  /** Fila (desde 1) del encabezado de la tabla: se repite en cada página impresa. */
  headerRow: number;
  landscape: boolean;
  /** Las hojas cortas (resúmenes) se imprimen en una sola página. */
  onePage: boolean;
}

function buildSheet(spec: SheetSpec, meta: WorkbookMeta, images: ReportImages | null, stamp: string): BuiltSheet {
  const n = spec.columns.length;
  const widths = columnWidths(spec.columns);
  const widthsPx = widths.map(toPx);
  const tablePx = widthsPx.reduce((a, b) => a + b, 0);
  const data: Row[] = [];
  const line = (cell: CellObject): Row => [cell, ...Array<Cell>(n - 1).fill(null)];
  const spacer = (height: number): Row => [{ height }];

  // Membrete: logos, entidad, nombre del reporte, hoja y fecha de generación.
  data.push(spacer(44));
  data.push(line({ value: 'ALCALDÍA MUNICIPAL DE ASTREA  ·  FERIA DE EMPRENDIMIENTO', type: String, fontSize: 8, fontWeight: 'bold', textColor: GREEN, height: 14, alignVertical: 'bottom' }));
  data.push(line({ value: meta.title, type: String, fontSize: 16, fontWeight: 'bold', textColor: INK, height: 24, alignVertical: 'center' }));
  data.push(line({ value: spec.title ?? spec.name, type: String, fontSize: 11, fontWeight: 'bold', textColor: '#4A4A42', height: 17, alignVertical: 'center' }));
  const by = meta.generatedBy ? ` · por ${meta.generatedBy}` : '';
  data.push(line({ value: `Generado el ${stamp}${by}`, type: String, fontSize: 9, textColor: SOFT, height: 14, alignVertical: 'center' }));
  const stripeRow = data.length + 1;
  data.push(spacer(5));
  data.push(spacer(10));

  for (const note of spec.notes ?? []) {
    data.push(line({ value: note, type: String, fontSize: 9.5, textColor: BODY, height: 15, alignVertical: 'center' }));
  }
  if (spec.notes?.length) data.push(spacer(8));

  const highlights = spec.highlights ?? [];
  if (highlights.length > 0) {
    if (highlights.length <= n) {
      const spans = splitColumns(widthsPx, highlights.length);
      const labels: Row = [];
      const values: Row = [];
      let firstColumn = 0;
      highlights.forEach((h, i) => {
        const boxPx = widthsPx.slice(firstColumn, firstColumn + spans[i]).reduce((a, b) => a + b, 0);
        firstColumn += spans[i];
        const tone = TONES[h.tone ?? 'verde'];
        // Un borde blanco grueso a la izquierda separa visualmente un recuadro del otro.
        const gap = i > 0 ? { leftBorderColor: WHITE, leftBorderStyle: 'thick' as const } : {};
        labels.push({
          value: h.label.toUpperCase(),
          type: String,
          columnSpan: spans[i],
          fontSize: 8,
          fontWeight: 'bold',
          textColor: MUTED,
          backgroundColor: ZEBRA,
          topBorderColor: tone.strong,
          topBorderStyle: 'medium',
          alignVertical: 'bottom',
          indent: 1,
          height: 19,
          ...gap,
        });
        values.push({
          value: h.value,
          type: typeof h.value === 'number' ? Number : String,
          ...(typeof h.value === 'number' ? { format: numberFormat(h) } : {}),
          columnSpan: spans[i],
          fontSize: fitFontSize(h, boxPx),
          fontWeight: 'bold',
          textColor: h.tone === 'neutral' || !h.tone ? INK : tone.text,
          backgroundColor: ZEBRA,
          align: 'left',
          alignVertical: 'center',
          indent: 1,
          height: 30,
          ...gap,
        } as CellObject);
        for (let k = 1; k < spans[i]; k++) {
          labels.push(null);
          values.push(null);
        }
      });
      data.push(labels, values);
    } else {
      // Pocas columnas: los recuadros van uno debajo del otro.
      for (const h of highlights) {
        const tone = TONES[h.tone ?? 'verde'];
        data.push([
          { value: h.label, type: String, columnSpan: n - 1, fontSize: 9.5, fontWeight: 'bold', textColor: MUTED, backgroundColor: ZEBRA, leftBorderColor: tone.strong, leftBorderStyle: 'thick', indent: 1, height: 20, alignVertical: 'center' },
          ...Array<Cell>(n - 2).fill(null),
          valueCell(h.value, { header: h.label, money: h.money, percent: h.percent }, { fontSize: 12, fontWeight: 'bold', textColor: h.tone === 'neutral' || !h.tone ? INK : tone.text, backgroundColor: ZEBRA, alignVertical: 'center', height: 20 }),
        ]);
      }
    }
    data.push(spacer(12));
  }

  // Tabla.
  const headerRow = data.length + 1;
  data.push(
    spec.columns.map((c, i) => ({
      value: c.header,
      type: String,
      fontSize: 9.5,
      fontWeight: 'bold' as const,
      textColor: WHITE,
      backgroundColor: GREEN,
      align: c.center || c.badge ? 'center' : c.money || c.percent ? 'right' : 'left',
      ...(c.center || c.badge ? {} : { indent: 1 }),
      alignVertical: 'center' as const,
      wrap: true,
      height: 30,
      ...(i < n - 1 ? { rightBorderColor: '#2E8F57', rightBorderStyle: 'thin' as const } : {}),
    })),
  );

  const bold = new Set(spec.boldRows ?? []);
  const groups = new Set(spec.groupRows ?? []);
  let stripe = 0;
  spec.rows.forEach((row, r) => {
    if (groups.has(r)) {
      stripe = 0;
      const first = row[0];
      data.push(
        line({
          value: typeof first === 'object' ? String(first.value) : String(first ?? ''),
          type: String,
          columnSpan: n,
          fontSize: 10,
          fontWeight: 'bold',
          textColor: '#00622B',
          backgroundColor: GREEN_TINT,
          topBorderColor: '#A6DCB8',
          topBorderStyle: 'thin',
          bottomBorderColor: '#A6DCB8',
          bottomBorderStyle: 'thin',
          alignVertical: 'center',
          indent: 1,
          height: 20,
        }),
      );
      return;
    }
    const isBold = bold.has(r);
    const fill = isBold ? SUBTOTAL : stripe++ % 2 === 1 ? ZEBRA : WHITE;
    data.push(
      row.map((value, i) => {
        const column = spec.columns[i];
        const tone = column?.badge && typeof value === 'string' ? BADGE_TONE[value] : undefined;
        return valueCell(value, column, {
          fontSize: 10,
          textColor: tone ? TONES[tone].text : INK,
          backgroundColor: tone ? TONES[tone].fill : fill,
          ...(isBold || tone ? { fontWeight: 'bold' as const } : {}),
          alignVertical: 'center',
          bottomBorderColor: isBold ? '#C4C0B6' : LINE,
          bottomBorderStyle: 'thin',
          height: 18,
        });
      }),
    );
  });

  if (spec.rows.length === 0) {
    data.push(
      line({
        value: spec.emptyText ?? 'Todavía no hay registros.',
        type: String,
        columnSpan: n,
        fontSize: 10,
        fontStyle: 'italic',
        textColor: SOFT,
        backgroundColor: ZEBRA,
        align: 'center',
        alignVertical: 'center',
        height: 26,
      }),
    );
  }

  if (spec.totals) {
    data.push(
      spec.totals.map((value, i) =>
        valueCell(value, spec.columns[i], {
          fontSize: 10,
          fontWeight: 'bold',
          textColor: GREEN_DARK,
          backgroundColor: GREEN_SOFT,
          topBorderColor: GREEN,
          topBorderStyle: 'medium',
          bottomBorderColor: GREEN,
          bottomBorderStyle: 'thin',
          alignVertical: 'center',
          height: 21,
        }),
      ),
    );
  }

  data.push(spacer(10));
  data.push(
    line({
      value: 'Fuente: sistema de información de la Feria de Emprendimiento, Alcaldía Municipal de Astrea.',
      type: String,
      fontSize: 8,
      fontStyle: 'italic',
      textColor: SOFT,
    }),
  );

  const sheetImages: Image[] = [];
  if (images) {
    sheetImages.push({ ...images.escudo, anchor: { row: 1, column: 1 }, offsetX: 0, offsetY: 5 });
    const feria = anchorAt(tablePx - images.feria.width, widthsPx);
    sheetImages.push({ ...images.feria, anchor: { row: 1, column: feria.column }, offsetX: feria.offsetX, offsetY: 7 });
    const stripeImage = images.stripe(tablePx);
    if (stripeImage) sheetImages.push({ ...stripeImage, anchor: { row: stripeRow, column: 1 }, offsetX: 0, offsetY: 1 });
  }

  // Excel no acepta más de 31 caracteres ni ciertos símbolos en el nombre de la hoja.
  const name = spec.name.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31);
  const longTable = spec.rows.length > 25 && highlights.length === 0;
  return {
    name,
    headerRow,
    landscape: tablePx > PORTRAIT_MAX_PX,
    onePage: spec.rows.length <= 30,
    sheet: {
      sheet: name,
      data,
      columns: widths.map((width) => ({ width })),
      showGridLines: false,
      // La orientación se ajusta al imprimir (ver printSetup); aquí solo activa márgenes y tamaño de página.
      orientation: 'landscape',
      // En tablas largas, el encabezado queda fijo al bajar.
      ...(longTable ? { stickyRowsCount: headerRow } : {}),
      ...(sheetImages.length > 0 ? { images: sheetImages } : {}),
    },
  };
}

const xmlText = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Impresión: hoja carta, todo el ancho en una página, centrada, con el número de página al pie
 * y el encabezado de la tabla repetido en cada hoja impresa.
 */
function printSetup(built: BuiltSheet[], title: string): Feature<FileContent> {
  // En el pie de página de Excel, "&" es un código: el texto literal lo lleva doble.
  const footerTitle = xmlText(title.replace(/&/g, '&&'));
  const footer = `&amp;L&amp;8${footerTitle} · Feria de Emprendimiento&amp;R&amp;8Página &amp;P de &amp;N`;
  return {
    files: {
      transform: {
        'xl/worksheets/sheet{id}.xml': {
          transform: (xml, _options, { sheetIndex }) => {
            const info = built[sheetIndex];
            if (!info) return xml;
            return xml
              .replace(/(<worksheet\b[^>]*>)/, '$1<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>')
              .replace(
                /<pageMargins\b[^>]*\/>/,
                '<printOptions horizontalCentered="1"/><pageMargins left="0.4" right="0.4" top="0.5" bottom="0.6" header="0.3" footer="0.3"/>',
              )
              .replace(
                /<pageSetup\b[^>]*\/>/,
                `<pageSetup paperSize="1" orientation="${info.landscape ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="${info.onePage ? 1 : 0}"/>` +
                  `<headerFooter><oddFooter>${footer}</oddFooter></headerFooter>`,
              );
          },
        },
        'xl/workbook.xml': {
          transform: (xml) => {
            const names = built
              .map((info, i) => {
                const sheetRef = `'${info.name.replace(/'/g, "''")}'`;
                return `<definedName name="_xlnm.Print_Titles" localSheetId="${i}">${xmlText(sheetRef)}!$${info.headerRow}:$${info.headerRow}</definedName>`;
              })
              .join('');
            if (xml.includes('<definedNames>')) return xml.replace('<definedNames>', `<definedNames>${names}`);
            if (xml.includes('<definedNames/>')) return xml.replace('<definedNames/>', `<definedNames>${names}</definedNames>`);
            return xml.replace('</sheets>', `</sheets><definedNames>${names}</definedNames>`);
          },
        },
      },
    },
  };
}

/** Descarga un .xlsx real con el membrete de la Alcaldía; la librería se carga solo al exportar. */
export async function downloadWorkbook(fileName: string, meta: WorkbookMeta, sheets: SheetSpec[]): Promise<void> {
  const [{ default: writeXlsxFile }, images] = await Promise.all([import('write-excel-file/browser'), loadReportImages()]);
  const stamp = generatedAt.format(new Date());
  const built = sheets.map((spec) => buildSheet(spec, meta, images, stamp));
  await writeXlsxFile(
    built.map((b) => b.sheet),
    { ...FONT, features: [printSetup(built, meta.title)] },
  ).toFile(fileName);
}
