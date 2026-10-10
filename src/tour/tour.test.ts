import { describe, it, expect, beforeEach } from 'vitest';
import { TOURS, markeerGezien, tourGezien, zetTourProfiel } from './tour';

beforeEach(() => localStorage.clear());

describe('tour', () => {
  it('heeft een tour voor de editor en voor elk paneel', () => {
    for (const id of ['editor', 'leerkracht', 'foto', 'tekst', 'stickers', 'vormen', 'tekenen', 'achtergrond'] as const) {
      expect(TOURS[id].length, id).toBeGreaterThan(0);
    }
    expect(TOURS.editor).toHaveLength(7);
  });

  it('onthoudt welke tours gezien zijn', () => {
    expect(tourGezien('editor')).toBe(false);
    markeerGezien('editor');
    expect(tourGezien('editor')).toBe(true);
    expect(tourGezien('foto')).toBe(false);
  });

  it('onthoudt gezien per profiel en telt de algemene sleutel voor iedereen', () => {
    zetTourProfiel('p1');
    markeerGezien('foto');
    expect(tourGezien('foto')).toBe(true);
    zetTourProfiel('p2');
    expect(tourGezien('foto')).toBe(false);
    localStorage.setItem('collage-tours-gezien', JSON.stringify(['foto']));
    expect(tourGezien('foto')).toBe(true);
    zetTourProfiel(null);
  });

  it('onthoudt de leerkrachttour per toestel, niet per profiel', () => {
    zetTourProfiel('p1');
    markeerGezien('leerkracht');
    zetTourProfiel('p2');
    expect(tourGezien('leerkracht')).toBe(true);
    zetTourProfiel(null);
  });

  it('kapotte opslag geeft geen fout', () => {
    localStorage.setItem('collage-tours-gezien', '{kapot');
    expect(tourGezien('editor')).toBe(false);
  });
});
