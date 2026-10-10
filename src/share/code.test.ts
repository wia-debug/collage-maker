import { describe, it, expect } from 'vitest';
import { DEEL_LENGTE, DEEL_SYMBOLEN, codeNaarSleutel, nieuweCode, peerId } from './code';

describe('symboolcode', () => {
  it('12 unieke symbolen, lengte 4', () => {
    expect(DEEL_SYMBOLEN).toHaveLength(12);
    expect(new Set(DEEL_SYMBOLEN).size).toBe(12);
    expect(DEEL_LENGTE).toBe(4);
  });
  it('nieuweCode geeft 4 bekende symbolen en varieert', () => {
    const codes = Array.from({ length: 50 }, nieuweCode);
    for (const c of codes) {
      expect(c).toHaveLength(4);
      for (const s of c) expect(DEEL_SYMBOLEN).toContain(s);
    }
    expect(new Set(codes.map((c) => c.join())).size).toBeGreaterThan(40);
  });
  it('codeNaarSleutel en peerId', () => {
    expect(codeNaarSleutel(['star', 'heart', 'paw-print', 'star'])).toBe('abla');
    expect(peerId(['star', 'star', 'star', 'star'])).toBe('kidscollage-aaaa');
    expect(() => codeNaarSleutel(['star', 'star', 'star'])).toThrow();
    expect(() => codeNaarSleutel(['star', 'star', 'star', 'onbekend'])).toThrow();
  });
});
