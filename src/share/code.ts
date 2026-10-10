export const DEEL_SYMBOLEN = ['star', 'heart', 'cloud', 'drop', 'leaf', 'rocket', 'cake', 'car', 'pizza', 'tree', 'soccer-ball', 'paw-print'];
export const DEEL_LENGTE = 4;
const LETTERS = 'abcdefghijkl';

export function nieuweCode(): string[] {
  const r = crypto.getRandomValues(new Uint8Array(DEEL_LENGTE));
  return [...r].map((x) => DEEL_SYMBOLEN[x % DEEL_SYMBOLEN.length]);
}

export function codeNaarSleutel(code: string[]): string {
  if (code.length !== DEEL_LENGTE) throw new Error('Verkeerde codelengte');
  return code.map((s) => {
    const i = DEEL_SYMBOLEN.indexOf(s);
    if (i < 0) throw new Error(`Onbekend symbool: ${s}`);
    return LETTERS[i];
  }).join('');
}

export const peerId = (code: string[]): string => `kidscollage-${codeNaarSleutel(code)}`;
