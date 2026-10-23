import escudoUrl from '../../assets/brand/escudo-astrea-doc.png';
import feriaUrl from '../../assets/brand/feria-emprendimiento-doc.png';
import { saveBlob } from '../../lib/download';
import { fileStamp, formatForExport } from '../../lib/format';
import { sectionLabel } from '../../store/sections';
import { indexKits, isKitComplete } from '../../store/selectors';
import type { FairState } from '../../store/types';
import { KIT_ITEMS } from './kit';

/**
 * Informe de entrega de kits en Word (.docx), en hoja horizontal: resumen, detalle de cada
 * entrega, pendientes de entregas parciales, emprendedores sin kit y espacio para firmas.
 */
export async function downloadKitReport(state: FairState, generatedBy: string): Promise<void> {
  // docx pesa bastante; se carga solo cuando alguien pide el informe.
  const {
    AlignmentType,
    BorderStyle,
    Document,
    Footer,
    HeightRule,
    ImageRun,
    Packer,
    PageNumber,
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

  const [escudo, feria] = await Promise.all(
    [escudoUrl, feriaUrl].map(async (url) => new Uint8Array(await (await fetch(url)).arrayBuffer())),
  );

  const kits = indexKits(state.kits);
  const people = state.entrepreneurs;
  const delivered = [...state.kits].sort((a, b) => a.at.localeCompare(b.at));
  const complete = delivered.filter((k) => isKitComplete(k));
  const partial = delivered.filter((k) => !isKitComplete(k));
  const withoutKit = people.filter((e) => !kits.has(e.id));
  const person = (id: string) => people.find((e) => e.id === id);
  const itemCount = (item: (typeof KIT_ITEMS)[number]['id']) => delivered.filter((k) => k.items[item]).length;

  const FONT = 'Calibri';
  const INK = '242422';
  const MUTED = '5C5952';
  const HEADER_FILL = 'EEECE7';
  const GREEN = '007A35';
  const USABLE_WIDTH = 14400; // carta horizontal con márgenes de 1,27 cm

  const text = (value: string, opts: { bold?: boolean; size?: number; color?: string } = {}) =>
    new TextRun({ text: value, font: FONT, bold: opts.bold, size: opts.size ?? 18, color: opts.color ?? INK });

  const para = (value: string, opts: { bold?: boolean; size?: number; color?: string; after?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) =>
    new Paragraph({ children: [text(value, opts)], spacing: { after: opts.after ?? 0 }, alignment: opts.align });

  const heading = (value: string) =>
    new Paragraph({
      children: [text(value, { bold: true, size: 26, color: GREEN })],
      spacing: { before: 320, after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'DEDBD3', space: 4 } },
    });

  const cell = (value: string | string[], width: number, opts: { header?: boolean; align?: 'center' | 'left' } = {}) =>
    new TableCell({
      width: { size: width, type: WidthType.DXA },
      verticalAlign: VerticalAlign.CENTER,
      shading: opts.header ? { type: ShadingType.CLEAR, color: 'auto', fill: HEADER_FILL } : undefined,
      margins: { top: 60, bottom: 60, left: 80, right: 80 },
      children: (Array.isArray(value) ? value : [value]).map((line, i) =>
        para(line, {
          bold: opts.header || (Array.isArray(value) && i === 0),
          size: opts.header ? 16 : i === 0 ? 17 : 15,
          color: i === 0 ? INK : MUTED,
          align: opts.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
        }),
      ),
    });

  const table = (headers: string[], widths: number[], rows: Array<Array<string | string[]>>, centered: number[] = []) =>
    new Table({
      width: { size: USABLE_WIDTH, type: WidthType.DXA },
      columnWidths: widths,
      rows: [
        new TableRow({
          tableHeader: true,
          children: headers.map((h, i) => cell(h, widths[i], { header: true, align: centered.includes(i) ? 'center' : 'left' })),
        }),
        ...rows.map(
          (row) =>
            new TableRow({
              cantSplit: true,
              children: row.map((value, i) => cell(value, widths[i], { align: centered.includes(i) ? 'center' : 'left' })),
            }),
        ),
      ],
    });

  const emptyNote = (value: string) => para(value, { color: MUTED, size: 18, after: 120 });
  const yes = (value: boolean) => (value ? 'Sí' : 'No');
  const noBorders = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };

  // Encabezado con los dos logos y el título al centro.
  const masthead = new Table({
    width: { size: USABLE_WIDTH, type: WidthType.DXA },
    columnWidths: [1600, 9200, 3600],
    borders: noBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 1600, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ children: [new ImageRun({ type: 'png', data: escudo, transformation: { width: 54, height: 76 } })] })],
          }),
          new TableCell({
            width: { size: 9200, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              para('ALCALDÍA MUNICIPAL DE ASTREA', { bold: true, size: 18, color: MUTED }),
              para('Informe de entrega de kits', { bold: true, size: 36 }),
              para('Feria de Emprendimiento', { size: 22, color: MUTED }),
            ],
          }),
          new TableCell({
            width: { size: 3600, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new ImageRun({ type: 'png', data: feria, transformation: { width: 170, height: 75 } })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const summaryRows: Array<[string, string]> = [
    ['Emprendedores registrados', String(people.length)],
    ['Kits entregados completos', String(complete.length)],
    ['Entregas parciales (faltan elementos)', String(partial.length)],
    ['Emprendedores sin entrega', String(withoutKit.length)],
    ...KIT_ITEMS.map((item): [string, string] => [item.deliveredLabel, `${itemCount(item.id)} emprendedores`]),
  ];

  const doc = new Document({
    creator: generatedBy,
    title: 'Informe de entrega de kits',
    description: 'Feria de Emprendimiento - Alcaldía Municipal de Astrea',
    styles: { default: { document: { run: { font: FONT, size: 18 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE, width: 12240, height: 15840 },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  text('Informe de entrega de kits · Feria de Emprendimiento · Página ', { size: 15, color: MUTED }),
                  new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 15, color: MUTED }),
                  text(' de ', { size: 15, color: MUTED }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 15, color: MUTED }),
                ],
              }),
            ],
          }),
        },
        children: [
          masthead,
          new Paragraph({
            spacing: { before: 160, after: 40 },
            border: { top: { style: BorderStyle.SINGLE, size: 18, color: GREEN, space: 6 } },
            children: [
              text('Fecha de generación: ', { bold: true }),
              text(formatForExport(new Date().toISOString())),
              text('     Generado por: ', { bold: true }),
              text(generatedBy),
            ],
          }),
          para('Cada kit incluye gorras, suéteres y pendón. Una entrega es completa cuando se entregaron los tres elementos.', {
            color: MUTED,
            after: 60,
          }),

          heading('1. Resumen'),
          table(
            ['Concepto', 'Cantidad'],
            [9400, 5000],
            summaryRows.map(([label, value]) => [label, value]),
          ),

          heading('2. Detalle de entregas'),
          delivered.length === 0
            ? emptyNote('Todavía no se ha registrado ninguna entrega.')
            : table(
                ['N°', 'Emprendedor', 'Emprendimiento', 'Stand', 'Gorras', 'Suéteres', 'Pendón', 'Estado', 'Fecha y hora', 'Entregó', 'Foto de evidencia'],
                [500, 2300, 2200, 700, 800, 850, 800, 900, 1450, 1500, 2400],
                delivered.map((k, i) => {
                  const e = person(k.entrepreneurId);
                  return [
                    String(i + 1),
                    [e?.ownerName ?? 'Emprendedor eliminado', e ? `CC ${e.document}` : ''],
                    [e?.businessName ?? '', sectionLabel(e?.section ?? null)],
                    e?.stand || '—',
                    yes(k.items.gorras),
                    yes(k.items.sueteres),
                    yes(k.items.pendon),
                    isKitComplete(k) ? 'Completo' : 'Parcial',
                    formatForExport(k.at),
                    k.operator,
                    k.photo.fileName,
                  ];
                }),
                [0, 3, 4, 5, 6, 7],
              ),

          heading('3. Entregas parciales: elementos por entregar'),
          partial.length === 0
            ? emptyNote('No hay entregas parciales.')
            : table(
                ['Emprendedor', 'Emprendimiento', 'Stand', 'Falta por entregar', 'Última entrega'],
                [3200, 3400, 900, 4000, 2900],
                partial.map((k) => {
                  const e = person(k.entrepreneurId);
                  const missing = KIT_ITEMS.filter((item) => !k.items[item.id]).map((item) => item.label);
                  return [
                    [e?.ownerName ?? '', e ? `CC ${e.document}` : ''],
                    e?.businessName ?? '',
                    e?.stand || '—',
                    missing.join(', '),
                    `${formatForExport(k.at)} · ${k.operator}`,
                  ];
                }),
                [2],
              ),

          heading('4. Emprendedores sin kit'),
          withoutKit.length === 0
            ? emptyNote('Todos los emprendedores recibieron su kit.')
            : table(
                ['Documento', 'Emprendedor', 'Emprendimiento', 'Sección', 'Stand', 'Teléfono'],
                [1700, 3300, 3400, 2600, 1000, 2400],
                withoutKit.map((e) => [e.document, e.ownerName, e.businessName, sectionLabel(e.section), e.stand || '—', e.phone]),
                [4],
              ),

          // Observaciones y firmas van juntas: si no caben, Word las pasa a la página siguiente.
          new Paragraph({
            keepNext: true,
            children: [text('5. Observaciones', { bold: true, size: 26, color: GREEN })],
            spacing: { before: 320, after: 120 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'DEDBD3', space: 4 } },
          }),
          new Table({
            width: { size: USABLE_WIDTH, type: WidthType.DXA },
            columnWidths: [USABLE_WIDTH],
            borders: {
              ...noBorders,
              bottom: { style: BorderStyle.SINGLE, size: 4, color: 'C4C0B6' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'C4C0B6' },
            },
            rows: [0, 1, 2].map(
              () =>
                new TableRow({
                  height: { value: 440, rule: HeightRule.ATLEAST },
                  children: [
                    new TableCell({
                      width: { size: USABLE_WIDTH, type: WidthType.DXA },
                      children: [new Paragraph({ keepNext: true, children: [] })],
                    }),
                  ],
                }),
            ),
          }),

          new Paragraph({ keepNext: true, spacing: { before: 900 }, children: [] }),
          new Table({
            width: { size: USABLE_WIDTH, type: WidthType.DXA },
            columnWidths: [6600, 1200, 6600],
            borders: noBorders,
            rows: [
              new TableRow({
                cantSplit: true,
                children: [
                  new TableCell({
                    width: { size: 6600, type: WidthType.DXA },
                    borders: { top: { style: BorderStyle.SINGLE, size: 6, color: INK } },
                    children: [para('Responsable de logística', { bold: true }), para(generatedBy, { color: MUTED })],
                  }),
                  new TableCell({ width: { size: 1200, type: WidthType.DXA }, children: [new Paragraph({ children: [] })] }),
                  new TableCell({
                    width: { size: 6600, type: WidthType.DXA },
                    borders: { top: { style: BorderStyle.SINGLE, size: 6, color: INK } },
                    children: [para('Vo. Bo. Coordinación de la feria', { bold: true }), para('Alcaldía Municipal de Astrea', { color: MUTED })],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  saveBlob(await Packer.toBlob(doc), `informe-kits_${fileStamp()}.docx`);
}
