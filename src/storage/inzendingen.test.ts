import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import JSZip from 'jszip';
import { maakDb, type CollageDb } from './db';
import { ruimTestDbOp } from './testhulp';
import { maakVorm, nieuweCollage, nieuwId } from '../document/create';
import { naarBestand } from './bestand';
import { CollageFout } from '../document/validatie';
import { SCHEMA_VERSIE } from '../document/types';
import { bewaarInzending, lijstInzendingen, wisAlleInzendingen, wisInzending } from './inzendingen';

let db: CollageDb;
beforeEach(() => { db = maakDb(`test-${nieuwId()}`); });
afterEach(() => ruimTestDbOp(db));

const pakket = async () => {
  const c = { ...nieuweCollage('vierkant'), elementen: [maakVorm({ x: 1, y: 1, vorm: 'ster', breedte: 10, hoogte: 10 })] };
  return naarBestand(c, { blob: () => undefined }, new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }));
};

describe('inzendingen', () => {
  it('bewaart geldige pakketten met voorbeeld, nieuwste eerst', async () => {
    const a = await bewaarInzending(db, 'Lies', await pakket(), 1000);
    const b = await bewaarInzending(db, 'Lies', await pakket(), 2000);
    const lijst = await lijstInzendingen(db);
    expect(lijst.map((r) => r.id)).toEqual([b.id, a.id]);
    expect(lijst[0].voorbeeld).toBeInstanceOf(Blob);
  });
  it('weigert een kapot of nieuwer pakket en bewaart niets', async () => {
    await expect(bewaarInzending(db, 'Lies', new Blob(['geen zip']))).rejects.toBeInstanceOf(CollageFout);
    const zip = new JSZip();
    zip.file('collage.json', JSON.stringify({ ...nieuweCollage('vierkant'), versie: SCHEMA_VERSIE + 1 }));
    await expect(bewaarInzending(db, 'Lies', await zip.generateAsync({ type: 'blob' }))).rejects.toMatchObject({ code: 'nieuwer' });
    expect(await lijstInzendingen(db)).toHaveLength(0);
  });
  it('wist één of alles', async () => {
    const a = await bewaarInzending(db, 'A', await pakket());
    await bewaarInzending(db, 'B', await pakket());
    await wisInzending(db, a.id);
    expect(await lijstInzendingen(db)).toHaveLength(1);
    await wisAlleInzendingen(db);
    expect(await lijstInzendingen(db)).toHaveLength(0);
  });
});
