import { describe, it, expect } from 'vitest';
import { maakTekening, normaliseerStreek } from './create';

describe('normaliseerStreek', () => {
  it('berekent middelpunt en kader inclusief halve dikte', () => {
    const r = normaliseerStreek([100, 100, 200, 150], 10);
    expect(r).toEqual({ x: 150, y: 125, breedte: 110, hoogte: 60, punten: [5, 5, 105, 55] });
  });

  it('een tik (één punt) wordt een stip', () => {
    const r = normaliseerStreek([50, 50], 20);
    expect(r.punten).toHaveLength(4);
    expect(r.breedte).toBeGreaterThanOrEqual(20);
  });
});

describe('maakTekening', () => {
  it('maakt een tekening-element met genormaliseerde punten', () => {
    const t = maakTekening([0, 0, 10, 10], 'krijt', '#FF0000', 8);
    expect(t).toMatchObject({ type: 'tekening', gereedschap: 'krijt', kleur: '#FF0000', dikte: 8, x: 5, y: 5 });
  });
});
