import { describe, it, expect } from 'vitest';
import { maakDeelpakket, voorbeeldUitPakket, MAX_PAKKET, DeelFout } from './pakket';
import { AssetStore } from '../assets/store';
import { nieuweCollage, maakVorm } from '../document/create';
import { vanBestand } from '../storage/bestand';

async function png(): Promise<Blob> {
  const c = new OffscreenCanvas(8, 8);
  c.getContext('2d')!.fillRect(0, 0, 8, 8);
  return c.convertToBlob({ type: 'image/png' });
}

function willekeurig(n: number): Uint8Array {
  const a = new Uint8Array(n);
  for (let i = 0; i < n; i += 65536) crypto.getRandomValues(a.subarray(i, Math.min(i + 65536, n)));
  return a;
}

describe('deelpakket', () => {
  it('is een geldig .collage-bestand met voorbeeld', async () => {
    const c = { ...nieuweCollage('vierkant', 'Deel mij'), elementen: [maakVorm({ x: 1, y: 1, vorm: 'hart', breedte: 10, hoogte: 10 })] };
    const p = await maakDeelpakket(c, new AssetStore(), await png());
    expect((await vanBestand(p)).collage.naam).toBe('Deel mij');
    expect(await voorbeeldUitPakket(p)).toMatch(/^data:image\/png;base64,/);
  });
  it('geen voorbeeld of geen zip geeft null', async () => {
    expect(await voorbeeldUitPakket(new Blob(['x']))).toBeNull();
  });
  it('te groot pakket wordt geweigerd', async () => {
    const groot = { blob: () => new Blob([willekeurig(MAX_PAKKET + 10)]) };
    const c = { ...nieuweCollage('vierkant'), achtergrond: { soort: 'foto' as const, assetId: 'a' } };
    await expect(maakDeelpakket(c, groot, await png())).rejects.toMatchObject({ code: 'te-groot' });
    expect(new DeelFout('relay').code).toBe('relay');
  });
});
