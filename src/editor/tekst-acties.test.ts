import { describe, it, expect, beforeAll } from 'vitest';
import { createEditor } from './store';
import { maakTekst, nieuweCollage } from '../document/create';
import { natuurlijkeBreedte, tekstKlaar, tekstStijlPatch } from './tekst-acties';
import { laadLettertypes } from '../assets/fonts';
import type { TekstElement } from '../document/types';

beforeAll(() => laadLettertypes());

describe('tekstKlaar', () => {
  it('nieuwe lege tekst voegt niets toe', () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    tekstKlaar(ed, null, '   ');
    expect(ed.get().collage.elementen).toHaveLength(0);
    expect(ed.get().canUndo).toBe(false);
  });

  it('nieuwe tekst komt in het midden met passende breedte', () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    tekstKlaar(ed, null, 'Hoi');
    const t = ed.get().collage.elementen[0] as TekstElement;
    expect(t).toMatchObject({ type: 'tekst', tekst: 'Hoi', x: 600, y: 600 });
    expect(t.breedte).toBeLessThan(400);
    expect(t.breedte).toBeGreaterThan(50);
  });

  it('bestaande tekst leegmaken verwijdert het element', () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    tekstKlaar(ed, null, 'Hoi');
    const id = ed.get().collage.elementen[0].id;
    tekstKlaar(ed, id, '');
    expect(ed.get().collage.elementen).toHaveLength(0);
  });

  it('bestaande tekst wijzigen past tekst en breedte aan', () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    tekstKlaar(ed, null, 'Hoi');
    const id = ed.get().collage.elementen[0].id;
    const voor = (ed.get().collage.elementen[0] as TekstElement).breedte;
    tekstKlaar(ed, id, 'Hoi allemaal samen');
    const t = ed.get().collage.elementen[0] as TekstElement;
    expect(t.tekst).toBe('Hoi allemaal samen');
    expect(t.breedte).toBeGreaterThan(voor);
  });
});

describe('breedte', () => {
  it('natuurlijkeBreedte respecteert het maximum en de langste regel', () => {
    const t = maakTekst({ x: 0, y: 0, tekst: 'kort\neen veel langere regel hier' });
    const vrij = natuurlijkeBreedte(t, 10_000);
    expect(natuurlijkeBreedte({ ...t, tekst: 'een veel langere regel hier' }, 10_000)).toBeCloseTo(vrij, 0);
    expect(natuurlijkeBreedte(t, 100)).toBe(100);
  });

  it('tekstStijlPatch herberekent de breedte bij grotere letters', () => {
    const t = { ...maakTekst({ x: 0, y: 0, tekst: 'Hallo' }), breedte: 150 };
    const p = tekstStijlPatch(t, { grootte: 144 }, 1200);
    expect(p.grootte).toBe(144);
    expect(p.breedte!).toBeGreaterThan(150);
  });
});
