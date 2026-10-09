import { describe, it, expect } from 'vitest';
import { CollageFout, leesCollage } from './validatie';
import { maakFoto, maakVorm, nieuweCollage } from './create';
import { SCHEMA_VERSIE } from './types';

const geldig = () => ({ ...nieuweCollage('vierkant'), elementen: [maakVorm({ x: 1, y: 2, vorm: 'hart', breedte: 10, hoogte: 10 }), maakFoto({ x: 5, y: 5, breedte: 5, hoogte: 5, assetId: 'a' })] });
const fout = (data: unknown) => { try { leesCollage(data); return null; } catch (e) { return e instanceof CollageFout ? e.code : 'andere'; } };

describe('leesCollage', () => {
  it('geeft een geldige collage ongewijzigd terug', () => {
    const c = geldig();
    expect(leesCollage(JSON.parse(JSON.stringify(c)))).toEqual(c);
  });

  it('weigert geen object, ontbrekende velden en onbekende types', () => {
    expect(fout(null)).toBe('ongeldig');
    expect(fout('tekst')).toBe('ongeldig');
    expect(fout({ ...geldig(), formaat: 'a3' })).toBe('ongeldig');
    expect(fout({ ...geldig(), elementen: 'nee' })).toBe('ongeldig');
    expect(fout({ ...geldig(), elementen: [{ id: 'x', type: 'video', x: 0, y: 0, breedte: 1, hoogte: 1, rotatie: 0, schaalX: 1, schaalY: 1 }] })).toBe('ongeldig');
    expect(fout({ ...geldig(), elementen: [{ ...maakVorm({ x: 0, y: 0, vorm: 'hart', breedte: 1, hoogte: 1 }), x: 'veel' }] })).toBe('ongeldig');
    expect(fout({ ...geldig(), achtergrond: { soort: 'glitter' } })).toBe('ongeldig');
    const { versie: _v, ...zonderVersie } = geldig();
    expect(fout(zonderVersie)).toBe('ongeldig');
  });

  it('herkent een nieuwere versie', () => {
    expect(fout({ ...geldig(), versie: SCHEMA_VERSIE + 1 })).toBe('nieuwer');
  });

  it('versie zonder migratiepad is ongeldig', () => {
    expect(fout({ ...geldig(), versie: 0 })).toBe('ongeldig');
  });

  it('vult ontbrekende profielId en tijden aan', () => {
    const { profielId: _p, aangemaakt: _a, gewijzigd: _g, ...rest } = geldig();
    const c = leesCollage(rest);
    expect(c.profielId).toBeNull();
    expect(c.gewijzigd).toBeGreaterThan(0);
  });
});
