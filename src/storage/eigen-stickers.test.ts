import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { maakDb, type CollageDb } from './db';
import { ruimTestDbOp } from './testhulp';
import { nieuwId } from '../document/create';
import { bewaarEigenSticker, gebruikEigenSticker, lijstEigenStickers, MAX_EIGEN_STICKERS, snijTransparantBij, snijUit, StickerFout, wisEigenSticker } from './eigen-stickers';

let db: CollageDb;
beforeEach(() => { db = maakDb(`test-${nieuwId()}`); });
afterEach(() => ruimTestDbOp(db));
const png = () => new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });

describe('eigen stickers', () => {
  it('bewaart per profiel, nieuwste eerst, en wist', async () => {
    const a = await bewaarEigenSticker(db, 'p1', png(), 1000);
    const b = await bewaarEigenSticker(db, 'p1', png(), 2000);
    await bewaarEigenSticker(db, null, png(), 3000);
    expect((await lijstEigenStickers(db, 'p1')).map((s) => s.id)).toEqual([b.id, a.id]);
    expect(await lijstEigenStickers(db, null)).toHaveLength(1);
    await wisEigenSticker(db, a.id);
    expect(await lijstEigenStickers(db, 'p1')).toHaveLength(1);
  });
  it('maximaal 100 per profiel', async () => {
    await db.eigenStickers.bulkPut(Array.from({ length: MAX_EIGEN_STICKERS }, (_, i) => ({ id: `s${i}`, profielId: 'p1', aangemaakt: i, gebruikt: i, blob: png() })));
    await expect(bewaarEigenSticker(db, 'p1', png())).rejects.toBeInstanceOf(StickerFout);
    await expect(bewaarEigenSticker(db, 'p2', png())).resolves.toBeTruthy();
  });
  it('gebruik zet de gebruikstijd', async () => {
    const s = await bewaarEigenSticker(db, 'p1', png(), 1000);
    await gebruikEigenSticker(db, s.id, 5000);
    expect((await db.eigenStickers.get(s.id))!.gebruikt).toBe(5000);
  });
  it('snijdt transparante randen weg', async () => {
    const c = new OffscreenCanvas(100, 80);
    const x = c.getContext('2d')!;
    x.fillStyle = '#f00';
    x.fillRect(20, 10, 30, 40);
    const uit = await snijTransparantBij(await c.convertToBlob({ type: 'image/png' }));
    const bmp = await createImageBitmap(uit);
    expect([bmp.width, bmp.height]).toEqual([30, 40]);
    expect(uit.type).toBe('image/png');
  });
  it('snijUit knipt de uitsnede van een foto uit', async () => {
    const c = new OffscreenCanvas(100, 80);
    const x = c.getContext('2d')!;
    x.fillStyle = '#00f';
    x.fillRect(0, 0, 100, 80);
    x.fillStyle = '#f00';
    x.fillRect(10, 5, 30, 20);
    const uit = await snijUit(await c.convertToBlob({ type: 'image/png' }), { x: 10, y: 5, breedte: 30.2, hoogte: 19.8 });
    const bmp = await createImageBitmap(uit);
    expect([bmp.width, bmp.height]).toEqual([30, 20]);
    const d = new OffscreenCanvas(30, 20).getContext('2d')!;
    d.drawImage(bmp, 0, 0);
    expect([...d.getImageData(15, 10, 1, 1).data]).toEqual([255, 0, 0, 255]);
  });
});
