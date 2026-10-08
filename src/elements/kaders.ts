import Konva from 'konva';
import type { ShapeConfig } from 'konva/lib/Shape';
import type { KaderStijl, Masker } from '../document/types';
import { tracePad, type PathCtx } from './paths';
import { mulberry32 } from './patronen-rng';

export const KADERS: { stijl: KaderStijl; naam: string }[] = [
  { stijl: 'geen', naam: 'Geen' }, { stijl: 'effen', naam: 'Rand' }, { stijl: 'polaroid', naam: 'Polaroid' },
  { stijl: 'plakband', naam: 'Plakband' }, { stijl: 'gescheurd', naam: 'Gescheurd' }, { stijl: 'stippen', naam: 'Stippen' },
  { stijl: 'film', naam: 'Film' }, { stijl: 'goud', naam: 'Goud' }, { stijl: 'krijt', naam: 'Krijt' },
  { stijl: 'dubbel', naam: 'Dubbel' }, { stijl: 'schaduw', naam: 'Schaduw' }, { stijl: 'golf', naam: 'Golf' },
  { stijl: 'sterren', naam: 'Sterren' },
];

export const MASKERS: { masker: Masker; naam: string; icoon: string }[] = [
  { masker: 'rechthoek', naam: 'Vierkant', icoon: 'square' }, { masker: 'rond', naam: 'Rond', icoon: 'circle' },
  { masker: 'hart', naam: 'Hart', icoon: 'heart' }, { masker: 'ster', naam: 'Ster', icoon: 'star' },
  { masker: 'wolk', naam: 'Wolk', icoon: 'cloud' }, { masker: 'blob', naam: 'Vlek', icoon: 'drop' },
];

const GOUD = [0, '#B8860B', 0.25, '#FFE58A', 0.5, '#D4A017', 0.75, '#FFF3B0', 1, '#B8860B'];

export function langsRand(w: number, h: number, stap: number): { x: number; y: number }[] {
  const omtrek = 2 * (w + h);
  const n = Math.max(4, Math.round(omtrek / stap));
  const punten: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    let s = (i * omtrek) / n;
    if (s < w) { punten.push({ x: s, y: 0 }); continue; }
    s -= w;
    if (s < h) { punten.push({ x: w, y: s }); continue; }
    s -= h;
    if (s < w) { punten.push({ x: w - s, y: h }); continue; }
    s -= w;
    punten.push({ x: 0, y: h - s });
  }
  return punten;
}

const stil = { listening: false, name: 'kader' };

function omtrek(masker: Masker, w: number, h: number, cfg: ShapeConfig): Konva.Shape {
  return new Konva.Shape({
    ...stil, lineJoin: 'round', ...cfg,
    sceneFunc(ctx, s) { tracePad(ctx as unknown as PathCtx, masker, w, h); ctx.strokeShape(s); },
  });
}

function vlak(masker: Masker, w: number, h: number, cfg: ShapeConfig): Konva.Shape {
  return new Konva.Shape({
    ...stil, ...cfg,
    sceneFunc(ctx, s) { tracePad(ctx as unknown as PathCtx, masker, w, h); ctx.fillShape(s); },
  });
}

export function kaderNodes(stijl: KaderStijl, kleur: string, w: number, h: number, masker: Masker): { achter: Konva.Shape[]; voor: Konva.Shape[] } {
  const d = Math.max(6, Math.min(w, h) * 0.04);
  const niets = { achter: [], voor: [] };
  if (stijl === 'geen') return niets;

  if (masker !== 'rechthoek') {
    switch (stijl) {
      case 'dubbel': return { achter: [], voor: [omtrek(masker, w, h, { stroke: kleur, strokeWidth: d * 2.4 }), omtrek(masker, w, h, { stroke: '#FFFFFF', strokeWidth: d * 0.8 })] };
      case 'stippen': return { achter: [], voor: [omtrek(masker, w, h, { stroke: kleur, strokeWidth: d * 1.6, dash: [0, d * 2.2], lineCap: 'round' })] };
      case 'goud': return { achter: [], voor: [omtrek(masker, w, h, { strokeWidth: d * 2.4, strokeLinearGradientStartPoint: { x: 0, y: 0 }, strokeLinearGradientEndPoint: { x: w, y: h }, strokeLinearGradientColorStops: GOUD })] };
      case 'krijt': return { achter: [], voor: [omtrek(masker, w, h, { stroke: kleur, strokeWidth: d * 1.4, dash: [d * 3, d * 0.6, d * 1.2, d * 0.5], opacity: 0.85 })] };
      case 'schaduw': return { achter: [vlak(masker, w, h, { fill: '#FFFFFF', shadowColor: 'rgba(0,0,0,0.35)', shadowBlur: d * 3, shadowOffset: { x: d * 0.5, y: d } })], voor: [] };
      default: return { achter: [], voor: [omtrek(masker, w, h, { stroke: kleur, strokeWidth: d * 2 })] };
    }
  }

  const rand = (cfg: ShapeConfig) => new Konva.Rect({ ...stil, x: 0, y: 0, width: w, height: h, lineJoin: 'round', ...cfg });

  switch (stijl) {
    case 'effen':
      return { achter: [], voor: [rand({ stroke: kleur, strokeWidth: d * 2 })] };
    case 'polaroid':
      return { achter: [new Konva.Rect({ ...stil, x: -d * 1.5, y: -d * 1.5, width: w + d * 3, height: h + d * 7.5, fill: kleur, shadowColor: 'rgba(0,0,0,0.25)', shadowBlur: d * 2, shadowOffset: { x: 0, y: d * 0.6 } })], voor: [] };
    case 'plakband': {
      const tape = (x: number, rot: number) => new Konva.Rect({ ...stil, x, y: 0, width: w * 0.3, height: d * 3, offsetX: w * 0.15, offsetY: d * 1.5, rotation: rot, fill: kleur, opacity: 0.7 });
      return { achter: [], voor: [tape(0, -40), tape(w, 40)] };
    }
    case 'gescheurd': {
      const m = d * 1.8, j = d * 0.9;
      const rng = mulberry32(Math.round(w * 7 + h * 13));
      const pts = langsRand(w + 2 * m, h + 2 * m, d * 1.4).flatMap((p) => [p.x - m + (rng() - 0.5) * j, p.y - m + (rng() - 0.5) * j]);
      return { achter: [new Konva.Line({ ...stil, points: pts, closed: true, fill: kleur, shadowColor: 'rgba(0,0,0,0.2)', shadowBlur: d, shadowOffset: { x: 0, y: d * 0.3 } })], voor: [] };
    }
    case 'stippen':
      return { achter: [], voor: [rand({ stroke: kleur, strokeWidth: d * 1.6, dash: [0, d * 2.2], lineCap: 'round' })] };
    case 'film': {
      const gaten: Konva.Shape[] = [];
      for (let y = d * 0.6; y < h - d; y += d * 2.5) {
        gaten.push(new Konva.Rect({ ...stil, x: -d * 2.2, y, width: d, height: d * 1.2, cornerRadius: 2, fill: '#FFFFFF' }));
        gaten.push(new Konva.Rect({ ...stil, x: w + d * 1.2, y, width: d, height: d * 1.2, cornerRadius: 2, fill: '#FFFFFF' }));
      }
      return { achter: [new Konva.Rect({ ...stil, x: -d * 3, y: -d * 0.8, width: w + d * 6, height: h + d * 1.6, fill: '#1E1E1E' })], voor: gaten };
    }
    case 'goud':
      return { achter: [], voor: [rand({ strokeWidth: d * 2.4, strokeLinearGradientStartPoint: { x: 0, y: 0 }, strokeLinearGradientEndPoint: { x: w, y: h }, strokeLinearGradientColorStops: GOUD }), rand({ stroke: '#8B6508', strokeWidth: d * 0.4 })] };
    case 'krijt':
      return { achter: [], voor: [rand({ stroke: kleur, strokeWidth: d * 1.4, dash: [d * 3, d * 0.6, d * 1.2, d * 0.5], lineCap: 'round', opacity: 0.85 }), rand({ x: d * 0.3, y: d * 0.2, stroke: kleur, strokeWidth: d * 0.6, opacity: 0.4 })] };
    case 'dubbel':
      return { achter: [], voor: [rand({ stroke: kleur, strokeWidth: d * 2.4 }), rand({ stroke: '#FFFFFF', strokeWidth: d * 0.8 })] };
    case 'schaduw':
      return { achter: [rand({ fill: '#FFFFFF', shadowColor: 'rgba(0,0,0,0.35)', shadowBlur: d * 3, shadowOffset: { x: d * 0.5, y: d } })], voor: [] };
    case 'golf': {
      const r = d * 1.2;
      const bollen = langsRand(w, h, r * 1.6).map((p) => new Konva.Circle({ ...stil, x: p.x, y: p.y, radius: r, fill: kleur }));
      return { achter: [new Konva.Rect({ ...stil, x: -r * 0.5, y: -r * 0.5, width: w + r, height: h + r, fill: kleur }), ...bollen], voor: [] };
    }
    case 'sterren': {
      const sterren = langsRand(w, h, d * 4).map((p) => new Konva.Star({ ...stil, x: p.x, y: p.y, numPoints: 5, innerRadius: d * 0.5, outerRadius: d * 1.1, fill: kleur }));
      return { achter: [], voor: sterren };
    }
  }
}
