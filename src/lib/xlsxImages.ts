import escudoUrl from '../assets/brand/escudo-astrea-doc.png';
import feriaUrl from '../assets/brand/feria-emprendimiento-doc.png';

interface SizedImage {
  content: Blob;
  contentType: string;
  width: number;
  height: number;
  dpi: number;
  title: string;
}

export interface ReportImages {
  escudo: SizedImage;
  feria: SizedImage;
  /** Franja verde, roja y amarilla del ancho de la tabla. */
  stripe: (width: number) => SizedImage | null;
}

// Se dibujan al doble del tamaño en que se ven para que salgan nítidas al imprimir.
const SCALE = 2;

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo crear la imagen'))), 'image/png'));
}

async function scaledLogo(url: string, width: number, height: number, title: string): Promise<SizedImage> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = width * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Sin canvas');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { content: await canvasToPng(canvas), contentType: 'image/png', width, height, dpi: 96, title };
}

/**
 * Cada hoja tiene su propio ancho, así que la franja se dibuja en el momento (con toDataURL, que es
 * síncrono) y se guarda por ancho.
 */
function stripeFactory(): (width: number) => SizedImage | null {
  const cache = new Map<number, Blob>();
  const height = 4;
  return (width: number) => {
    const w = Math.max(40, Math.round(width));
    let blob = cache.get(w);
    if (!blob) {
      const canvas = document.createElement('canvas');
      canvas.width = w * SCALE;
      canvas.height = height * SCALE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      // Mismas proporciones que la barra del logo de la Alcaldía.
      const segments: Array<[string, number]> = [
        ['#009240', 0.53],
        ['#DA251D', 0.27],
        ['#FFF500', 0.2],
      ];
      let x = 0;
      for (const [color, share] of segments) {
        const segment = Math.round(canvas.width * share);
        ctx.fillStyle = color;
        ctx.fillRect(x, 0, segment + 1, canvas.height);
        x += segment;
      }
      blob = dataUrlToBlob(canvas.toDataURL('image/png'));
      cache.set(w, blob);
    }
    return { content: blob, contentType: 'image/png', width: w, height, dpi: 96, title: 'Franja de colores de la Alcaldía' };
  };
}

function dataUrlToBlob(dataUrl: string): Blob {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: 'image/png' });
}

let loading: Promise<ReportImages | null> | null = null;

/** Logos del membrete. Si algo falla, el reporte sale igual, solo que sin imágenes. */
export function loadReportImages(): Promise<ReportImages | null> {
  loading ??= Promise.all([
    // El escudo mide 200 × 280 y el logo de la Feria 560 × 248: se respetan las proporciones.
    scaledLogo(escudoUrl, 36, 50, 'Escudo del municipio de Astrea'),
    scaledLogo(feriaUrl, 104, 46, 'Feria de Emprendimiento'),
  ])
    .then(([escudo, feria]) => ({ escudo, feria, stripe: stripeFactory() }))
    .catch(() => {
      loading = null;
      return null;
    });
  return loading;
}
