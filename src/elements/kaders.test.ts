import { describe, it, expect } from 'vitest';
import { KADERS, kaderNodes, langsRand } from './kaders';
import type { Masker } from '../document/types';

const MASKERS: Masker[] = ['rechthoek', 'rond', 'hart', 'ster', 'wolk', 'blob'];

describe('langsRand', () => {
  it('geeft punten op de rand, gelijk verdeeld', () => {
    const p = langsRand(100, 50, 30);
    expect(p).toHaveLength(10);
    for (const q of p) {
      const opRand = q.x === 0 || q.x === 100 || q.y === 0 || q.y === 50;
      expect(opRand).toBe(true);
    }
  });
});

describe('kaderNodes', () => {
  it('heeft 12 stijlen plus geen', () => {
    expect(KADERS.map((k) => k.stijl)).toHaveLength(13);
  });

  it('geen geeft niets', () => {
    expect(kaderNodes('geen', '#FFF', 100, 100, 'rechthoek')).toEqual({ achter: [], voor: [] });
  });

  it.each(KADERS.filter((k) => k.stijl !== 'geen').flatMap((k) => MASKERS.map((m) => [k.stijl, m] as const)))('%s met masker %s tekent iets', (stijl, masker) => {
    const r = kaderNodes(stijl, '#FF6B6B', 200, 150, masker);
    expect(r.achter.length + r.voor.length).toBeGreaterThan(0);
  });

  it('polaroid ligt achter de foto en is groter, met bredere onderrand', () => {
    const { achter } = kaderNodes('polaroid', '#FFFFFF', 200, 150, 'rechthoek');
    const r = achter[0].getClientRect();
    expect(r.width).toBeGreaterThan(200);
    expect(r.y + r.height - 150).toBeGreaterThan(-r.y);
  });

  it('kaders luisteren niet naar tikken', () => {
    const { voor, achter } = kaderNodes('sterren', '#FFC94D', 200, 150, 'rechthoek');
    for (const n of [...voor, ...achter]) expect(n.listening()).toBe(false);
  });
});
