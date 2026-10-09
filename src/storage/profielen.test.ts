import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ruimTestDbOp } from './testhulp';
import { maakDb, type CollageDb } from './db';
import { controleerPin, lijstProfielen, maakProfiel, wisProfiel, zetPin, PIN_SYMBOLEN, PROFIEL_SYMBOLEN } from './profielen';
import { bewaarCollage, lijstCollages } from './collages';
import { nieuweCollage, nieuwId } from '../document/create';
import { AssetStore } from '../assets/store';

let db: CollageDb;
beforeEach(() => { db = maakDb(`test-${nieuwId()}`); });
afterEach(() => ruimTestDbOp(db));

const pin = ['star', 'heart', 'cloud'];

describe('profielen', () => {
  it('symbolensets hebben de juiste grootte en geen dubbels', () => {
    expect(PIN_SYMBOLEN).toHaveLength(9);
    expect(new Set(PIN_SYMBOLEN).size).toBe(9);
    expect(PROFIEL_SYMBOLEN).toHaveLength(12);
  });

  it('maakt profielen en sorteert op naam', async () => {
    await maakProfiel(db, { naam: 'Zoë', symbool: 'rocket', kleur: '#FF6B6B', pin });
    await maakProfiel(db, { naam: 'Amir', symbool: 'cake', kleur: '#4ECDC4', pin });
    expect((await lijstProfielen(db)).map((p) => p.naam)).toEqual(['Amir', 'Zoë']);
  });

  it('controleert de pincode en werkt laatstGebruikt bij', async () => {
    const p = await maakProfiel(db, { naam: 'Lies', symbool: 'star', kleur: '#FFC94D', pin });
    expect(await controleerPin(db, p.id, ['star', 'heart', 'drop'])).toBe(false);
    expect(await controleerPin(db, p.id, ['heart', 'star', 'cloud'])).toBe(false);
    const voor = (await db.profielen.get(p.id))!.laatstGebruikt;
    await new Promise((r) => setTimeout(r, 5));
    expect(await controleerPin(db, p.id, pin)).toBe(true);
    expect((await db.profielen.get(p.id))!.laatstGebruikt).toBeGreaterThan(voor);
    expect(await controleerPin(db, 'bestaat-niet', pin)).toBe(false);
  });

  it('zetPin vervangt de pincode', async () => {
    const p = await maakProfiel(db, { naam: 'Lies', symbool: 'star', kleur: '#FFC94D', pin });
    await zetPin(db, p.id, ['car', 'car', 'car']);
    expect(await controleerPin(db, p.id, pin)).toBe(false);
    expect(await controleerPin(db, p.id, ['car', 'car', 'car'])).toBe(true);
  });

  it('wisProfiel wist alleen de collages van dat profiel', async () => {
    const a = await maakProfiel(db, { naam: 'A', symbool: 'star', kleur: '#FFC94D', pin });
    const b = await maakProfiel(db, { naam: 'B', symbool: 'star', kleur: '#FFC94D', pin });
    const leeg = new AssetStore();
    await bewaarCollage(db, { ...nieuweCollage('vierkant'), profielId: a.id }, leeg);
    await bewaarCollage(db, { ...nieuweCollage('vierkant'), profielId: b.id }, leeg);
    await wisProfiel(db, a.id);
    expect(await lijstCollages(db, a.id)).toEqual([]);
    expect(await lijstCollages(db, b.id)).toHaveLength(1);
    expect((await lijstProfielen(db)).map((p) => p.naam)).toEqual(['B']);
  });

  it('een juiste pin blijft geldig als laatstGebruikt niet bewaard kan worden', async () => {
    const p = await maakProfiel(db, { naam: 'Vol', symbool: 'rocket', kleur: '#FF6B6B', pin });
    db.profielen.update = (() => Promise.reject(new Error('vol'))) as unknown as typeof db.profielen.update;
    expect(await controleerPin(db, p.id, pin)).toBe(true);
  });
});
