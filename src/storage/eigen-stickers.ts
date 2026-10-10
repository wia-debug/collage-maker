import type { CollageDb, EigenStickerRij } from './db';
import { nieuwId } from '../document/create';

export const MAX_EIGEN_STICKERS = 100;

export class StickerFout extends Error {
  constructor(public code: 'vol') { super(code); }
}

export async function bewaarEigenSticker(db: CollageDb, profielId: string | null, blob: Blob, nu = Date.now()): Promise<EigenStickerRij> {
  const pid = profielId ?? '';
  return db.transaction('rw', db.eigenStickers, async () => {
    if ((await db.eigenStickers.where('profielId').equals(pid).count()) >= MAX_EIGEN_STICKERS) throw new StickerFout('vol');
    const rij: EigenStickerRij = { id: nieuwId(), profielId: pid, aangemaakt: nu, gebruikt: nu, blob };
    await db.eigenStickers.put(rij);
    return rij;
  });
}

export async function lijstEigenStickers(db: CollageDb, profielId: string | null): Promise<EigenStickerRij[]> {
  const rijen = await db.eigenStickers.where('profielId').equals(profielId ?? '').toArray();
  return rijen.sort((a, b) => b.aangemaakt - a.aangemaakt);
}

export async function gebruikEigenSticker(db: CollageDb, id: string, nu = Date.now()): Promise<void> {
  await db.eigenStickers.update(id, { gebruikt: nu });
}

export async function wisEigenSticker(db: CollageDb, id: string): Promise<void> {
  await db.eigenStickers.delete(id);
}

type Doek = OffscreenCanvas | HTMLCanvasElement;
function maakDoek(b: number, h: number): Doek {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(b, h);
  const c = document.createElement('canvas');
  c.width = b;
  c.height = h;
  return c;
}
function doekNaarPng(c: Doek): Promise<Blob> {
  if ('convertToBlob' in c) return c.convertToBlob({ type: 'image/png' });
  return new Promise((ok, fout) => c.toBlob((b) => (b ? ok(b) : fout(new Error('png'))), 'image/png'));
}

export async function snijTransparantBij(blob: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(blob);
  const c = maakDoek(bmp.width, bmp.height);
  const x = c.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  x.drawImage(bmp, 0, 0);
  const { data, width, height } = x.getImageData(0, 0, bmp.width, bmp.height);
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let px = 0; px < width; px++) {
      if (data[(y * width + px) * 4 + 3] > 8) {
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return blob;
  const b = maxX - minX + 1, h = maxY - minY + 1;
  const uit = maakDoek(b, h);
  (uit.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D).drawImage(c, minX, minY, b, h, 0, 0, b, h);
  return doekNaarPng(uit);
}
