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
});
