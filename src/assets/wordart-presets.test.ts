import { describe, it, expect } from 'vitest';
import { WORDART_PRESETS, wordartPreset } from './wordart-presets';

describe('WordArt-voorinstellingen', () => {
  it('heeft 12 unieke voorinstellingen', () => {
    expect(WORDART_PRESETS).toHaveLength(12);
    expect(new Set(WORDART_PRESETS.map((p) => p.id)).size).toBe(12);
  });

  it('wordartPreset geeft een kopie', () => {
    const a = wordartPreset('regenboog');
    a.vorm = 'cirkel';
    expect(wordartPreset('regenboog').vorm).toBe('recht');
  });

  it('onbekende voorinstelling geeft een fout', () => {
    expect(() => wordartPreset('bestaat-niet')).toThrow();
  });
});
