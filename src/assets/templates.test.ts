import { describe, it, expect } from 'vitest';
import { TEMPLATES, template } from './templates';
import { STICKER_PACKS } from './stickers';
import { FORMATEN } from '../document/formats';
import { maakVoorbeeld } from '../export/voorbeeld';
import { AssetStore } from './store';
import { KADER_ALLEEN_RECHTHOEK } from '../elements/kaders';

const alleStickers = new Set(STICKER_PACKS.flatMap((p) => p.stickers.map((s) => `${p.id}/${s}`)));

describe('templates', () => {
  it('heeft 12 templates met unieke id', () => {
    expect(TEMPLATES).toHaveLength(12);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(12);
  });

  it.each(TEMPLATES.map((t) => t.id))('%s: geldige collage', (id) => {
    const t = template(id);
    const c = t.maak();
    expect(c.formaat).toBe(t.formaat);
    const ids = c.elementen.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(c.elementen.some((e) => e.type === 'foto' && e.assetId === null)).toBe(true);
    const f = FORMATEN[c.formaat];
    for (const e of c.elementen) {
      expect(e.x).toBeGreaterThanOrEqual(0); expect(e.x).toBeLessThanOrEqual(f.breedte);
      expect(e.y).toBeGreaterThanOrEqual(0); expect(e.y).toBeLessThanOrEqual(f.hoogte);
      if (e.type === 'sticker') expect(alleStickers.has(e.sticker), e.sticker).toBe(true);
    }
  });

  it('maak() geeft elke keer nieuwe id\'s', () => {
    expect(template('raster-4').maak().elementen[0].id).not.toBe(template('raster-4').maak().elementen[0].id);
  });

  it('maakVoorbeeld geeft een PNG', async () => {
    const url = await maakVoorbeeld(template('verjaardag').maak(), new AssetStore(), 200);
    expect(url).toMatch(/^data:image\/png/);
  });

  it('gebruikt geen kader dat niet bij het masker past', () => {
    for (const t of TEMPLATES) {
      for (const e of t.maak().elementen) {
        if (e.type !== 'foto') continue;
        const verboden = e.masker !== 'rechthoek' && KADER_ALLEEN_RECHTHOEK.includes(e.kader.stijl);
        expect(verboden, `${t.id}: ${e.masker} + ${e.kader.stijl}`).toBe(false);
      }
    }
  });
});
