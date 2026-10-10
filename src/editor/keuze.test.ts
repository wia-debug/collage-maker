import { describe, it, expect } from 'vitest';
import { maakVorm } from '../document/create';
import { draaiKeuze, isEenGroep, midden, schuifKeuze, spiegelKeuze } from './keuze';

const v = (x: number, y: number, extra = {}) => ({ ...maakVorm({ x, y, vorm: 'ster', breedte: 10, hoogte: 10 }), ...extra });

describe('keuze', () => {
  it('midden en draaien rond het midden', () => {
    const a = v(0, 0), b = v(200, 0);
    expect(midden([a, b])).toEqual({ x: 100, y: 0 });
    const p = draaiKeuze([a, b], 90);
    expect(p[a.id].x).toBeCloseTo(100);
    expect(p[a.id].y).toBeCloseTo(-100);
    expect(p[a.id].rotatie).toBe(90);
  });
  it('spiegelen rond het midden', () => {
    const a = v(0, 0, { rotatie: 30 }), b = v(200, 0);
    const p = spiegelKeuze([a, b]);
    expect(p[a.id]).toMatchObject({ x: 200, gespiegeld: true, rotatie: 330 });
    expect(p[b.id]).toMatchObject({ x: 0, gespiegeld: true, rotatie: 0 });
  });
  it('vastgezette elementen krijgen geen patch', () => {
    const a = v(0, 0, { vergrendeld: true }), b = v(10, 10);
    expect(Object.keys(schuifKeuze([a, b], 5, 5))).toEqual([b.id]);
    expect(schuifKeuze([a, b], 5, 5)[b.id]).toEqual({ x: 15, y: 15 });
  });
  it('isEenGroep', () => {
    const a = v(0, 0, { groep: 'g' }), b = v(0, 0, { groep: 'g' }), c = v(0, 0);
    expect(isEenGroep([a, b], [a, b, c])).toBe('g');
    expect(isEenGroep([a, b, c], [a, b, c])).toBeNull();
    expect(isEenGroep([a], [a, b, c])).toBeNull();
  });
});
