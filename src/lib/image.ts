/**
 * Achica la foto antes de subirla: una foto de celular pesa 3-5 MB y por el internet del
 * evento tardaría mucho. A 1600 px de lado y calidad 0,8 queda en unos 200-400 KB y se
 * sigue viendo bien como evidencia. Respeta la orientación con que se tomó.
 */
export async function compressImage(file: File, maxSide = 1600, quality = 0.8): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Formato que el navegador no sabe abrir: se sube tal cual.
    return file;
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', quality));
}
