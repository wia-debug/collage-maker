import JSZip from 'jszip';
import type { Formaat } from '../document/types';
import { FORMATEN } from '../document/formats';
import type { InzendingRij } from '../storage/db';
import { vanBestand } from '../storage/bestand';
import { vulAssets } from '../storage/collages';
import { AssetStore } from '../assets/store';
import { maakVoorbeeld } from './voorbeeld';
import { dataUrlNaarBlob } from './bewaar';

export function zipNamen(namen: string[]): string[] {
  const gezien = new Map<string, number>();
  return namen.map((n) => {
    // eslint-disable-next-line no-control-regex
    const schoon = n.replace(/[\/:*?"<>|\u0000-\u001f]/g, '-').trim() || 'collage';
    const sleutel = schoon.toLocaleLowerCase('nl');
    const aantal = (gezien.get(sleutel) ?? 0) + 1;
    gezien.set(sleutel, aantal);
    return `${aantal === 1 ? schoon : `${schoon} ${aantal}`}.png`;
  });
}

export function klasBestandsnaam(ext: 'zip' | 'pdf', datum = new Date()): string {
  const d = `${datum.getFullYear()}-${String(datum.getMonth() + 1).padStart(2, '0')}-${String(datum.getDate()).padStart(2, '0')}`;
  return `klas-${d}.${ext}`;
}

export async function renderInzending(rij: InzendingRij, schaal = 2): Promise<{ png: string; formaat: Formaat }> {
  const { collage, blobs } = await vanBestand(rij.bestand);
  const assets = new AssetStore();
  await vulAssets(assets, blobs);
  return { png: await maakVoorbeeld(collage, assets, FORMATEN[collage.formaat].breedte * schaal), formaat: collage.formaat };
}

type Voortgang = (klaar: number, totaal: number) => void;

export async function maakKlasZip(rijen: InzendingRij[], voortgang?: Voortgang): Promise<Blob> {
  const zip = new JSZip();
  const namen = zipNamen(rijen.map((r) => r.naam));
  for (const [i, r] of rijen.entries()) {
    try { zip.file(namen[i], await dataUrlNaarBlob((await renderInzending(r)).png)); } catch { /* kapotte inzending overslaan */ }
    voortgang?.(i + 1, rijen.length);
  }
  return zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
}

export async function maakKlasPdf(rijen: InzendingRij[], voortgang?: Voortgang): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  let pdf: InstanceType<typeof jsPDF> | null = null;
  for (const [i, r] of rijen.entries()) {
    try {
      const { png, formaat } = await renderInzending(r);
      const f = FORMATEN[formaat];
      const orientation = f.breedte > f.hoogte ? 'landscape' : 'portrait';
      if (!pdf) pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
      else pdf.addPage('a4', orientation);
      const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
      const marge = 10, naamVak = 14;
      const s = Math.min((pw - 2 * marge) / f.breedte, (ph - 2 * marge - naamVak) / f.hoogte);
      const w = f.breedte * s, h = f.hoogte * s;
      pdf.addImage(png, 'PNG', (pw - w) / 2, marge, w, h, undefined, 'FAST');
      pdf.setFontSize(16);
      pdf.text(r.naam, pw / 2, marge + h + 9, { align: 'center' });
    } catch { /* kapotte inzending overslaan */ }
    voortgang?.(i + 1, rijen.length);
  }
  return (pdf ?? new jsPDF()).output('blob');
}
