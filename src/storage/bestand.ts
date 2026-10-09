import JSZip from 'jszip';
import type { Collage } from '../document/types';
import { CollageFout, leesCollage } from '../document/validatie';
import { gebruikteAssets } from './collages';

export async function naarBestand(c: Collage, assets: { blob(id: string): Blob | undefined }, voorbeeld?: Blob): Promise<Blob> {
  const zip = new JSZip();
  zip.file('collage.json', JSON.stringify(c));
  const map = zip.folder('assets')!;
  for (const id of gebruikteAssets(c)) {
    const b = assets.blob(id);
    if (b) map.file(id, b);
  }
  if (voorbeeld) zip.file('voorbeeld.png', voorbeeld);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
}

export async function vanBestand(bestand: Blob): Promise<{ collage: Collage; blobs: Map<string, Blob> }> {
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(bestand); } catch { throw new CollageFout('ongeldig'); }
  const json = zip.file('collage.json');
  if (!json) throw new CollageFout('ongeldig');
  let data: unknown;
  try { data = JSON.parse(await json.async('string')); } catch { throw new CollageFout('ongeldig'); }
  const collage = leesCollage(data);
  const blobs = new Map<string, Blob>();
  for (const id of gebruikteAssets(collage)) {
    const f = zip.file(`assets/${id}`);
    if (!f) throw new CollageFout('ongeldig');
    blobs.set(id, await f.async('blob'));
  }
  return { collage, blobs };
}
