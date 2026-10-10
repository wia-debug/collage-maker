import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { naarBestand, vanBestand } from './bestand';
import { AssetStore } from '../assets/store';
import { maakFoto, nieuweCollage } from '../document/create';
import { CollageFout } from '../document/validatie';
import { SCHEMA_VERSIE, type Collage } from '../document/types';

async function png(): Promise<Blob> {
  const c = new OffscreenCanvas(3, 3);
  c.getContext('2d')!.fillRect(0, 0, 3, 3);
  return c.convertToBlob({ type: 'image/png' });
}

const code = async (p: Promise<unknown>) => { try { await p; return null; } catch (e) { return e instanceof CollageFout ? e.code : 'andere'; } };

describe('.collage-bestand', () => {
  it('heen en terug: zelfde collage en afbeeldingen', async () => {
    const assets = new AssetStore();
    const id = await assets.addBlob(await png());
    const c = { ...nieuweCollage('a4-staand', 'Test'), elementen: [maakFoto({ x: 1, y: 1, breedte: 3, hoogte: 3, assetId: id })] };
    const bestand = await naarBestand(c, assets, await png());
    expect(bestand.type).toBe('application/zip');
    const zip = await JSZip.loadAsync(bestand);
    expect(Object.keys(zip.files).sort()).toEqual(['assets/', `assets/${id}`, 'collage.json', 'voorbeeld.png']);
    const r = await vanBestand(bestand);
    expect(r.collage).toEqual(c);
    expect(r.blobs.get(id)!.size).toBe((await png()).size);
  });

  it('geen zip of kapotte json is ongeldig', async () => {
    expect(await code(vanBestand(new Blob(['hallo'])))).toBe('ongeldig');
    const z = new JSZip();
    z.file('collage.json', '{kapot');
    expect(await code(vanBestand(await z.generateAsync({ type: 'blob' })))).toBe('ongeldig');
    expect(await code(vanBestand(await new JSZip().generateAsync({ type: 'blob' })))).toBe('ongeldig');
  });

  it('ontbrekende afbeelding is ongeldig', async () => {
    const z = new JSZip();
    z.file('collage.json', JSON.stringify({ ...nieuweCollage('vierkant'), elementen: [maakFoto({ x: 0, y: 0, breedte: 1, hoogte: 1, assetId: 'weg' })] }));
    expect(await code(vanBestand(await z.generateAsync({ type: 'blob' })))).toBe('ongeldig');
  });

  it('nieuwere versie geeft nieuwer', async () => {
    const z = new JSZip();
    z.file('collage.json', JSON.stringify({ ...nieuweCollage('vierkant'), versie: SCHEMA_VERSIE + 1 }));
    expect(await code(vanBestand(await z.generateAsync({ type: 'blob' })))).toBe('nieuwer');
  });

  it('naarBestand met ontbrekende afbeelding mislukt', async () => {
    const c = { ...nieuweCollage('vierkant'), elementen: [maakFoto({ x: 0, y: 0, breedte: 1, hoogte: 1, assetId: 'weg' })] };
    await expect(naarBestand(c, new AssetStore())).rejects.toThrow('Afbeelding ontbreekt: weg');
  });

  it('kapotte afbeelding in het zipbestand is ongeldig', async () => {
    const assets = new AssetStore();
    const id = await assets.addBlob(await png());
    const c = { ...nieuweCollage('vierkant'), elementen: [maakFoto({ x: 0, y: 0, breedte: 1, hoogte: 1, assetId: id })] };
    const z = new JSZip();
    z.file('collage.json', JSON.stringify(c));
    z.file(`assets/${id}`, new Uint8Array(4000).map((_, i) => (i * 7) % 251), { compression: 'DEFLATE' });
    const bytes = await z.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    const naam = new TextEncoder().encode(`assets/${id}`);
    let start = -1;
    for (let i = 0; i < bytes.length - naam.length && start < 0; i++) if (naam.every((b, k) => bytes[i + k] === b)) start = i;
    for (let i = start + naam.length; i < start + naam.length + 40; i++) bytes[i] ^= 0xff;
    expect(await code(vanBestand(new Blob([bytes as BlobPart])))).toBe('ongeldig');
  });

  it('oud .collage-bestand zonder fase 4-velden opent met vaste verhouding', async () => {
    const f = maakFoto({ x: 0, y: 0, breedte: 100, hoogte: 50, assetId: null }) as unknown as Record<string, unknown>;
    delete f.verhoudingVast; delete f.uitknipsel;
    const c = { ...nieuweCollage('vierkant'), elementen: [f] } as unknown as Collage;
    const { collage } = await vanBestand(await naarBestand(c, { blob: () => undefined }));
    expect(collage.elementen[0]).toMatchObject({ verhoudingVast: true, uitknipsel: false });
  });
});
