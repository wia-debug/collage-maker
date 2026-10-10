import JSZip from 'jszip';
import type { Collage } from '../document/types';
import { naarBestand } from '../storage/bestand';
import { DeelFout } from './fouten';

export { DeelFout };
export const MAX_PAKKET = 25 * 1024 * 1024;

export async function maakDeelpakket(c: Collage, assets: { blob(id: string): Blob | undefined }, voorbeeldPng: Blob): Promise<Blob> {
  const pakket = await naarBestand(c, assets, voorbeeldPng);
  if (pakket.size > MAX_PAKKET) throw new DeelFout('te-groot');
  return pakket;
}

export async function voorbeeldUitPakket(pakket: Blob): Promise<string | null> {
  try {
    const zip = await JSZip.loadAsync(pakket);
    const f = zip.file('voorbeeld.png');
    return f ? `data:image/png;base64,${await f.async('base64')}` : null;
  } catch {
    return null;
  }
}
