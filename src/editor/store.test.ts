import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { createEditor } from './store';
import { maakVorm, nieuweCollage } from '../document/create';

const vorm = (x = 100) => maakVorm({ x, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });

describe('editor-store', () => {
  it('add voegt toe en selecteert', () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    const v = vorm();
    ed.add(v);
    const s = get(ed.state);
    expect(s.collage.elementen).toHaveLength(1);
    expect(s.selectedId).toBe(v.id);
    expect(s.canUndo).toBe(true);
  });

  it('update is onveranderlijk en zet gewijzigd', () => {
    const c = nieuweCollage('vierkant');
    const ed = createEditor(c);
    const v = vorm();
    ed.add(v);
    const voor = ed.get().collage;
    ed.update(v.id, { x: 500 });
    const na = ed.get().collage;
    expect(na).not.toBe(voor);
    expect(na.elementen[0].x).toBe(500);
    expect(voor.elementen[0].x).toBe(100);
    expect(na.gewijzigd).toBeGreaterThanOrEqual(voor.gewijzigd);
  });

  it('remove wist selectie, undo brengt element terug', () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    const v = vorm();
    ed.add(v);
    ed.remove(v.id);
    expect(ed.get().selectedId).toBeNull();
    expect(ed.get().collage.elementen).toHaveLength(0);
    ed.undo();
    expect(ed.get().collage.elementen[0].id).toBe(v.id);
  });

  it('undo van add wist de selectie van het verdwenen element', () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    ed.add(vorm());
    ed.undo();
    expect(ed.get().selectedId).toBeNull();
  });

  it('duplicate maakt een kopie met nieuw id, iets verschoven, en selecteert die', () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    const v = vorm();
    ed.add(v);
    ed.duplicate(v.id);
    const [a, b] = ed.get().collage.elementen;
    expect(b.id).not.toBe(a.id);
    expect(b.x).toBe(a.x + 30);
    expect(b.y).toBe(a.y + 30);
    expect(ed.get().selectedId).toBe(b.id);
  });

  it('move verandert de laagvolgorde', () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    const a = vorm(1), b = vorm(2), c = vorm(3);
    ed.add(a); ed.add(b); ed.add(c);
    ed.move(a.id, 'voor');
    expect(ed.get().collage.elementen.map((e) => e.id)).toEqual([b.id, a.id, c.id]);
    ed.move(a.id, 'voorste');
    expect(ed.get().collage.elementen.map((e) => e.id)).toEqual([b.id, c.id, a.id]);
    ed.move(a.id, 'achterste');
    expect(ed.get().collage.elementen.map((e) => e.id)).toEqual([a.id, b.id, c.id]);
    ed.move(a.id, 'achter');
    expect(ed.get().collage.elementen.map((e) => e.id)).toEqual([a.id, b.id, c.id]);
  });

  it('setAchtergrond en rename zijn ongedaan te maken', () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    ed.setAchtergrond({ soort: 'kleur', kleur: '#000000' });
    ed.rename('Vakantie');
    expect(ed.get().collage.naam).toBe('Vakantie');
    ed.undo(); ed.undo();
    expect(ed.get().collage.achtergrond).toEqual({ soort: 'kleur', kleur: '#FFFFFF' });
  });

  it('load vervangt de collage en wist de geschiedenis', () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    ed.add(vorm());
    ed.load(nieuweCollage('poster'));
    expect(ed.get().collage.formaat).toBe('poster');
    expect(ed.get().canUndo).toBe(false);
  });

  it('removeMany is één undo-stap en doet niets zonder ids', () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    const a = vorm(10), b = vorm(20), c = vorm(30);
    ed.add(a); ed.add(b); ed.add(c);
    const voor = ed.get().collage;
    ed.removeMany([]);
    expect(ed.get().collage).toBe(voor);
    ed.removeMany([a.id, c.id]);
    expect(ed.get().collage.elementen.map((e) => e.id)).toEqual([b.id]);
    ed.undo();
    expect(ed.get().collage.elementen.map((e) => e.id)).toEqual([a.id, b.id, c.id]);
  });
});

describe('voorbeeld (live schuif)', () => {
  const opzet = () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    const v = vorm();
    ed.add(v);
    return { ed, v };
  };

  it('vijf voorbeelden en een update zijn een undo-stap; undo geeft de basis terug', () => {
    const { ed, v } = opzet();
    for (const x of [200, 250, 300, 350, 400]) ed.voorbeeld(v.id, { x });
    expect(ed.get().collage.elementen[0].x).toBe(400);
    expect(ed.get().canUndo).toBe(true);
    ed.update(v.id, { x: 400 });
    expect(ed.get().collage.elementen[0].x).toBe(400);
    ed.undo();
    expect(ed.get().collage.elementen[0].x).toBe(100);
    ed.undo();
    expect(ed.get().collage.elementen).toHaveLength(0);
    ed.redo();
    ed.redo();
    expect(ed.get().collage.elementen[0].x).toBe(400);
  });

  it('voorbeelden alleen zetten geen geschiedenis; annuleerVoorbeeld herstelt', () => {
    const { ed, v } = opzet();
    ed.undo();
    ed.redo();
    const voor = ed.get().collage;
    ed.voorbeeld(v.id, { x: 900 });
    ed.voorbeeld(v.id, { x: 950 });
    expect(ed.get().collage.elementen[0].x).toBe(950);
    ed.annuleerVoorbeeld();
    expect(ed.get().collage).toBe(voor);
    expect(ed.get().collage.elementen[0].x).toBe(100);
    ed.annuleerVoorbeeld();
    expect(ed.get().collage).toBe(voor);
  });

  it('undo na losse voorbeelden herstelt eerst de basis en gaat dan een stap terug', () => {
    const { ed, v } = opzet();
    ed.update(v.id, { x: 500 });
    ed.voorbeeld(v.id, { x: 700 });
    ed.undo();
    expect(ed.get().collage.elementen[0].x).toBe(100);
  });
});

describe('editor-store meldingen', () => {
  it('meldt toevoegen en wissen, niet bij undo', () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    const toe: string[] = []; let weg = 0;
    ed.opToevoegen((el) => toe.push(el.id));
    ed.opWissen(() => weg++);
    const v = maakVorm({ x: 0, y: 0, vorm: 'ster', breedte: 10, hoogte: 10 });
    ed.add(v);
    ed.duplicate(v.id);
    ed.remove(v.id);
    ed.removeMany([]);
    ed.undo(); ed.redo();
    expect(toe).toHaveLength(2);
    expect(weg).toBe(1);
  });
});

describe('meerdere kiezen en groeperen', () => {
  const opzet = () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    const [a, b, c] = [100, 300, 500].map((x) => maakVorm({ x, y: 100, vorm: 'ster', breedte: 50, hoogte: 50 }));
    ed.add(a); ed.add(b); ed.add(c);
    return { ed, a, b, c };
  };

  it('selectedId alleen bij precies één', () => {
    const { ed, a, b } = opzet();
    ed.selectMany([a.id, b.id]);
    expect(ed.get().selectedIds).toEqual([a.id, b.id]);
    expect(ed.get().selectedId).toBeNull();
    ed.select(a.id);
    expect(ed.get().selectedId).toBe(a.id);
  });

  it('groeperen is één stap en kiezen breidt uit naar de groep', () => {
    const { ed, a, b, c } = opzet();
    ed.groepeer([a.id, b.id]);
    const g = ed.get().collage.elementen.find((e) => e.id === a.id)!.groep!;
    expect(g).toMatch(/^[0-9a-f]{16}$/);
    ed.select(null);
    ed.select(b.id);
    expect([...ed.get().selectedIds].sort()).toEqual([a.id, b.id].sort());
    ed.toggleSelect(c.id);
    expect(ed.get().selectedIds).toHaveLength(3);
    ed.toggleSelect(a.id);
    expect(ed.get().selectedIds).toEqual([c.id]);
    ed.undo();
    expect(ed.get().collage.elementen.every((e) => e.groep === undefined)).toBe(true);
  });

  it('groep los verwijdert het veld bij alle leden in één stap', () => {
    const { ed, a, b } = opzet();
    ed.groepeer([a.id, b.id]);
    const g = ed.get().collage.elementen[0].groep!;
    ed.groepLos(g);
    expect(ed.get().collage.elementen.some((e) => 'groep' in e)).toBe(false);
    ed.undo();
    expect(ed.get().collage.elementen.filter((e) => e.groep === g)).toHaveLength(2);
  });

  it('updateMany is één stap; zonder verandering geen stap', () => {
    const { ed, a, b } = opzet();
    ed.updateMany({ [a.id]: { x: 1 }, [b.id]: { x: 2 } });
    expect(ed.get().collage.elementen.map((e) => e.x).slice(0, 2)).toEqual([1, 2]);
    ed.undo();
    expect(ed.get().collage.elementen[0].x).toBe(100);
    ed.redo();
    const voor = ed.get().collage;
    ed.updateMany({ [a.id]: { x: 1 } });
    expect(ed.get().collage).toBe(voor);
  });

  it('duplicateMany: kopieën verschoven, nieuwe groep, worden de keuze, vastgezette niet', () => {
    const { ed, a, b, c } = opzet();
    ed.groepeer([a.id, b.id]);
    ed.update(c.id, { vergrendeld: true });
    const oud = ed.get().collage.elementen[0].groep;
    ed.duplicateMany([a.id, b.id, c.id]);
    const els = ed.get().collage.elementen;
    expect(els).toHaveLength(5);
    const kopie = els.slice(3);
    expect(kopie.map((e) => e.x)).toEqual([130, 330]);
    expect(kopie[0].groep).toBe(kopie[1].groep);
    expect(kopie[0].groep).not.toBe(oud);
    expect(ed.get().selectedIds).toEqual(kopie.map((e) => e.id));
  });

  it('moveMany houdt de onderlinge volgorde', () => {
    const { ed, a, b, c } = opzet();
    ed.moveMany([a.id, b.id], 'voorste');
    expect(ed.get().collage.elementen.map((e) => e.id)).toEqual([c.id, a.id, b.id]);
    ed.moveMany([a.id, b.id], 'achter');
    expect(ed.get().collage.elementen.map((e) => e.id)).toEqual([a.id, b.id, c.id]);
    const voor = ed.get().collage;
    ed.moveMany([a.id, b.id], 'achter');
    expect(ed.get().collage).toBe(voor);
  });

  it('keuze wordt opgeschoond na wissen en ongedaan maken', () => {
    const { ed, a, b } = opzet();
    ed.selectMany([a.id, b.id]);
    ed.removeMany([a.id]);
    expect(ed.get().selectedIds).toEqual([b.id]);
    ed.add(maakVorm({ x: 0, y: 0, vorm: 'hart', breedte: 10, hoogte: 10 }));
    ed.undo();
    expect(ed.get().selectedIds).toEqual([]);
  });
});
