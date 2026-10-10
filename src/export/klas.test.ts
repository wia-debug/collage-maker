import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { klasBestandsnaam, maakKlasPdf, maakKlasZip, zipNamen } from './klas';
import { maakVorm, nieuweCollage } from '../document/create';
import { naarBestand } from '../storage/bestand';
import type { InzendingRij } from '../storage/db';

const rij = async (naam: string, formaat: 'vierkant' | 'a4-liggend' = 'vierkant'): Promise<InzendingRij> => {
  const c = { ...nieuweCollage(formaat), elementen: [maakVorm({ x: 100, y: 100, vorm: 'ster', breedte: 100, hoogte: 100 })] };
  return { id: naam, naam, ontvangen: 1, bestand: await naarBestand(c, { blob: () => undefined }), voorbeeld: null };
};

describe('klas-export', () => {
  it('maakt unieke, veilige bestandsnamen', () => {
    expect(zipNamen(['Lies', 'lies', 'Lies', 'a/b', '  ', 'Omar'])).toEqual(['Lies.png', 'lies 2.png', 'Lies 3.png', 'a-b.png', 'collage.png', 'Omar.png']);
  });
  it('vervangt backslash in namen', () => {
    expect(zipNamen(['a\\b'])).toEqual(['a-b.png']);
  });
  it('bestandsnaam met datum', () => {
    expect(klasBestandsnaam('zip', new Date(2026, 9, 10))).toBe('klas-2026-10-10.zip');
  });
  it('ZIP met één PNG per inzending; kapotte inzending overgeslagen', async () => {
    const kapot: InzendingRij = { id: 'x', naam: 'Kapot', ontvangen: 1, bestand: new Blob(['nee']), voorbeeld: null };
    const stappen: number[] = [];
    const zip = await JSZip.loadAsync(await maakKlasZip([await rij('Lies'), kapot, await rij('Lies')], (k) => stappen.push(k)));
    expect(Object.keys(zip.files).sort()).toEqual(['Lies 2.png', 'Lies.png']);
    expect(stappen.at(-1)).toBe(3);
  });
  it('PDF heeft één pagina per inzending', async () => {
    const pdf = await maakKlasPdf([await rij('Lies'), await rij('Omar', 'a4-liggend')]);
    const tekst = await pdf.text();
    expect((tekst.match(/\/Type \/Page\b/g) ?? []).length).toBe(2);
  });
});
