import { strFromU8, unzipSync } from 'fflate';
import { parseCsv } from '../../lib/csv';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

/** Hijos directos con ese nombre (no los de tablas anidadas). */
function children(element: Element, name: string): Element[] {
  return Array.from(element.children).filter((child) => child.namespaceURI === W && child.localName === name);
}

/** Texto de un párrafo: los tabuladores se conservan para poder separar columnas. */
function paragraphText(paragraph: Element): string {
  let text = '';
  for (const node of Array.from(paragraph.getElementsByTagNameNS(W, '*'))) {
    if (node.localName === 't') text += node.textContent ?? '';
    else if (node.localName === 'tab') text += '\t';
    else if (node.localName === 'br') text += ' ';
  }
  return text;
}

function tableRows(table: Element): string[][] {
  return children(table, 'tr').map((row) =>
    children(row, 'tc').flatMap((cell) => {
      const text = Array.from(cell.getElementsByTagNameNS(W, 'p'))
        .map(paragraphText)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      // Una celda combinada ocupa varias columnas: se rellena para que no se corran las demás.
      const span = Number(cell.getElementsByTagNameNS(W, 'gridSpan')[0]?.getAttributeNS(W, 'val') ?? 1);
      return [text, ...Array.from({ length: Math.max(0, span - 1) }, () => '')];
    }),
  );
}

/**
 * Lee las tablas de un Word (.docx); quien llama escoge la que tiene los encabezados. Si no hay
 * tablas, toma cada párrafo como una fila con los datos separados por tabulador, punto y coma o
 * coma (como un CSV escrito en Word).
 */
export async function readWordTables(file: File): Promise<string[][][]> {
  let documentXml: Uint8Array | undefined;
  try {
    documentXml = unzipSync(new Uint8Array(await file.arrayBuffer()), {
      filter: (entry) => entry.name === 'word/document.xml',
    })['word/document.xml'];
  } catch {
    documentXml = undefined;
  }
  if (!documentXml) throw new Error('No se pudo abrir el archivo de Word. Revisa que sea un .docx y que no esté dañado.');

  const doc = new DOMParser().parseFromString(strFromU8(documentXml), 'application/xml');
  const body = doc.getElementsByTagNameNS(W, 'body')[0];
  if (!body) throw new Error('El archivo de Word está vacío.');

  const tables = Array.from(doc.getElementsByTagNameNS(W, 'tbl'))
    .map(tableRows)
    .filter((rows) => rows.length >= 2);
  if (tables.length > 0) return tables;

  const lines = children(body, 'p').map(paragraphText).filter((line) => line.trim() !== '');
  return [parseCsv(lines.join('\n'))];
}
