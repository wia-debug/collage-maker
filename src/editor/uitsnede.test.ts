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
  it('maakt een bredere uitsnede uit een vierkante, op hetzelfde midden', () => {
    const r = herUitsnede({ x: 100, y: 50, breedte: 200, hoogte: 200 }, bron, 200, 100);
    expect(r).toEqual({ x: 0, y: 50, breedte: 400, hoogte: 200 });
  });
  it('maakt een hogere uitsnede', () => {
    const r = herUitsnede({ x: 100, y: 50, breedte: 200, hoogte: 200 }, bron, 100, 200);
    expect(r.breedte / r.hoogte).toBeCloseTo(0.5);
    expect(r.hoogte).toBe(300);
    expect(r.x).toBe(125);
    expect(r.y).toBe(0);
  });
  it('klemt binnen de bron aan de rand', () => {
    const r = herUitsnede({ x: 300, y: 200, breedte: 100, hoogte: 100 }, bron, 1, 1);
    expect(r).toEqual({ x: 100, y: 0, breedte: 300, hoogte: 300 });
    const k = herUitsnede({ x: 0, y: 0, breedte: 50, hoogte: 50 }, bron, 1, 1);
    expect(k.x).toBe(0);
    expect(k.y).toBe(0);
  });
  it('gebruikt het midden van de bron zonder huidige uitsnede', () => {
    expect(herUitsnede(null, bron, 1, 1)).toEqual({ x: 50, y: 0, breedte: 300, hoogte: 300 });
  });
});
