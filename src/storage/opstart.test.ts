import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ruimTestDbOp } from './testhulp';
import { maakDb, type CollageDb } from './db';
import { opstart, toestelUitUrl } from './opstart';
import { leesInstellingen } from './instellingen';
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

describe('opstart met een toestel in de link', () => {
  it('schrijft instellingen zonder mastercode als er nog geen zijn', async () => {
    const i = await opstart(db, '?toestel=chromebook');
    expect(i).toEqual({ toestel: 'chromebook', profielenAan: false, master: null });
    expect((await leesInstellingen(db)).toestel).toBe('chromebook');
  });

  it('negeert de link als er al instellingen zijn', async () => {
    await opstart(db, '?toestel=chromebook');
    expect((await opstart(db, '?toestel=ipad')).toestel).toBe('chromebook');
  });

  it('zonder link blijven de instellingen leeg', async () => {
    expect((await opstart(db, '')).toestel).toBeNull();
  });
});
