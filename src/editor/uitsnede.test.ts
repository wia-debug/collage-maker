import { describe, it, expect } from 'vitest';
import { dekUitsnede } from './uitsnede';

describe('dekUitsnede', () => {
  it('snijdt een brede foto bij voor een vierkant vak (midden)', () => {
    expect(dekUitsnede(400, 200, 100, 100)).toEqual({ x: 100, y: 0, breedte: 200, hoogte: 200 });
  });
  it('snijdt een hoge foto bij voor een breed vak (midden)', () => {
    expect(dekUitsnede(200, 400, 200, 100)).toEqual({ x: 0, y: 150, breedte: 200, hoogte: 100 });
  });
});
