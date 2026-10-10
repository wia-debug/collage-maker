import { describe, it, expect } from 'vitest';
import { CollageFout, leesCollage, MIGRATIES } from './validatie';
import { maakFoto, maakSticker, maakTekening, maakTekst, maakVorm, nieuweCollage } from './create';
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

  it('accepteert optionele motief en doorzichtigheid en weigert verkeerde typen', () => {
    const foto = maakFoto({ x: 1, y: 1, breedte: 5, hoogte: 5, assetId: 'a' });
    const sticker = maakSticker({ x: 1, y: 1, sticker: 'a/b', kleur: '#FFFFFF', grootte: 10 });
    expect(fout({ ...geldig(), elementen: [{ ...foto, kader: { ...foto.kader, motief: 'hartjes' } }, { ...sticker, doorzichtigheid: 0.5 }] })).toBeNull();
    expect(fout({ ...geldig(), elementen: [{ ...foto, kader: { ...foto.kader, motief: 3 } }] })).toBe('ongeldig');
    expect(fout({ ...geldig(), elementen: [{ ...sticker, doorzichtigheid: 'half' }] })).toBe('ongeldig');
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

describe('leesCollage: diepe validatie', () => {
  const elementen = () => ({
    foto: maakFoto({ x: 0, y: 0, breedte: 5, hoogte: 5, assetId: 'a' }),
    tekst: maakTekst({ x: 0, y: 0, tekst: 'hoi' }),
    sticker: maakSticker({ x: 0, y: 0, sticker: 'heart', kleur: '#f00', grootte: 50 }),
    vorm: maakVorm({ x: 0, y: 0, vorm: 'hart', breedte: 10, hoogte: 10 }),
    tekening: maakTekening([0, 0, 10, 10], 'pen', '#000', 4),
  }) as unknown as Record<string, Record<string, unknown>>;
  const metElement = (e: unknown) => ({ ...geldig(), elementen: [e] });

  it('weigert een prototype-sleutel als formaat', () => {
    expect(fout({ ...geldig(), formaat: 'constructor' })).toBe('ongeldig');
  });

  it.each(Object.keys(elementen()))('accepteert een geldig %s-element', (type) => {
    expect(fout(metElement(elementen()[type]))).toBeNull();
  });

  const kapot: [string, string, unknown][] = [
    ['foto', 'assetId', 5], ['foto', 'uitsnede', { x: 1 }], ['foto', 'masker', 1], ['foto', 'kader', { stijl: 'geen' }],
    ['foto', 'filter', null], ['foto', 'helderheid', 'veel'], ['foto', 'contrast', undefined],
    ['tekst', 'tekst', 1], ['tekst', 'lettertype', null], ['tekst', 'kleur', 1], ['tekst', 'grootte', 'groot'],
    ['sticker', 'sticker', 1], ['sticker', 'kleur', undefined],
    ['vorm', 'vorm', 1], ['vorm', 'randDikte', 'dik'], ['vorm', 'doorzichtigheid', NaN],
    ['tekening', 'gereedschap', 1], ['tekening', 'kleur', 1], ['tekening', 'dikte', '4'], ['tekening', 'punten', [1, 'x']], ['tekening', 'punten', 'nee'],
    ['foto', 'gespiegeld', 'ja'], ['tekst', 'vergrendeld', undefined],
  ];
  it.each(kapot)('weigert %s met kapot veld %s', (type, veld, waarde) => {
    expect(fout(metElement({ ...elementen()[type], [veld]: waarde }))).toBe('ongeldig');
  });

  it('accepteert een foto met uitsnede', () => {
    expect(fout(metElement({ ...elementen().foto, uitsnede: { x: 0, y: 0, breedte: 1, hoogte: 1 } }))).toBeNull();
  });

  const achtergronden: [string, unknown, unknown][] = [
    ['kleur', { soort: 'kleur', kleur: '#fff' }, { soort: 'kleur' }],
    ['verloop', { soort: 'verloop', van: 'a', naar: 'b', hoek: 90 }, { soort: 'verloop', van: 'a', naar: 'b', hoek: '90' }],
    ['patroon', { soort: 'patroon', patroon: 'stippen', kleur: 'a', achtergrondkleur: 'b' }, { soort: 'patroon', patroon: 'stippen', kleur: 'a' }],
    ['foto', { soort: 'foto', assetId: 'x' }, { soort: 'foto', assetId: null }],
  ];
  it.each(achtergronden)('achtergrond %s: geldig slaagt, kapot faalt', (_n, goed, slecht) => {
    expect(fout({ ...geldig(), achtergrond: goed })).toBeNull();
    expect(fout({ ...geldig(), achtergrond: slecht })).toBe('ongeldig');
  });
  it('weigert een prototype-sleutel als soort of type', () => {
    expect(fout({ ...geldig(), achtergrond: { soort: 'constructor' } })).toBe('ongeldig');
    expect(fout(metElement({ ...elementen().vorm, type: 'toString' }))).toBe('ongeldig');
  });
});

describe('leesCollage: migraties', () => {
  const oud = () => ({ ...geldig(), versie: 0 });
  it('voert een bestaande migratie uit', () => {
    MIGRATIES[0] = (c) => ({ ...c, naam: 'gemigreerd' });
    try {
      const c = leesCollage(oud());
      expect(c.naam).toBe('gemigreerd');
      expect(c.versie).toBe(SCHEMA_VERSIE);
    } finally { delete MIGRATIES[0]; }
  });
  it('een migratie die faalt geeft ongeldig', () => {
    MIGRATIES[0] = () => { throw new TypeError('kapot'); };
    try {
      expect(fout(oud())).toBe('ongeldig');
    } finally { delete MIGRATIES[0]; }
  });
});
