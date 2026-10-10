import type { Pad } from '../document/types';

export interface PathCtx {
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  bezierCurveTo(a: number, b: number, c: number, d: number, x: number, y: number): void;
  ellipse(x: number, y: number, rx: number, ry: number, rot: number, start: number, end: number): void;
  closePath(): void;
}

type Cmd = ['M', number, number] | ['L', number, number] | ['C', number, number, number, number, number, number] | ['E'] | ['Z'];

function ster(): Cmd[] {
  const c: Cmd[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.5 : 0.21;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    c.push([i === 0 ? 'M' : 'L', 0.5 + r * Math.cos(a), 0.53 + r * Math.sin(a)]);
  }
  c.push(['Z']);
  return c;
}

// Regelmatige veelhoek, geschaald zodat hij de hele 0..1-doos vult.
function veelhoek(n: number, start: number): Cmd[] {
  const pts = Array.from({ length: n }, (_, i) => [Math.cos(start + (i * 2 * Math.PI) / n), Math.sin(start + (i * 2 * Math.PI) / n)]);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const c: Cmd[] = pts.map((p, i) => [i === 0 ? 'M' : 'L', (p[0] - x0) / (x1 - x0), (p[1] - y0) / (y1 - y0)] as Cmd);
  c.push(['Z']);
  return c;
}

const PADEN: Record<Pad, Cmd[]> = {
  rechthoek: [['M', 0, 0], ['L', 1, 0], ['L', 1, 1], ['L', 0, 1], ['Z']],
  rond: [['E']],
  hart: [
    ['M', 0.5, 0.92], ['C', 0.18, 0.7, 0, 0.5, 0, 0.3], ['C', 0, 0.12, 0.14, 0.02, 0.28, 0.02],
    ['C', 0.39, 0.02, 0.47, 0.09, 0.5, 0.18], ['C', 0.53, 0.09, 0.61, 0.02, 0.72, 0.02],
    ['C', 0.86, 0.02, 1, 0.12, 1, 0.3], ['C', 1, 0.5, 0.82, 0.7, 0.5, 0.92], ['Z'],
  ],
  ster: ster(),
  wolk: [
    ['M', 0.2, 0.85], ['C', 0.05, 0.85, 0, 0.65, 0.12, 0.55], ['C', 0.05, 0.35, 0.25, 0.22, 0.38, 0.3],
    ['C', 0.42, 0.12, 0.68, 0.08, 0.72, 0.28], ['C', 0.9, 0.22, 1.02, 0.42, 0.9, 0.55],
    ['C', 1.02, 0.65, 0.95, 0.85, 0.8, 0.85], ['Z'],
  ],
  blob: [
    ['M', 0.5, 0.03], ['C', 0.8, 0, 1, 0.25, 0.97, 0.52], ['C', 0.94, 0.82, 0.7, 1, 0.45, 0.97],
    ['C', 0.18, 0.94, 0, 0.75, 0.03, 0.48], ['C', 0.06, 0.2, 0.25, 0.05, 0.5, 0.03], ['Z'],
  ],
  driehoek: [['M', 0.5, 0], ['L', 1, 1], ['L', 0, 1], ['Z']],
  ruit: [['M', 0.5, 0], ['L', 1, 0.5], ['L', 0.5, 1], ['L', 0, 0.5], ['Z']],
  vijfhoek: veelhoek(5, -Math.PI / 2),
  zeshoek: veelhoek(6, 0),
  pijl: [['M', 0, 0.35], ['L', 0.6, 0.35], ['L', 0.6, 0.1], ['L', 1, 0.5], ['L', 0.6, 0.9], ['L', 0.6, 0.65], ['L', 0, 0.65], ['Z']],
};

export function tracePad(ctx: PathCtx, pad: Pad, w: number, h: number): void {
  ctx.beginPath();
  for (const c of PADEN[pad]) {
    switch (c[0]) {
      case 'M': ctx.moveTo(c[1] * w, c[2] * h); break;
      case 'L': ctx.lineTo(c[1] * w, c[2] * h); break;
      case 'C': ctx.bezierCurveTo(c[1] * w, c[2] * h, c[3] * w, c[4] * h, c[5] * w, c[6] * h); break;
      case 'E': ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); break;
      case 'Z': ctx.closePath(); break;
    }
  }
}
