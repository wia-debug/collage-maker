import type { Formaat } from '../document/types';
import { FORMATEN } from '../document/formats';

export async function maakPdf(png: string, formaat: Formaat): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const f = FORMATEN[formaat];
  const pdf = new jsPDF({ orientation: f.breedte > f.hoogte ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
  const marge = formaat.startsWith('a4') ? 0 : 8;
  const s = Math.min((pw - 2 * marge) / f.breedte, (ph - 2 * marge) / f.hoogte);
  const w = f.breedte * s, h = f.hoogte * s;
  pdf.addImage(png, 'PNG', (pw - w) / 2, (ph - h) / 2, w, h, undefined, 'FAST');
  return pdf.output('blob');
}
