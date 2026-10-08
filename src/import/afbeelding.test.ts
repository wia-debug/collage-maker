import { describe, it, expect } from 'vitest';
import { ImportFout, afbeeldingenUit, pasIn, verkleinAfbeelding } from './afbeelding';

async function maakBlob(w: number, h: number, type = 'image/jpeg'): Promise<Blob> {
  const c = new OffscreenCanvas(w, h);
  const x = c.getContext('2d')!;
  x.fillStyle = '#4ECDC4';
  x.fillRect(0, 0, w, h);
  return c.convertToBlob({ type, quality: 0.9 });
}

async function maat(b: Blob) {
  const bmp = await createImageBitmap(b);
  return { w: bmp.width, h: bmp.height };
}

describe('pasIn', () => {
  it('verkleint de lange zijde tot max', () => {
    expect(pasIn(4000, 3000, 2048)).toEqual({ breedte: 2048, hoogte: 1536 });
    expect(pasIn(1000, 3000, 2048)).toEqual({ breedte: 683, hoogte: 2048 });
  });
  it('vergroot nooit', () => {
    expect(pasIn(300, 200, 2048)).toEqual({ breedte: 300, hoogte: 200 });
  });
});

describe('verkleinAfbeelding', () => {
  it('maakt een grote foto maximaal 2048 px', async () => {
    const uit = await verkleinAfbeelding(await maakBlob(4000, 3000));
    expect(await maat(uit)).toEqual({ w: 2048, h: 1536 });
    expect(uit.type).toBe('image/jpeg');
  });

  it('laat een kleine foto ongemoeid', async () => {
    const b = await maakBlob(200, 100);
    expect(await verkleinAfbeelding(b)).toBe(b);
  });

  it('houdt PNG als PNG (transparantie)', async () => {
    const uit = await verkleinAfbeelding(await maakBlob(3000, 3000, 'image/png'));
    expect(uit.type).toBe('image/png');
  });

  it('valt terug op <img>-decodering als createImageBitmap faalt', async () => {
    const svg = new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="1000"><rect width="3000" height="1000" fill="red"/></svg>'], { type: 'image/svg+xml' });
    const uit = await verkleinAfbeelding(svg);
    expect(await maat(uit)).toEqual({ w: 2048, h: 683 });
  });

  it('weigert iets dat geen afbeelding is', async () => {
    await expect(verkleinAfbeelding(new Blob(['hallo'], { type: 'text/plain' }))).rejects.toMatchObject({ code: 'geen-afbeelding' });
  });

  it('meldt een kapotte afbeelding', async () => {
    await expect(verkleinAfbeelding(new Blob(['geen jpeg'], { type: 'image/jpeg' }))).rejects.toBeInstanceOf(ImportFout);
  });
});

describe('afbeeldingenUit', () => {
  it('geeft afbeeldingsbestanden terug', async () => {
    const dt = new DataTransfer();
    dt.items.add(new File([await maakBlob(10, 10)], 'a.jpg', { type: 'image/jpeg' }));
    expect(await afbeeldingenUit(dt)).toHaveLength(1);
  });

  it('weigert alleen niet-afbeeldingen', async () => {
    const dt = new DataTransfer();
    dt.items.add(new File(['x'], 'a.txt', { type: 'text/plain' }));
    await expect(afbeeldingenUit(dt)).rejects.toMatchObject({ code: 'geen-afbeelding' });
  });

  it('haalt een afbeelding op via een URL (data-URL)', async () => {
    const c = document.createElement('canvas');
    c.width = c.height = 4;
    const dt = new DataTransfer();
    dt.setData('text/uri-list', c.toDataURL('image/png'));
    const uit = await afbeeldingenUit(dt);
    expect(uit[0].type).toBe('image/png');
  });

  it('meldt geblokkeerd als de URL niet opgehaald kan worden', async () => {
    const dt = new DataTransfer();
    dt.setData('text/uri-list', 'https://voorbeeld.invalid/foto.jpg');
    await expect(afbeeldingenUit(dt)).rejects.toMatchObject({ code: 'geblokkeerd' });
  });

  it('meldt geen-afbeelding bij lege overdracht', async () => {
    await expect(afbeeldingenUit(new DataTransfer())).rejects.toMatchObject({ code: 'geen-afbeelding' });
  });
});
