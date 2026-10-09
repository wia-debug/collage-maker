import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ruimTestDbOp } from './testhulp';
import { maakDb, type CollageDb } from './db';
import { DAG, beoordeelCollages, oudeProfielen, ruimAutomatischOp, teVragen } from './opruimen';
import { bewaarCollage, lijstCollages } from './collages';
import { maakProfiel, lijstProfielen } from './profielen';
import { nieuweCollage, nieuwId } from '../document/create';
import { AssetStore } from '../assets/store';

let db: CollageDb;
beforeEach(() => { db = maakDb(`test-${nieuwId()}`); });
afterEach(() => ruimTestDbOp(db));

const NU = 1_000 * DAG;

describe('opruimregels', () => {
  it('30 dagen = vragen, 60 dagen = wissen, grenzen exclusief', () => {
    const r = beoordeelCollages([
      { id: 'vers', gewijzigd: NU - 10 * DAG },
      { id: 'precies30', gewijzigd: NU - 30 * DAG },
      { id: 'oud', gewijzigd: NU - 31 * DAG },
      { id: 'precies60', gewijzigd: NU - 60 * DAG },
      { id: 'heelOud', gewijzigd: NU - 61 * DAG },
    ], NU);
    expect(r).toEqual({ vragen: ['oud', 'precies60'], wissen: ['heelOud'] });
  });

  it('oude profielen: geen collages én 60 dagen niet gebruikt', () => {
    const p = (id: string, dagen: number) => ({ id, naam: id, symbool: 'star', kleur: '#000000', pin: { salt: '', hash: '', iteraties: 1 }, aangemaakt: 0, laatstGebruikt: NU - dagen * DAG });
    expect(oudeProfielen([p('a', 61), p('b', 61), p('c', 10)], new Set(['b']), NU)).toEqual(['a']);
  });

  it('ruimAutomatischOp wist heel oude collages en lege oude profielen', async () => {
    const leeg = new AssetStore();
    const oudProfiel = await maakProfiel(db, { naam: 'Oud', symbool: 'star', kleur: '#000000', pin: ['star', 'star', 'star'] });
    await db.profielen.update(oudProfiel.id, { laatstGebruikt: NU - 90 * DAG });
    await bewaarCollage(db, { ...nieuweCollage('vierkant', 'heel oud'), profielId: oudProfiel.id, gewijzigd: NU - 70 * DAG }, leeg);
    await bewaarCollage(db, { ...nieuweCollage('vierkant', 'vers'), gewijzigd: NU - 1 * DAG }, leeg);
    await ruimAutomatischOp(db, NU);
    expect((await lijstCollages(db, null)).map((c) => c.naam)).toEqual(['vers']);
    expect(await lijstProfielen(db)).toEqual([]);
  });

  it('teVragen geeft collages tussen 30 en 60 dagen van dat profiel', async () => {
    const leeg = new AssetStore();
    await bewaarCollage(db, { ...nieuweCollage('vierkant', 'oud'), profielId: 'p', gewijzigd: NU - 40 * DAG }, leeg);
    await bewaarCollage(db, { ...nieuweCollage('vierkant', 'vers'), profielId: 'p', gewijzigd: NU - 2 * DAG }, leeg);
    await bewaarCollage(db, { ...nieuweCollage('vierkant', 'ander'), profielId: 'q', gewijzigd: NU - 40 * DAG }, leeg);
    expect((await teVragen(db, 'p', NU)).map((c) => c.naam)).toEqual(['oud']);
  });
});
