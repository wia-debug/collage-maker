import { describe, it, expect, beforeAll } from 'vitest';
import { LETTERTYPES, familie, fontStijl, laadLettertypes, meet } from './fonts';

beforeAll(() => laadLettertypes());

describe('lettertypes', () => {
  it('heeft 10 lettertypes en ze zijn geladen', () => {
    expect(LETTERTYPES).toHaveLength(10);
    for (const l of LETTERTYPES) expect(document.fonts.check(`40px ${l.familie}`), l.id).toBe(true);
  });

  it('familie geeft de CSS-familie, onbekend valt terug op Nunito', () => {
    expect(familie('baloo')).toBe('"Baloo 2"');
    expect(familie('bestaat-niet')).toBe('Nunito');
  });

  it('fontStijl combineert schuin en vet zoals Konva verwacht', () => {
    expect(fontStijl({ vet: false, schuin: false })).toBe('normal');
    expect(fontStijl({ vet: true, schuin: false })).toBe('bold');
    expect(fontStijl({ vet: true, schuin: true })).toBe('italic bold');
  });

  it('meet hangt af van het lettertype en de grootte', () => {
    const a = meet('Hallo wereld', familie('bangers'), 40);
    const b = meet('Hallo wereld', familie('pacifico'), 40);
    expect(a).not.toBeCloseTo(b, 0);
    expect(meet('Hallo', 'Nunito', 80)).toBeCloseTo(meet('Hallo', 'Nunito', 40) * 2, 0);
  });
});
