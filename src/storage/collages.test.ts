import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CollageFout } from '../document/validatie';
import { maakDb, type CollageDb } from './db';
import { bewaarCollage, gebruikteAssets, laadCollage, lijstCollages, vulAssets, wisCollages } from './collages';
import { kopieVan, maakFoto, nieuweCollage, nieuwId } from '../document/create';
import { AssetStore } from '../assets/store';
import type { Collage } from '../document/types';

let db: CollageDb;
beforeEach(() => { db = maakDb(`test-${nieuwId()}`); });
afterEach(async () => { db.close(); await db.delete(); });

async function png(): Promise<Blob> {
  const c = new OffscreenCanvas(4, 4);
  c.getContext('2d')!.fillRect(0, 0, 4, 4);
  return c.convertToBlob({ type: 'image/png' });
}

async function collageMetFoto(profielId: string | null = null): Promise<{ c: Collage; assets: AssetStore }> {
  const assets = new AssetStore();
  const id = await assets.addBlob(await png());
  const c = { ...nieuweCollage('vierkant'), profielId, elementen: [maakFoto({ x: 1, y: 1, breedte: 4, hoogte: 4, assetId: id })] };
  return { c, assets };
}

describe('collages', () => {
  it('gebruikteAssets vindt foto-elementen en fotoachtergrond, zonder dubbels', () => {
    const c = { ...nieuweCollage('vierkant'), achtergrond: { soort: 'foto' as const, assetId: 'b' }, elementen: [maakFoto({ x: 0, y: 0, breedte: 1, hoogte: 1, assetId: 'a' }), maakFoto({ x: 0, y: 0, breedte: 1, hoogte: 1, assetId: 'a' }), maakFoto({ x: 0, y: 0, breedte: 1, hoogte: 1, assetId: null })] };
    expect(gebruikteAssets(c).sort()).toEqual(['a', 'b']);
  });

  it('bewaart en laadt een collage met afbeeldingen', async () => {
    const { c, assets } = await collageMetFoto();
    await bewaarCollage(db, c, assets);
    const r = await laadCollage(db, c.id);
    expect(r!.collage).toEqual(c);
    expect([...r!.blobs.keys()]).toEqual(gebruikteAssets(c));
    const nieuw = new AssetStore();
    await vulAssets(nieuw, r!.blobs);
    expect(nieuw.image(gebruikteAssets(c)[0])).toBeDefined();
  });

  it('ruimt niet meer gebruikte afbeeldingen op bij opnieuw bewaren', async () => {
    const { c, assets } = await collageMetFoto();
    await bewaarCollage(db, c, assets);
    await bewaarCollage(db, { ...c, elementen: [] }, assets);
    expect(await db.assets.where('collageId').equals(c.id).count()).toBe(0);
  });

  it('behoudt het voorbeeld als er geen nieuw wordt meegegeven', async () => {
    const { c, assets } = await collageMetFoto();
    await bewaarCollage(db, c, assets, 'data:image/png;base64,AAA');
    await bewaarCollage(db, { ...c, naam: 'Nieuw' }, assets);
    const [s] = await lijstCollages(db, null);
    expect(s).toMatchObject({ naam: 'Nieuw', voorbeeld: 'data:image/png;base64,AAA', profielId: '' });
  });

  it('lijst per profiel, nieuwste eerst', async () => {
    const a = { ...nieuweCollage('vierkant', 'A'), profielId: 'p1', gewijzigd: 100 };
    const b = { ...nieuweCollage('vierkant', 'B'), profielId: 'p1', gewijzigd: 200 };
    const x = { ...nieuweCollage('vierkant', 'X'), profielId: 'p2', gewijzigd: 300 };
    const leeg = new AssetStore();
    for (const c of [a, b, x]) await bewaarCollage(db, c, leeg);
    expect((await lijstCollages(db, 'p1')).map((s) => s.naam)).toEqual(['B', 'A']);
    expect((await lijstCollages(db, 'p2')).map((s) => s.naam)).toEqual(['X']);
    expect(await lijstCollages(db, null)).toEqual([]);
  });

  it('wisCollages wist collage en afbeeldingen', async () => {
    const { c, assets } = await collageMetFoto();
    await bewaarCollage(db, c, assets);
    await wisCollages(db, [c.id]);
    expect(await laadCollage(db, c.id)).toBeNull();
    expect(await db.assets.count()).toBe(0);
  });

  it('kopieVan geeft nieuw id en profiel, behoudt inhoud', () => {
    const c = { ...nieuweCollage('poster'), elementen: [maakFoto({ x: 0, y: 0, breedte: 1, hoogte: 1, assetId: 'a' })] };
    const k = kopieVan(c, 'p9');
    expect(k.id).not.toBe(c.id);
    expect(k.profielId).toBe('p9');
    expect(k.elementen).toEqual(c.elementen);
  });

  it('bewaren met ontbrekende afbeelding mislukt en schrijft niets', async () => {
    const c = { ...nieuweCollage('vierkant'), elementen: [maakFoto({ x: 0, y: 0, breedte: 1, hoogte: 1, assetId: 'weg' })] };
    await expect(bewaarCollage(db, c, new AssetStore())).rejects.toThrow('Afbeelding ontbreekt: weg');
    expect(await db.collages.count()).toBe(0);
    expect(await db.assets.count()).toBe(0);
  });

  it('laden met ontbrekende afbeelding is ongeldig', async () => {
    const { c, assets } = await collageMetFoto();
    await bewaarCollage(db, c, assets);
    await db.assets.clear();
    await expect(laadCollage(db, c.id)).rejects.toSatisfy((e) => e instanceof CollageFout && e.code === 'ongeldig');
  });

  it('wissen laat de afbeeldingen van een andere collage staan', async () => {
    const een = await collageMetFoto();
    const twee = await collageMetFoto();
    await bewaarCollage(db, een.c, een.assets);
    await bewaarCollage(db, twee.c, twee.assets);
    await wisCollages(db, [een.c.id]);
    expect(await db.assets.where('collageId').equals(twee.c.id).count()).toBe(1);
    expect(await db.assets.count()).toBe(1);
  });
});
