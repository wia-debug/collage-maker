import { describe, it, expect } from 'vitest';
import { AchtergrondFout, verwijderAchtergrond } from './achtergrond';

const png = new Blob([new Uint8Array([1])], { type: 'image/png' });

describe('achtergrond weg', () => {
  it('geeft het resultaat en meldt voortgang', async () => {
    const delen: number[] = [];
    const uit = await verwijderAchtergrond(png, (d) => delen.push(d), async (_b, v) => { v(0.5); v(1); return png; });
    expect(uit.type).toBe('image/png');
    expect(delen).toEqual([0.5, 1]);
  });
  it('downloadfout wordt download', async () => {
    await expect(verwijderAchtergrond(png, () => {}, async () => { throw new TypeError('Failed to fetch'); })).rejects.toMatchObject({ code: 'download' });
  });
  it('volle opslag wordt vol', async () => {
    await expect(verwijderAchtergrond(png, () => {}, async () => { throw new DOMException('x', 'QuotaExceededError'); })).rejects.toMatchObject({ code: 'vol' });
  });
  it('andere fout of geen png wordt mislukt', async () => {
    await expect(verwijderAchtergrond(png, () => {}, async () => { throw new Error('kapot'); })).rejects.toBeInstanceOf(AchtergrondFout);
    await expect(verwijderAchtergrond(png, () => {}, async () => new Blob(['x'], { type: 'text/plain' }))).rejects.toMatchObject({ code: 'mislukt' });
  });
});
