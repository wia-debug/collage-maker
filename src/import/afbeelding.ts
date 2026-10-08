import { loadImage } from '../assets/store';

export class ImportFout extends Error {
  constructor(public code: 'geen-afbeelding' | 'geblokkeerd' | 'kapot') { super(code); }
}

export const FOUTTEKST: Record<ImportFout['code'], string> = {
  'geen-afbeelding': 'Dat is geen foto. Probeer een foto.',
  geblokkeerd: 'Deze foto kan ik niet ophalen. Bewaar hem eerst en voeg hem dan toe.',
  kapot: 'Deze foto kan ik niet openen.',
};

export function pasIn(w: number, h: number, max: number): { breedte: number; hoogte: number } {
  const s = Math.min(1, max / Math.max(w, h));
  return { breedte: Math.round(w * s), hoogte: Math.round(h * s) };
}

async function decodeer(blob: Blob): Promise<{ bron: CanvasImageSource; w: number; h: number; sluit(): void }> {
  try {
    const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    return { bron: bmp, w: bmp.width, h: bmp.height, sluit: () => bmp.close() };
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      const img = await loadImage(url);
      if (!img.naturalWidth) throw new Error();
      return { bron: img, w: img.naturalWidth, h: img.naturalHeight, sluit: () => URL.revokeObjectURL(url) };
    } catch {
      URL.revokeObjectURL(url);
      throw new ImportFout('kapot');
    }
  }
}

export async function verkleinAfbeelding(blob: Blob, max = 2048): Promise<Blob> {
  if (!blob.type.startsWith('image/')) throw new ImportFout('geen-afbeelding');
  const d = await decodeer(blob);
  const { breedte, hoogte } = pasIn(d.w, d.h, max);
  const klein = breedte === d.w && hoogte === d.h;
  if (klein && blob.size < 4_000_000 && blob.type !== 'image/svg+xml') { d.sluit(); return blob; }
  const c = document.createElement('canvas');
  c.width = breedte;
  c.height = hoogte;
  c.getContext('2d')!.drawImage(d.bron, 0, 0, breedte, hoogte);
  d.sluit();
  const type = blob.type === 'image/png' || blob.type === 'image/webp' || blob.type === 'image/gif' || blob.type === 'image/svg+xml' ? 'image/png' : 'image/jpeg';
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new ImportFout('kapot'))), type, 0.9));
}

function urlUit(dt: DataTransfer): string | null {
  const lijst = dt.getData('text/uri-list').split(/\r?\n/).find((l) => l && !l.startsWith('#'));
  if (lijst) return lijst.trim();
  const html = dt.getData('text/html');
  const m = html.match(/<img[^>]+src="([^"]+)"/i);
  return m ? m[1] : null;
}

export async function afbeeldingenUit(dt: DataTransfer): Promise<Blob[]> {
  const bestanden = [...dt.files];
  const fotos = bestanden.filter((f) => f.type.startsWith('image/'));
  if (fotos.length) return fotos;
  if (bestanden.length) throw new ImportFout('geen-afbeelding');
  const url = urlUit(dt);
  if (!url) throw new ImportFout('geen-afbeelding');
  try {
    const r = await fetch(url, { mode: 'cors' });
    if (!r.ok) throw new Error();
    const b = await r.blob();
    if (!b.type.startsWith('image/')) throw new Error();
    return [b];
  } catch {
    throw new ImportFout('geblokkeerd');
  }
}
