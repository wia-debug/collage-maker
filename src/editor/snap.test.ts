import { describe, it, expect } from 'vitest';
import { snap } from './snap';

const canvas = { breedte: 1000, hoogte: 800 };

describe('snap', () => {
  it('klikt het midden vast op het midden van het canvas', () => {
    const r = snap({ x: 445, y: 100, width: 100, height: 50 }, [], canvas, 10);
    expect(r.dx).toBe(5);
    expect(r.gidsen).toContainEqual({ richting: 'v', pos: 500 });
  });

  it('klikt randen vast op randen van andere elementen', () => {
    const r = snap({ x: 100, y: 304, width: 50, height: 50 }, [{ x: 600, y: 300, width: 80, height: 80 }], canvas, 10);
    expect(r.dy).toBe(-4);
    expect(r.gidsen).toContainEqual({ richting: 'h', pos: 300 });
  });

  it('doet niets buiten de drempel', () => {
    const r = snap({ x: 200, y: 200, width: 30, height: 30 }, [], canvas, 10);
    expect(r).toEqual({ dx: 0, dy: 0, gidsen: [] });
  });

  it('kiest het dichtstbijzijnde doel', () => {
    const r = snap({ x: 3, y: 200, width: 30, height: 30 }, [{ x: 1, y: 600, width: 10, height: 10 }], canvas, 10);
    expect(r.dx).toBe(-2);
  });
});
