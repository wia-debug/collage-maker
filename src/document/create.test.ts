import { describe, it, expect } from 'vitest';
import { FORMATEN } from './formats';
import { maakFoto, maakSticker, maakTekst, maakVorm, nieuweCollage } from './create';
import { SCHEMA_VERSIE } from './types';

describe('nieuweCollage', () => {
  it('maakt een lege collage met witte achtergrond en huidige schemaversie', () => {
    const c = nieuweCollage('a4-liggend');
    expect(c.versie).toBe(SCHEMA_VERSIE);
    expect(c.formaat).toBe('a4-liggend');
    expect(c.elementen).toEqual([]);
    expect(c.achtergrond).toEqual({ soort: 'kleur', kleur: '#FFFFFF' });
    expect(c.naam).toBe('Mijn collage');
    expect(c.profielId).toBeNull();
    expect(c.gewijzigd).toBeGreaterThan(0);
  });

  it('geeft elke collage een uniek id', () => {
    expect(nieuweCollage('vierkant').id).not.toBe(nieuweCollage('vierkant').id);
  });
});

describe('formaten', () => {
  it('A4 heeft de juiste verhouding en oriëntatie', () => {
    const l = FORMATEN['a4-liggend'];
    const s = FORMATEN['a4-staand'];
    expect(l.breedte).toBeGreaterThan(l.hoogte);
    expect(s.hoogte).toBeGreaterThan(s.breedte);
    expect(l.breedte / l.hoogte).toBeCloseTo(297 / 210, 2);
  });
});

describe('elementfabrieken', () => {
  it('maakFoto vult standaardwaarden', () => {
    const f = maakFoto({ x: 10, y: 20, breedte: 300, hoogte: 200, assetId: null });
    expect(f).toMatchObject({ type: 'foto', x: 10, y: 20, breedte: 300, hoogte: 200, assetId: null, uitsnede: null, masker: 'rechthoek', kader: { stijl: 'geen', kleur: '#FFFFFF' }, filter: 'normaal', helderheid: 0, contrast: 0, rotatie: 0, schaalX: 1, schaalY: 1, gespiegeld: false, vergrendeld: false });
  });

  it('maakTekst gebruikt kindvriendelijke standaarden', () => {
    const t = maakTekst({ x: 0, y: 0, tekst: 'Hallo' });
    expect(t).toMatchObject({ type: 'tekst', tekst: 'Hallo', lettertype: 'nunito', grootte: 72, kleur: '#2D2A32', vet: false, schuin: false, uitlijning: 'center', regelafstand: 1.1, omlijning: null, schaduw: false, ballon: null, wordart: null, breedte: 400 });
  });

  it('maakSticker is vierkant', () => {
    const s = maakSticker({ x: 0, y: 0, sticker: 'dieren/cat', kleur: '#FF6B6B', grootte: 200 });
    expect(s).toMatchObject({ type: 'sticker', breedte: 200, hoogte: 200, sticker: 'dieren/cat', kleur: '#FF6B6B' });
  });

  it('maakVorm lijn gebruikt rand in plaats van vulling', () => {
    const l = maakVorm({ x: 0, y: 0, vorm: 'lijn', breedte: 400, hoogte: 40, vulling: '#FF6B6B' });
    expect(l.vulling).toBeNull();
    expect(l.rand).toBe('#FF6B6B');
    const h = maakVorm({ x: 0, y: 0, vorm: 'hart', breedte: 300, hoogte: 300 });
    expect(h.vulling).toBe('#FF6B6B');
    expect(h.rand).toBeNull();
    expect(h.doorzichtigheid).toBe(1);
  });
});
