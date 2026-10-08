import { describe, it, expect } from 'vitest';
import { STICKER_PACKS, recolorSvg, stickerUrl } from './stickers';

describe('stickers', () => {
  it('heeft 10 pakketten met elk minstens 15 stickers', () => {
    expect(STICKER_PACKS).toHaveLength(10);
    for (const p of STICKER_PACKS) expect(p.stickers.length).toBeGreaterThanOrEqual(15);
  });

  it('elke sticker is als bestand bereikbaar', async () => {
    for (const p of STICKER_PACKS) {
      for (const s of p.stickers) {
        const r = await fetch(stickerUrl(`${p.id}/${s}`));
        expect(r.ok, `${p.id}/${s}`).toBe(true);
      }
    }
  });

  it('recolorSvg vervangt currentColor en zet een vaste grootte', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256" fill="currentColor"><path d="M0 0" opacity="0.2"/></svg>';
    const uit = recolorSvg(svg, '#FF6B6B', 512);
    expect(uit).not.toContain('currentColor');
    expect(uit).toContain('fill="#FF6B6B"');
    expect(uit).toContain('width="512"');
    expect(uit).toContain('height="512"');
    expect(uit).not.toContain('width="32"');
  });
});
