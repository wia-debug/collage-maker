import { describe, it, expect } from 'vitest';
import { MOTIEVEN, KADERS, KADER_ALLEEN_RECHTHOEK, kaderNodes, langsRand } from './kaders';
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
  it('heeft 14 stijlen plus geen', () => {
    expect(KADERS.map((k) => k.stijl)).toHaveLength(15);
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

describe('KADER_ALLEEN_RECHTHOEK', () => {
  it('bevat alleen bestaande stijlen', () => {
    const stijlen = KADERS.map((k) => k.stijl);
    for (const s of KADER_ALLEEN_RECHTHOEK) expect(stijlen).toContain(s);
    expect(KADER_ALLEEN_RECHTHOEK).toContain('polaroid');
  });
});

describe('plakband met motief', () => {
  const STIJLEN = ['plakband', 'plakband-boven', 'plakband-hoeken'] as const;
  it.each(STIJLEN.flatMap((s) => MOTIEVEN.map((m) => [s, m.motief] as const)))('%s met motief %s geeft niet-luisterende nodes', (stijl, motief) => {
    const { achter, voor } = kaderNodes(stijl, '#FF6B6B', 200, 150, 'rechthoek', motief);
    expect(achter.length + voor.length).toBeGreaterThan(0);
    for (const n of [...achter, ...voor]) expect(n.listening()).toBe(false);
  });
  it('plakband-hoeken heeft vier stukken, boven een, plakband twee', () => {
    expect(kaderNodes('plakband-hoeken', '#FF6B6B', 200, 150, 'rechthoek').voor).toHaveLength(4);
    expect(kaderNodes('plakband-boven', '#FF6B6B', 200, 150, 'rechthoek').voor).toHaveLength(1);
    expect(kaderNodes('plakband', '#FF6B6B', 200, 150, 'rechthoek').voor).toHaveLength(2);
  });
  it('een motief gebruikt een patroonvulling', () => {
    const [t] = kaderNodes('plakband-boven', '#FF6B6B', 200, 150, 'rechthoek', 'hartjes').voor;
    expect(t.getAttr('fillPatternImage')).toBeInstanceOf(HTMLCanvasElement);
  });
});

describe('kader dat niet bij het masker past', () => {
  it('wordt bij een ander masker als gewone rand getekend', () => {
    for (const stijl of KADER_ALLEEN_RECHTHOEK) {
      const r = kaderNodes(stijl, '#FF6B6B', 200, 150, 'hart');
      const eff = kaderNodes('effen', '#FF6B6B', 200, 150, 'hart');
      expect(r.achter).toHaveLength(eff.achter.length);
      expect(r.voor).toHaveLength(eff.voor.length);
    }
  });
});
