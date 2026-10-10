import { describe, it, expect, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { ontgrendelGeluid, speel, zetGeluid } from './geluid';
import { confetti, magAnimeren, vier, zetAnimatie } from './animatie';

afterEach(() => { vi.restoreAllMocks(); zetGeluid(true); zetAnimatie(true); });

describe('geluid', () => {
  it('speelt niets als geluid uit staat', () => {
    const spy = vi.spyOn(AudioContext.prototype, 'createOscillator');
    ontgrendelGeluid();
    zetGeluid(false);
    speel('plop');
    expect(spy).not.toHaveBeenCalled();
  });
  it('speelt een toon als geluid aan staat en ontgrendeld is', () => {
    const spy = vi.spyOn(AudioContext.prototype, 'createOscillator');
    ontgrendelGeluid();
    speel('plop');
    expect(spy).toHaveBeenCalled();
  });
});

describe('animatie', () => {
  it('vier verhoogt de confetti-teller als animatie mag', () => {
    const voor = get(confetti);
    vier();
    expect(get(confetti)).toBe(voor + 1);
  });
  it('niets als animatie uit staat', () => {
    zetAnimatie(false);
    const voor = get(confetti);
    vier();
    expect(get(confetti)).toBe(voor);
    expect(magAnimeren()).toBe(false);
  });
  it('niets bij prefers-reduced-motion', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    expect(magAnimeren()).toBe(false);
  });
});
