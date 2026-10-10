import { describe, it, expect } from 'vitest';
import { alleenTransform } from './vergelijk';
import { maakFoto } from '../document/create';

describe('alleenTransform', () => {
  const a = maakFoto({ x: 0, y: 0, breedte: 100, hoogte: 80, assetId: 'a1' });
  it.each([
    { x: 5 }, { y: 5 }, { rotatie: 30 }, { schaalX: 2 }, { schaalY: 2 }, { gespiegeld: true }, { vergrendeld: true }, { groep: 'aaaaaaaaaaaaaaaa' },
  ])('true bij alleen %o', (w) => {
    expect(alleenTransform(a, { ...a, ...w })).toBe(true);
  });
  it('true bij identiek element', () => expect(alleenTransform(a, { ...a })).toBe(true));
  it.each([{ filter: 'sepia' as const }, { breedte: 120 }, { helderheid: 10 }, { kader: { ...a.kader } }])('false bij %o', (w) => {
    expect(alleenTransform(a, { ...a, ...w })).toBe(false);
  });
  it('false bij combinatie transform en inhoud', () => {
    expect(alleenTransform(a, { ...a, x: 9, filter: 'sepia' })).toBe(false);
  });
});
