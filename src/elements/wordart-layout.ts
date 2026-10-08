import type { WordArt, WordArtVorm } from '../document/types';

export interface LetterPos { x: number; y: number; rotatie: number }

export const REGENBOOG = ['#FF5A5F', '#FF9F1C', '#FFD23F', '#3BB273', '#3A86FF', '#8338EC', '#FF4FD8'];

const graden = (r: number) => (r * 180) / Math.PI;

export function legLetters(breedtes: number[], vorm: WordArtVorm, grootte: number): { posities: LetterPos[]; breedte: number; hoogte: number } {
  const totaal = breedtes.reduce((a, b) => a + b, 0);
  const midden: number[] = [];
  let acc = 0;
  for (const b of breedtes) { midden.push(acc + b / 2); acc += b; }

  let ruw: LetterPos[];
  let straal = 0; // alleen voor cirkel: kader omvat de hele cirkel, zodat het midden klopt
  switch (vorm) {
    case 'recht':
      ruw = midden.map((m) => ({ x: m, y: 0, rotatie: 0 }));
      break;
    case 'golf': {
      const amp = grootte * 0.35, golf = grootte * 4, k = (2 * Math.PI) / golf;
      ruw = midden.map((m) => ({ x: m, y: amp * Math.sin(k * m), rotatie: graden(Math.atan(amp * k * Math.cos(k * m))) }));
      break;
    }
    case 'boog-omhoog':
    case 'cirkel': {
      const R = vorm === 'cirkel' ? Math.max(grootte * 0.8, (totaal / (2 * Math.PI)) * 1.08) : Math.max(grootte * 2, totaal / (Math.PI * 0.6));
      const theta = totaal / R;
      if (vorm === 'cirkel') straal = R;
      ruw = midden.map((m) => {
        const a = -Math.PI / 2 - theta / 2 + m / R;
        return { x: R * Math.cos(a), y: R * Math.sin(a), rotatie: graden(a) + 90 };
      });
      break;
    }
    case 'boog-omlaag': {
      const R = Math.max(grootte * 2, totaal / (Math.PI * 0.6));
      const theta = totaal / R;
      ruw = midden.map((m) => {
        const a = Math.PI / 2 + theta / 2 - m / R;
        return { x: R * Math.cos(a), y: R * Math.sin(a), rotatie: graden(a) - 90 };
      });
      break;
    }
  }

  const pad = grootte * 0.7;
  if (!ruw.length) return { posities: [], breedte: pad * 2, hoogte: pad * 2 };
  const xs = ruw.map((p) => p.x), ys = ruw.map((p) => p.y);
  if (straal) xs.push(-straal, straal), ys.push(-straal, straal);
  const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
  return {
    posities: ruw.map((p) => ({ x: p.x - minX, y: p.y - minY, rotatie: p.rotatie })),
    breedte: maxX - minX,
    hoogte: maxY - minY,
  };
}

const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0').toUpperCase();

export function mengKleur(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => hex(v + (pb[i] - v) * t)).join('');
}

export function letterKleur(v: WordArt['vulling'], i: number, n: number): string {
  switch (v.soort) {
    case 'kleur': return v.kleuren[0] ?? '#2D2A32';
    case 'regenboog': { const k = v.kleuren.length ? v.kleuren : REGENBOOG; return k[i % k.length]; }
    case 'verloop': return mengKleur(v.kleuren[0] ?? '#2D2A32', v.kleuren[1] ?? v.kleuren[0] ?? '#2D2A32', n <= 1 ? 0 : i / (n - 1));
  }
}
