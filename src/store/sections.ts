import { normalizeText } from '../lib/format';
import type { SectionId } from './types';

export const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'gastronomia', label: 'Gastronomía' },
  { id: 'manualidades', label: 'Manualidades' },
  { id: 'moda', label: 'Moda, Belleza y Estilo' },
];

export const SECTION_LABEL: Record<SectionId, string> = Object.fromEntries(
  SECTIONS.map((s) => [s.id, s.label]),
) as Record<SectionId, string>;

export function sectionLabel(section: SectionId | null): string {
  return section ? SECTION_LABEL[section] : 'Sin sección';
}

/** Reconoce la sección escrita a mano en el Excel ("gastronomía", "Moda y belleza", "manualidad"...). */
export function parseSection(value: string): SectionId | null | undefined {
  const text = normalizeText(value);
  if (!text) return null;
  if (text.includes('gastr') || text.includes('comida')) return 'gastronomia';
  if (text.includes('manual') || text.includes('artesan')) return 'manualidades';
  if (text.includes('moda') || text.includes('belleza') || text.includes('estilo')) return 'moda';
  return undefined;
}
