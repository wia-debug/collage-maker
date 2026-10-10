import { describe, it, expect } from 'vitest';
import { dekUitsnede } from './uitsnede';

describe('dekUitsnede', () => {
  it('snijdt een brede foto bij voor een vierkant vak (midden)', () => {
    expect(dekUitsnede(400, 200, 100, 100)).toEqual({ x: 100, y: 0, breedte: 200, hoogte: 200 });
  });
  it('snijdt een hoge foto bij voor een breed vak (midden)', () => {
    expect(dekUitsnede(200, 400, 200, 100)).toEqual({ x: 0, y: 150, breedte: 200, hoogte: 100 });
  });
});

import { herUitsnede, klemUitsnede, pasVerhoudingToe, verhoudingGetal } from './uitsnede';

describe('verhoudingen', () => {
  it('rekent verhoudingen om', () => {
    expect(verhoudingGetal('vrij')).toBeNull();
    expect(verhoudingGetal('4:3')).toBeCloseTo(4 / 3);
  });

  it('pasVerhoudingToe kiest de grootste gecentreerde rechthoek', () => {
    expect(pasVerhoudingToe(1, { breedte: 400, hoogte: 300 })).toEqual({ x: 50, y: 0, breedte: 300, hoogte: 300 });
    expect(pasVerhoudingToe(16 / 9, { breedte: 400, hoogte: 400 })).toEqual({ x: 0, y: 87.5, breedte: 400, hoogte: 225 });
  });

  it('klemUitsnede houdt de uitsnede binnen de foto en minstens 20 px', () => {
    const bron = { breedte: 100, hoogte: 100 };
    expect(klemUitsnede({ x: -10, y: 90, breedte: 50, hoogte: 50 }, bron)).toEqual({ x: 0, y: 50, breedte: 50, hoogte: 50 });
    expect(klemUitsnede({ x: 0, y: 0, breedte: 5, hoogte: 500 }, bron)).toEqual({ x: 0, y: 0, breedte: 20, hoogte: 100 });
  });
});

describe('herUitsnede', () => {
  const bron = { breedte: 400, hoogte: 300 };
  const vierkant = { x: 100, y: 50, breedte: 100, hoogte: 100 };
  it('houdt de uitsnede bij dezelfde verhouding (draaien of evenredig schalen)', () => {
    expect(herUitsnede(vierkant, bron, 100, 100)).toBe(vierkant);
    expect(herUitsnede(vierkant, bron, 250.0001, 250)).toBe(vierkant);
  });
  it('houdt het zoomniveau (oppervlakte) en het midden bij een andere verhouding', () => {
    const r = herUitsnede(vierkant, bron, 200, 100);
    expect(r.breedte * r.hoogte).toBeCloseTo(10000);
    expect(r.breedte / r.hoogte).toBeCloseTo(2);
    expect(r.x + r.breedte / 2).toBeCloseTo(150);
    expect(r.y + r.hoogte / 2).toBeCloseTo(100);
    const h = herUitsnede(vierkant, bron, 100, 200);
    expect(h.breedte * h.hoogte).toBeCloseTo(10000);
    expect(h.breedte / h.hoogte).toBeCloseTo(0.5);
  });
  it('schuift binnen de bron aan de rand en krimpt alleen als het moet', () => {
    const hoek = { x: 300, y: 200, breedte: 100, hoogte: 100 };
    const r = herUitsnede(hoek, bron, 400, 100);
    expect(r.breedte / r.hoogte).toBeCloseTo(4);
    expect(r.x + r.breedte).toBeLessThanOrEqual(400 + 1e-9);
    expect(r.y + r.hoogte).toBeLessThanOrEqual(300 + 1e-9);
    expect(r.x).toBeGreaterThanOrEqual(0);
    const groot = herUitsnede({ x: 0, y: 0, breedte: 400, hoogte: 300 }, bron, 1, 1);
    expect(groot).toEqual({ x: 50, y: 0, breedte: 300, hoogte: 300 });
  });
  it('gebruikt de hele bron zonder huidige uitsnede', () => {
    expect(herUitsnede(null, bron, 1, 1)).toEqual({ x: 50, y: 0, breedte: 300, hoogte: 300 });
    expect(herUitsnede(null, bron, 400, 300)).toEqual({ x: 0, y: 0, breedte: 400, hoogte: 300 });
  });
  it('geeft bij een ongeldige verhouding de huidige uitsnede terug', () => {
    for (const [b, h] of [[0, 100], [100, 0], [NaN, 5], [5, NaN], [-1, 5], [Infinity, 1]]) {
      expect(herUitsnede(vierkant, bron, b, h)).toBe(vierkant);
      expect(herUitsnede(null, bron, b, h)).toEqual({ x: 0, y: 0, breedte: 400, hoogte: 300 });
    }
  });
});
