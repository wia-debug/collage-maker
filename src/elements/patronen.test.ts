import { describe, it, expect } from 'vitest';
import Konva from 'konva';
import { PATRONEN, maakPatroon } from './patronen';
import { renderAchtergrond } from './achtergrond';

describe('maakPatroon', () => {
  it.each(PATRONEN.map((p) => p.patroon))('%s geeft een 80x80 tegel die deterministisch is', (p) => {
    const a = maakPatroon(p, '#FF6B6B', '#FFFFFF');
    expect(a.width).toBe(80);
    expect(a.toDataURL()).toBe(maakPatroon(p, '#FF6B6B', '#FFFFFF').toDataURL());
  });
});

describe('renderAchtergrond', () => {
  const ctx = { image: () => undefined };

  it('patroon gebruikt een herhalende patroonvulling', () => {
    const r = renderAchtergrond({ soort: 'patroon', patroon: 'stippen', kleur: '#000000', achtergrondkleur: '#FFFFFF' }, 500, 400, ctx) as Konva.Rect;
    expect(r.fillPatternImage()).toBeInstanceOf(HTMLCanvasElement);
    expect(r.width()).toBe(500);
  });

  it('foto vult het hele canvas met een middenuitsnede', () => {
    const img = document.createElement('canvas');
    img.width = 1000; img.height = 500;
    const n = renderAchtergrond({ soort: 'foto', assetId: 'a' }, 400, 400, { image: () => img }) as Konva.Image;
    expect(n).toBeInstanceOf(Konva.Image);
    expect(n.crop()).toEqual({ x: 250, y: 0, width: 500, height: 500 });
    expect(n.name()).toBe('achtergrond');
  });

  it('foto zonder geladen afbeelding valt terug op wit', () => {
    const n = renderAchtergrond({ soort: 'foto', assetId: 'x' }, 400, 400, ctx) as Konva.Rect;
    expect(n.fill()).toBe('#FFFFFF');
  });
});
