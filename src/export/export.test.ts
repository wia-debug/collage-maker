import { describe, it, expect } from 'vitest';
import { bestandsnaam, dataUrlNaarBlob } from './bewaar';
import { maakPdf } from './pdf';

describe('bestandsnaam', () => {
  it('maakt een veilige naam met datum', () => {
    expect(bestandsnaam('Mijn vakantie!', 'png', new Date(2026, 9, 8))).toBe('mijn-vakantie-2026-10-08.png');
    expect(bestandsnaam('Café Één', 'pdf', new Date(2026, 0, 2))).toBe('cafe-een-2026-01-02.pdf');
    expect(bestandsnaam('***', 'png', new Date(2026, 0, 2))).toBe('collage-2026-01-02.png');
  });
});

describe('maakPdf', () => {
  it('maakt een PDF-blob', async () => {
    const c = document.createElement('canvas');
    c.width = 100; c.height = 70;
    const blob = await maakPdf(c.toDataURL('image/png'), 'a4-liggend');
    expect(blob.type).toBe('application/pdf');
    const kop = await blob.slice(0, 5).text();
    expect(kop).toBe('%PDF-');
  });
});

describe('dataUrlNaarBlob', () => {
  it('zet een data-URL om', async () => {
    const c = document.createElement('canvas');
    expect((await dataUrlNaarBlob(c.toDataURL('image/png'))).type).toBe('image/png');
  });
});
