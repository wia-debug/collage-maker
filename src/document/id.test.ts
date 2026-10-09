import { describe, it, expect } from 'vitest';
import { nieuwId, uuidUitBytes } from './create';

describe('id', () => {
  it('uuidUitBytes maakt een geldige v4-uuid', () => {
    const u = uuidUitBytes(new Uint8Array(16).fill(255));
    expect(u).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  it('nieuwId is uniek', () => {
    expect(new Set(Array.from({ length: 200 }, nieuwId)).size).toBe(200);
  });
});
