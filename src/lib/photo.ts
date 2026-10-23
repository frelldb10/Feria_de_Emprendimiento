import { fileStamp } from './format';

export type EvidenceKind = 'kit';

/** Nombre estable para la foto: tipo_referencia_fecha.jpg (ej. kit_FE-0003-K7QM_20261022-101530.jpg). */
export function photoFileName(kind: EvidenceKind, reference: string): string {
  const safeReference = reference.replace(/[^A-Za-z0-9-]/g, '') || 'sin-ref';
  return `${kind}_${safeReference}_${fileStamp()}.jpg`;
}
