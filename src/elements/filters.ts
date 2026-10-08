import type { FilterNaam } from '../document/types';

export const FILTERS: { naam: FilterNaam; label: string }[] = [
  { naam: 'normaal', label: 'Normaal' }, { naam: 'zwartwit', label: 'Zwart-wit' }, { naam: 'sepia', label: 'Oud' },
  { naam: 'warm', label: 'Warm' }, { naam: 'koel', label: 'Koel' }, { naam: 'vrolijk', label: 'Vrolijk' },
  { naam: 'vervaagd', label: 'Wazig' }, { naam: 'pixel', label: 'Pixels' }, { naam: 'strip', label: 'Strip' },
  { naam: 'negatief', label: 'Omgekeerd' },
];

function boxBlur(img: ImageData, r: number): void {
  const { width: w, height: h, data } = img;
  const tmp = new Uint8ClampedArray(data.length);
  const pass = (src: Uint8ClampedArray, dst: Uint8ClampedArray, horizontaal: boolean) => {
    const lijnen = horizontaal ? h : w, lengte = horizontaal ? w : h;
    for (let l = 0; l < lijnen; l++) {
      for (let c = 0; c < 4; c++) {
        let som = 0, n = 0;
        const idx = (k: number) => (horizontaal ? (l * w + k) : (k * w + l)) * 4 + c;
        for (let k = 0; k <= Math.min(r, lengte - 1); k++) { som += src[idx(k)]; n++; }
        for (let k = 0; k < lengte; k++) {
          dst[idx(k)] = som / n;
          const uit = k - r, inn = k + r + 1;
          if (uit >= 0) { som -= src[idx(uit)]; n--; }
          if (inn < lengte) { som += src[idx(inn)]; n++; }
        }
      }
    }
  };
  for (let i = 0; i < 2; i++) { pass(data, tmp, true); pass(tmp, data, false); }
}

function pixeleer(img: ImageData, blok: number): void {
  const { width: w, height: h, data } = img;
  for (let by = 0; by < h; by += blok) {
    for (let bx = 0; bx < w; bx += blok) {
      const som = [0, 0, 0, 0];
      let n = 0;
      for (let y = by; y < Math.min(by + blok, h); y++) for (let x = bx; x < Math.min(bx + blok, w); x++) {
        const i = (y * w + x) * 4;
        for (let c = 0; c < 4; c++) som[c] += data[i + c];
        n++;
      }
      for (let y = by; y < Math.min(by + blok, h); y++) for (let x = bx; x < Math.min(bx + blok, w); x++) {
        const i = (y * w + x) * 4;
        for (let c = 0; c < 4; c++) data[i + c] = som[c] / n;
      }
    }
  }
}

export function pasFilterToe(img: ImageData, naam: FilterNaam, helderheid = 0, contrast = 0): void {
  if (naam === 'vervaagd') boxBlur(img, Math.max(2, Math.round(img.width / 150)));
  if (naam === 'pixel') pixeleer(img, Math.max(4, Math.round(img.width / 60)));
  const kleurFilter = naam !== 'normaal' && naam !== 'vervaagd' && naam !== 'pixel';
  if (!kleurFilter && !helderheid && !contrast) return;
  const c = contrast * 2.55;
  const f = (259 * (c + 255)) / (255 * (259 - c));
  const hd = helderheid * 2.55;
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    switch (naam) {
      case 'zwartwit': { const v = 0.299 * r + 0.587 * g + 0.114 * b; r = g = b = v; break; }
      case 'sepia': { const nr = 0.393 * r + 0.769 * g + 0.189 * b, ng = 0.349 * r + 0.686 * g + 0.168 * b, nb = 0.272 * r + 0.534 * g + 0.131 * b; r = nr; g = ng; b = nb; break; }
      case 'warm': r = r * 1.08 + 10; b = b * 0.88; break;
      case 'koel': r = r * 0.9; b = b * 1.1 + 10; break;
      case 'vrolijk': { const v = 0.299 * r + 0.587 * g + 0.114 * b; r = v + (r - v) * 1.6; g = v + (g - v) * 1.6; b = v + (b - v) * 1.6; break; }
      case 'strip': { const p = (x: number) => (Math.round((x / 255) * 3) / 3) * 255; r = p(r); g = p(g); b = p(b); break; }
      case 'negatief': r = 255 - r; g = 255 - g; b = 255 - b; break;
    }
    if (hd || contrast) { r = f * (r + hd - 128) + 128; g = f * (g + hd - 128) + 128; b = f * (b + hd - 128) + 128; }
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
}

export function filterVoorbeeld(bron: CanvasImageSource, bronB: number, bronH: number, naam: FilterNaam): string {
  const m = 72;
  const c = document.createElement('canvas');
  c.width = c.height = m;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  const s = Math.min(bronB, bronH);
  x.drawImage(bron, (bronB - s) / 2, (bronH - s) / 2, s, s, 0, 0, m, m);
  const d = x.getImageData(0, 0, m, m);
  pasFilterToe(d, naam);
  x.putImageData(d, 0, 0);
  return c.toDataURL('image/png');
}
