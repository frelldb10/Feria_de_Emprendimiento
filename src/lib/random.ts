// crypto.randomUUID solo existe en contextos seguros (https o localhost). Al probar desde
// el celular por la IP de la red local no está disponible, así que se usa getRandomValues.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function randomToken(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let token = '';
  for (const byte of bytes) token += ALPHABET[byte % ALPHABET.length];
  return token;
}

export function createId(prefix: string): string {
  return `${prefix}_${randomToken(10).toLowerCase()}`;
}
