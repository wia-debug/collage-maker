import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ruimTestDbOp } from './testhulp';
import { maakDb, type CollageDb } from './db';
import { controleerCode, maakHash } from './hash';
import { leesInstellingen, profielenActief, schrijfInstellingen } from './instellingen';
import { nieuwId } from '../document/create';

let db: CollageDb;
beforeEach(() => { db = maakDb(`test-${nieuwId()}`); });
afterEach(() => ruimTestDbOp(db));

describe('hash', () => {
  it('controleert de juiste code en weigert een andere', async () => {
    const h = await maakHash('123456', 1000);
    expect(h.iteraties).toBe(1000);
    expect(await controleerCode('123456', h)).toBe(true);
    expect(await controleerCode('123457', h)).toBe(false);
  });
  it('geeft false bij een beschadigde opgeslagen code', async () => {
    const h = await maakHash('123456', 1000);
    expect(await controleerCode('123456', { ...h, salt: '***' })).toBe(false);
    expect(await controleerCode('123456', { ...h, iteraties: 0 })).toBe(false);
  });
  it('gebruikt elke keer een andere salt', async () => {
    const a = await maakHash('x', 1000), b = await maakHash('x', 1000);
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });
});

describe('instellingen', () => {
  it('standaard leeg', async () => {
    expect(await leesInstellingen(db)).toEqual({ toestel: null, profielenAan: false, master: null, cloudDelen: 'leerkracht' });
  });
  it('schrijven voegt samen en blijft bewaard', async () => {
    await schrijfInstellingen(db, { toestel: 'pc' });
    await schrijfInstellingen(db, { profielenAan: true });
    const i = await leesInstellingen(db);
    expect(i).toMatchObject({ toestel: 'pc', profielenAan: true });
  });
  it('cloudDelen staat standaard op leerkracht, ook voor oude instellingen', async () => {
    expect((await leesInstellingen(db)).cloudDelen).toBe('leerkracht');
    await db.instellingen.put({ sleutel: 'app', waarde: { toestel: 'pc', profielenAan: false, master: null } });
    expect((await leesInstellingen(db)).cloudDelen).toBe('leerkracht');
    await schrijfInstellingen(db, { cloudDelen: 'nooit' });
    expect((await leesInstellingen(db)).cloudDelen).toBe('nooit');
  });
  it('profielenActief: iPad altijd, pc alleen als aan, chromebook nooit', () => {
    const basis = { master: null, profielenAan: false, cloudDelen: 'leerkracht' as const };
    expect(profielenActief({ ...basis, toestel: 'ipad' })).toBe(true);
    expect(profielenActief({ ...basis, toestel: 'pc' })).toBe(false);
    expect(profielenActief({ ...basis, toestel: 'pc', profielenAan: true })).toBe(true);
    expect(profielenActief({ ...basis, toestel: 'chromebook', profielenAan: true })).toBe(false);
  });
});

describe('schema', () => {
  it('heeft de vier tabellen', async () => {
    await db.open();
    expect(db.tables.map((t) => t.name).sort()).toEqual(['assets', 'collages', 'instellingen', 'profielen']);
  });
});
