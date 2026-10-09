import { describe, it, expect } from 'vitest';
import { UITDAGINGEN } from './uitdagingen';
import { TEMPLATES } from './templates';
import { STICKER_PACKS } from './stickers';

describe('uitdagingen', () => {
  it('heeft 20 uitdagingen met unieke id', () => {
    expect(UITDAGINGEN).toHaveLength(20);
    expect(new Set(UITDAGINGEN.map((u) => u.id)).size).toBe(20);
  });

  it('verwijst alleen naar bestaande templates en pakketten', () => {
    for (const u of UITDAGINGEN) {
      expect(TEMPLATES.some((t) => t.id === u.templateId), u.id).toBe(true);
      expect(STICKER_PACKS.some((p) => p.id === u.pakket), u.id).toBe(true);
    }
  });
});
