import { describe, it, expect } from 'vitest';
import { AssetStore, stickerKey } from './store';
import { maakSticker, nieuweCollage } from '../document/create';

async function pngBlob(w: number, h: number): Promise<Blob> {
  const c = new OffscreenCanvas(w, h);
  c.getContext('2d')!.fillRect(0, 0, w, h);
  return c.convertToBlob({ type: 'image/png' });
}

describe('AssetStore', () => {
  it('addBlob bewaart blob en geladen afbeelding onder hetzelfde id', async () => {
    const s = new AssetStore();
    const id = await s.addBlob(await pngBlob(30, 20));
    const img = s.image(id) as HTMLImageElement;
    expect(img.naturalWidth).toBe(30);
    expect(s.blob(id)?.type).toBe('image/png');
  });

  it('ensureSticker laadt een ingekleurde sticker één keer', async () => {
    const s = new AssetStore();
    const k1 = await s.ensureSticker('dieren/cat', '#FF6B6B');
    const k2 = await s.ensureSticker('dieren/cat', '#FF6B6B');
    expect(k1).toBe(stickerKey('dieren/cat', '#FF6B6B'));
    expect(k2).toBe(k1);
    expect((s.image(k1) as HTMLImageElement).naturalWidth).toBe(512);
  });

  it('preload laadt alle stickers van een collage', async () => {
    const s = new AssetStore();
    const c = { ...nieuweCollage('vierkant'), elementen: [maakSticker({ x: 0, y: 0, sticker: 'ruimte/rocket', kleur: '#5AA9F2', grootte: 100 })] };
    await s.preload(c);
    expect(s.image(stickerKey('ruimte/rocket', '#5AA9F2'))).toBeDefined();
  });
});
