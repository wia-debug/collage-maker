import { describe, it, expect, beforeEach } from 'vitest';
import { TOURS, markeerGezien, tourGezien } from './tour';

beforeEach(() => localStorage.clear());

describe('tour', () => {
  it('heeft een tour voor de editor en voor elk paneel', () => {
    for (const id of ['editor', 'foto', 'tekst', 'stickers', 'vormen', 'tekenen', 'achtergrond'] as const) {
      expect(TOURS[id].length, id).toBeGreaterThan(0);
    }
    expect(TOURS.editor).toHaveLength(5);
  });

  it('onthoudt welke tours gezien zijn', () => {
    expect(tourGezien('editor')).toBe(false);
    markeerGezien('editor');
    expect(tourGezien('editor')).toBe(true);
    expect(tourGezien('foto')).toBe(false);
  });

  it('kapotte opslag geeft geen fout', () => {
    localStorage.setItem('collage-tours-gezien', '{kapot');
    expect(tourGezien('editor')).toBe(false);
  });
});
