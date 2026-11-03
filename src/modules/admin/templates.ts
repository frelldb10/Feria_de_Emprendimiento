import { saveBlob } from '../../lib/download';
import { TEMPLATE } from './parseEntrepreneurFile';

// Encabezado verde con letra blanca, como el formato de inscripción de la feria.
const HEADER_FILL = '#007A35';
const HEADER_TEXT = '#FFFFFF';
const FILE_NAME = 'plantilla-emprendedores';

const allColumns = [...TEMPLATE.columns, ...TEMPLATE.groupColumns];
const NUMBER_COLUMNS = new Set([0, 6]); // N° y sillas
const TEXT_COLUMNS = new Set([3]); // teléfono: que Excel no lo convierta en número

/** Plantilla en Excel (.xlsx) con el encabezado en dos filas. */
export async function downloadExcelTemplate(): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const header = {
    type: String,
    fontWeight: 'bold' as const,
    textColor: HEADER_TEXT,
    backgroundColor: HEADER_FILL,
    borderColor: HEADER_TEXT,
    borderStyle: 'thin' as const,
    align: 'center' as const,
    alignVertical: 'center' as const,
    wrap: true,
  };
  const border = { borderColor: '#DEDBD3', borderStyle: 'thin' as const };

  await writeXlsxFile([
    {
      sheet: 'Emprendedores',
      columns: allColumns.map((c) => ({ width: c.width })),
      stickyRowsCount: 2,
      data: [
        [
          ...TEMPLATE.columns.map((c) => ({ ...header, value: c.header, rowSpan: 2, height: 22 })),
          { ...header, value: TEMPLATE.group, columnSpan: TEMPLATE.groupColumns.length },
          ...TEMPLATE.groupColumns.slice(1).map(() => null),
        ],
        [...TEMPLATE.columns.map(() => null), ...TEMPLATE.groupColumns.map((c) => ({ ...header, value: c.header, height: 34 }))],
        ...TEMPLATE.examples.map((row) =>
          row.map((value, i) =>
            NUMBER_COLUMNS.has(i)
              ? { ...border, value: Number(value), type: Number, align: 'center' as const }
              : { ...border, value, type: String, ...(TEXT_COLUMNS.has(i) ? { format: '@' } : {}), ...(i > 3 ? { align: 'center' as const } : {}) },
          ),
        ),
      ],
    },
  ]).toFile(`${FILE_NAME}.xlsx`);
}

/** Plantilla en Word (.docx): la misma tabla, con indicaciones arriba. */
export async function downloadWordTemplate(): Promise<void> {
  const {
    AlignmentType,
    Document,
    Packer,
    PageOrientation,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableRow,
    TextRun,
    VerticalAlign,
    WidthType,
  } = await import('docx');

  const usableWidth = 14400; // carta horizontal con márgenes de 1,27 cm
  const totalUnits = allColumns.reduce((sum, c) => sum + c.width, 0);
  const widths = allColumns.map((c) => Math.round((c.width / totalUnits) * usableWidth));
  const cell = (text: string, width: number, options: { header?: boolean; center?: boolean; rowSpan?: number; columnSpan?: number } = {}) =>
    new TableCell({
      width: { size: width, type: WidthType.DXA },
      rowSpan: options.rowSpan,
      columnSpan: options.columnSpan,
      verticalAlign: VerticalAlign.CENTER,
      shading: options.header ? { type: ShadingType.CLEAR, color: 'auto', fill: HEADER_FILL.slice(1) } : undefined,
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: [
        new Paragraph({
          alignment: options.header || options.center ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [
            new TextRun({ text, bold: options.header, size: 18, font: 'Calibri', color: options.header ? HEADER_TEXT.slice(1) : undefined }),
          ],
        }),
      ],
    });
  const groupWidth = widths.slice(TEMPLATE.columns.length).reduce((a, b) => a + b, 0);

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri', size: 20 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE, width: 12240, height: 15840 },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children: [
          new Paragraph({ children: [new TextRun({ text: 'Emprendedores de la feria', bold: true, size: 32 })] }),
          new Paragraph({
            spacing: { before: 120, after: 240 },
            children: [
              new TextRun({
                text:
                  'Llena una fila por emprendedor y deja los encabezados como están. Obligatorios: nombre del ' +
                  'emprendimiento y responsable. En stand y energía escribe SÍ o NO; en sillas, el número. ' +
                  'Borra las filas de ejemplo antes de cargar el archivo.',
                size: 18,
                color: '5C5952',
              }),
            ],
          }),
          new Table({
            width: { size: usableWidth, type: WidthType.DXA },
            columnWidths: widths,
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  ...TEMPLATE.columns.map((c, i) => cell(c.header, widths[i], { header: true, rowSpan: 2 })),
                  cell(TEMPLATE.group, groupWidth, { header: true, columnSpan: TEMPLATE.groupColumns.length }),
                ],
              }),
              new TableRow({
                tableHeader: true,
                children: TEMPLATE.groupColumns.map((c, i) => cell(c.header, widths[TEMPLATE.columns.length + i], { header: true })),
              }),
              ...TEMPLATE.examples.map(
                (row) => new TableRow({ children: row.map((value, i) => cell(value, widths[i], { center: i === 0 || i > 3 })) }),
              ),
            ],
          }),
        ],
      },
    ],
  });

  saveBlob(await Packer.toBlob(doc), `${FILE_NAME}.docx`);
}
