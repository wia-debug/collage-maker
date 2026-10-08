import { describe, it, expect } from 'vitest';
import { tracePad, type PathCtx } from './paths';
import type { Pad } from '../document/types';

const PADEN: Pad[] = ['rechthoek', 'rond', 'hart', 'ster', 'wolk', 'blob', 'driehoek', 'pijl'];

function ctx() {
  const c = new OffscreenCanvas(100, 100).getContext('2d')!;
  return c;
}

describe('tracePad', () => {
  it.each(PADEN)('%s bevat het middelpunt', (pad) => {
    const c = ctx();
    tracePad(c as unknown as PathCtx, pad, 100, 100);
    expect(c.isPointInPath(50, 55)).toBe(true);
  });

  it.each(PADEN.filter((p) => p !== 'rechthoek'))('%s bevat de hoek linksboven niet', (pad) => {
    const c = ctx();
    tracePad(c as unknown as PathCtx, pad, 100, 100);
    expect(c.isPointInPath(2, 2)).toBe(false);
  });

  it('schaalt mee met breedte en hoogte', () => {
    const c = new OffscreenCanvas(400, 100).getContext('2d')!;
    tracePad(c as unknown as PathCtx, 'rond', 400, 100);
    expect(c.isPointInPath(390, 50)).toBe(true);
    expect(c.isPointInPath(200, 98)).toBe(true);
    expect(c.isPointInPath(390, 95)).toBe(false);
  });
});
