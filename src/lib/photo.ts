import type { PhotoRef } from '../store/types';
import { fileStamp } from './format';

export type EvidenceKind = 'kit';

/** Nombre estable para la foto: tipo_referencia_fecha.ext (ej. kit_FE-0003-K7Q2_20261022-101530.jpg). */
export function buildPhotoRef(kind: EvidenceKind, reference: string, file: File): PhotoRef {
  const extension = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'jpg';
  const safeReference = reference.replace(/[^A-Za-z0-9-]/g, '') || 'sin-ref';
  return {
    fileName: `${kind}_${safeReference}_${fileStamp()}.${extension}`,
    originalName: file.name,
    sizeKb: Math.round(file.size / 1024),
  };
}
