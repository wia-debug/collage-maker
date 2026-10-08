import { describe, it, expect } from 'vitest';
import names from '../assets/icon-names.json';
import { iconSvg } from './icons';

describe('iconen', () => {
  it('elk icoon uit de lijst is beschikbaar als SVG', () => {
    for (const n of names) expect(iconSvg(n), n).toMatch(/^<svg/);
  });
});
