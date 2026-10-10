import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ruimTestDbOp } from './testhulp';
import { maakDb, type CollageDb } from './db';
import { opstart, toestelUitUrl } from './opstart';
import { leesInstellingen, schrijfInstellingen } from './instellingen';
import { controleerCode } from './hash';
import { nieuwId } from '../document/create';

let db: CollageDb;
beforeEach(() => { db = maakDb(`test-${nieuwId()}`); });
afterEach(() => ruimTestDbOp(db));

describe('toestelUitUrl', () => {
  it('herkent de drie toestellen en negeert de rest', () => {
    expect(toestelUitUrl('?toestel=chromebook')).toBe('chromebook');
    expect(toestelUitUrl('?x=1&toestel=ipad')).toBe('ipad');
    expect(toestelUitUrl('?toestel=pc')).toBe('pc');
    expect(toestelUitUrl('?toestel=tv')).toBeNull();
    expect(toestelUitUrl('')).toBeNull();
  });
});

describe('opstart zonder eerstestartscherm', () => {
  it('schrijft standaard iPad, geen profielen en de code 000000', async () => {
    const i = await opstart(db, '');
    expect(i).toMatchObject({ toestel: 'ipad', profielenAan: false });
    expect(i.master).not.toBeNull();
    expect(await controleerCode('000000', i.master!)).toBe(true);
    expect(await controleerCode('123456', i.master!)).toBe(false);
    expect((await leesInstellingen(db)).toestel).toBe('ipad');
  });

  it('het toestel uit de link wint van de standaard, ook met de code 000000', async () => {
    const i = await opstart(db, '?toestel=chromebook');
    expect(i.toestel).toBe('chromebook');
    expect(i.profielenAan).toBe(false);
    expect(await controleerCode('000000', i.master!)).toBe(true);
    expect((await leesInstellingen(db)).toestel).toBe('chromebook');
  });

  it('negeert de link en laat de code staan als er al instellingen zijn', async () => {
    const eerst = await opstart(db, '?toestel=chromebook');
    const nu = await opstart(db, '?toestel=ipad');
    expect(nu.toestel).toBe('chromebook');
    expect(nu.master).toEqual(eerst.master);
  });

  it('vult een ontbrekende code aan zonder het toestel te veranderen', async () => {
    await schrijfInstellingen(db, { toestel: 'pc', profielenAan: true });
    const i = await opstart(db, '');
    expect(i).toMatchObject({ toestel: 'pc', profielenAan: true });
    expect(await controleerCode('000000', i.master!)).toBe(true);
  });
});
