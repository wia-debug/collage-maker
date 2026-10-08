import { describe, it, expect } from 'vitest';
import { legLetters, letterKleur, mengKleur, REGENBOOG } from './wordart-layout';

const vijf = [40, 40, 40, 40, 40];

describe('legLetters', () => {
  it('recht: oplopende x, gelijke y, geen rotatie, alles binnen het kader', () => {
    const r = legLetters(vijf, 'recht', 50);
    for (let i = 1; i < 5; i++) expect(r.posities[i].x).toBeGreaterThan(r.posities[i - 1].x);
    expect(new Set(r.posities.map((p) => p.y)).size).toBe(1);
    expect(r.posities.every((p) => p.rotatie === 0)).toBe(true);
    for (const p of r.posities) { expect(p.x).toBeGreaterThan(0); expect(p.x).toBeLessThan(r.breedte); }
  });

  it('boog-omhoog: middelste letter het hoogst en recht', () => {
    const r = legLetters(vijf, 'boog-omhoog', 50);
    const ys = r.posities.map((p) => p.y);
    expect(Math.min(...ys)).toBe(ys[2]);
    expect(r.posities[2].rotatie).toBeCloseTo(0, 5);
    expect(r.posities[0].rotatie).toBeLessThan(0);
    expect(r.posities[4].rotatie).toBeGreaterThan(0);
  });

  it('boog-omlaag: middelste letter het laagst, volgorde links naar rechts', () => {
    const r = legLetters(vijf, 'boog-omlaag', 50);
    const ys = r.posities.map((p) => p.y);
    expect(Math.max(...ys)).toBe(ys[2]);
    expect(r.posities[0].x).toBeLessThan(r.posities[4].x);
  });

  it('cirkel: letters liggen op een cirkel rond het midden', () => {
    const r = legLetters(Array(12).fill(40), 'cirkel', 50);
    const cx = r.breedte / 2, cy = r.hoogte / 2;
    const afstanden = r.posities.map((p) => Math.hypot(p.x - cx, p.y - cy));
    for (const a of afstanden) expect(a).toBeCloseTo(afstanden[0], 0);
  });

  it('golf: sommige letters kantelen', () => {
    const r = legLetters(Array(10).fill(40), 'golf', 50);
    expect(r.posities.some((p) => Math.abs(p.rotatie) > 5)).toBe(true);
  });

  it('lege tekst geeft een leeg kader zonder fouten', () => {
    const r = legLetters([], 'boog-omhoog', 50);
    expect(r.posities).toEqual([]);
    expect(r.breedte).toBeGreaterThan(0);
  });
});

describe('kleuren', () => {
  it('mengKleur mengt lineair', () => {
    expect(mengKleur('#000000', '#FFFFFF', 0.5)).toBe('#808080');
    expect(mengKleur('#FF0000', '#0000FF', 0)).toBe('#FF0000');
  });

  it('letterKleur per soort', () => {
    expect(letterKleur({ soort: 'kleur', kleuren: ['#123456'] }, 3, 5)).toBe('#123456');
    expect(letterKleur({ soort: 'regenboog', kleuren: [] }, 1, 5)).toBe(REGENBOOG[1]);
    expect(letterKleur({ soort: 'verloop', kleuren: ['#000000', '#FFFFFF'] }, 4, 5)).toBe('#FFFFFF');
    expect(letterKleur({ soort: 'verloop', kleuren: ['#000000', '#FFFFFF'] }, 0, 1)).toBe('#000000');
  });
});
