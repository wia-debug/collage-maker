import type { Patroon } from '../document/types';
import { mulberry32 } from './patronen-rng';
import { tracePad, type PathCtx } from './paths';

export const PATRONEN: { patroon: Patroon; naam: string }[] = [
  { patroon: 'stippen', naam: 'Stippen' }, { patroon: 'strepen', naam: 'Strepen' }, { patroon: 'ruitjes', naam: 'Ruitjes' },
  { patroon: 'sterren', naam: 'Sterren' }, { patroon: 'papier', naam: 'Papier' }, { patroon: 'karton', naam: 'Karton' },
];

const cache = new Map<string, HTMLCanvasElement>();

export function maakPatroon(p: Patroon, kleur: string, achtergrondkleur: string): HTMLCanvasElement {
  const key = `${p}|${kleur}|${achtergrondkleur}`;
  const klaar = cache.get(key);
  if (klaar) return klaar;
  const t = 80;
  const c = document.createElement('canvas');
  c.width = c.height = t;
  const x = c.getContext('2d')!;
  x.fillStyle = achtergrondkleur;
  x.fillRect(0, 0, t, t);
  x.fillStyle = kleur;
  x.strokeStyle = kleur;
  const rnd = mulberry32(42);
  switch (p) {
    case 'stippen':
      for (const [cx, cy] of [[20, 20], [60, 60]]) { x.beginPath(); x.arc(cx, cy, 9, 0, Math.PI * 2); x.fill(); }
      break;
    case 'strepen':
      x.lineWidth = 12;
      for (let o = -t; o <= t * 2; o += 40) { x.beginPath(); x.moveTo(o, 0); x.lineTo(o - t, t); x.stroke(); }
      break;
    case 'ruitjes':
      for (const o of [0, 40]) { x.fillRect(o, 0, 3, t); x.fillRect(0, o, t, 3); }
      break;
    case 'sterren':
      for (const [cx, cy, s] of [[20, 20, 24], [60, 60, 18]]) {
        x.save(); x.translate(cx - s / 2, cy - s / 2); tracePad(x as unknown as PathCtx, 'ster', s, s); x.fill(); x.restore();
      }
      break;
    case 'papier':
      for (let i = 0; i < 900; i++) { x.globalAlpha = rnd() * 0.08; x.fillRect(rnd() * t, rnd() * t, 1.5, 1.5); }
      break;
    case 'karton':
      x.lineWidth = 1;
      for (let i = 0; i < 60; i++) {
        x.globalAlpha = 0.08 + rnd() * 0.1;
        const y0 = rnd() * t;
        x.beginPath(); x.moveTo(0, y0); x.lineTo(t, y0 + (rnd() - 0.5) * 6); x.stroke();
      }
      break;
  }
  x.globalAlpha = 1;
  cache.set(key, c);
  return c;
}
