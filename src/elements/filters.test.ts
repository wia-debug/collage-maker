import { describe, it, expect } from 'vitest';
import { pasFilterToe, filterVoorbeeld } from './filters';

function beeld(r: number, g: number, b: number, w = 4, h = 4): ImageData {
  const d = new ImageData(w, h);
  for (let i = 0; i < d.data.length; i += 4) { d.data[i] = r; d.data[i + 1] = g; d.data[i + 2] = b; d.data[i + 3] = 255; }
  return d;
}

describe('pasFilterToe', () => {
  it('normaal zonder aanpassing verandert niets', () => {
    const d = beeld(10, 20, 30);
    pasFilterToe(d, 'normaal');
    expect([...d.data.slice(0, 4)]).toEqual([10, 20, 30, 255]);
  });

  it('zwartwit maakt r=g=b', () => {
    const d = beeld(200, 100, 50);
    pasFilterToe(d, 'zwartwit');
    expect(d.data[0]).toBe(d.data[1]);
    expect(d.data[1]).toBe(d.data[2]);
  });

  it('negatief keert om', () => {
    const d = beeld(0, 100, 255);
    pasFilterToe(d, 'negatief');
    expect([...d.data.slice(0, 3)]).toEqual([255, 155, 0]);
  });

  it('warm verhoogt rood en verlaagt blauw', () => {
    const d = beeld(100, 100, 100);
    pasFilterToe(d, 'warm');
    expect(d.data[0]).toBeGreaterThan(100);
    expect(d.data[2]).toBeLessThan(100);
  });

  it('helderheid +50 maakt lichter, alpha blijft', () => {
    const d = beeld(100, 100, 100);
    pasFilterToe(d, 'normaal', 50, 0);
    expect(d.data[0]).toBeGreaterThan(100);
    expect(d.data[3]).toBe(255);
  });

  it('contrast +50 trekt waarden uit elkaar', () => {
    const d = beeld(200, 60, 128);
    pasFilterToe(d, 'normaal', 0, 50);
    expect(d.data[0]).toBeGreaterThan(200);
    expect(d.data[1]).toBeLessThan(60);
  });

  it('pixel maakt blokken met gelijke kleur', () => {
    const d = new ImageData(120, 1);
    for (let x = 0; x < 120; x++) { d.data[x * 4] = x * 2; d.data[x * 4 + 3] = 255; }
    pasFilterToe(d, 'pixel');
    expect(d.data[0]).toBe(d.data[4]);
  });

  it('vervaagd verzacht een harde rand', () => {
    const d = new ImageData(300, 1);
    for (let x = 0; x < 300; x++) { d.data[x * 4] = x < 150 ? 0 : 255; d.data[x * 4 + 3] = 255; }
    pasFilterToe(d, 'vervaagd');
    expect(d.data[150 * 4]).toBeGreaterThan(0);
    expect(d.data[150 * 4]).toBeLessThan(255);
  });
});

describe('filterVoorbeeld', () => {
  it('geeft een PNG-data-URL', () => {
    const c = document.createElement('canvas');
    c.width = 200; c.height = 100;
    expect(filterVoorbeeld(c, 200, 100, 'sepia')).toMatch(/^data:image\/png/);
  });
});
