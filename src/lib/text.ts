import { normalizeText } from './format';

/** Para nombres de personas y entidades: deja letras (con tildes y ñ), espacios, punto, guion y "&". */
export function onlyLetters(value: string): string {
  return value.replace(/[^\p{L}\s.&'-]/gu, '').replace(/\s{2,}/g, ' ').replace(/^\s+/, '');
}

export const NAME_PATTERN = /^\p{L}[\p{L}\s.&'-]*$/u;

/** Nombre completo: al menos dos palabras de dos letras o más (nombre y apellido). */
export function isFullName(value: string): boolean {
  const name = value.trim();
  return NAME_PATTERN.test(name) && name.split(/\s+/).filter((part) => part.length >= 2).length >= 2;
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** "Laura Daza Pérez" → "laura.daza" */
export function suggestUsername(fullName: string): string {
  const parts = normalizeText(fullName).replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).join('.');
}
