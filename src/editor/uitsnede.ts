import type { Uitsnede } from '../document/types';

export function dekUitsnede(bronB: number, bronH: number, doelB: number, doelH: number): Uitsnede {
  const doel = doelB / doelH;
  if (bronB / bronH > doel) {
    const b = bronH * doel;
    return { x: (bronB - b) / 2, y: 0, breedte: b, hoogte: bronH };
  }
  const h = bronB / doel;
  return { x: 0, y: (bronH - h) / 2, breedte: bronB, hoogte: h };
}

export type Verhouding = 'vrij' | '1:1' | '4:3' | '16:9';
export const VERHOUDINGEN: Verhouding[] = ['vrij', '1:1', '4:3', '16:9'];

export function verhoudingGetal(v: Verhouding): number | null {
  if (v === 'vrij') return null;
  const [a, b] = v.split(':').map(Number);
  return a / b;
}

export function pasVerhoudingToe(ratio: number, bron: { breedte: number; hoogte: number }): Uitsnede {
  let breedte = bron.breedte, hoogte = breedte / ratio;
  if (hoogte > bron.hoogte) { hoogte = bron.hoogte; breedte = hoogte * ratio; }
  return { x: (bron.breedte - breedte) / 2, y: (bron.hoogte - hoogte) / 2, breedte, hoogte };
}

export function klemUitsnede(r: Uitsnede, bron: { breedte: number; hoogte: number }): Uitsnede {
  const breedte = Math.min(bron.breedte, Math.max(20, r.breedte));
  const hoogte = Math.min(bron.hoogte, Math.max(20, r.hoogte));
  return {
    x: Math.min(bron.breedte - breedte, Math.max(0, r.x)),
    y: Math.min(bron.hoogte - hoogte, Math.max(0, r.y)),
    breedte, hoogte,
  };
}

// Grootste uitsnede met de verhouding doelB:doelH binnen de bron, gecentreerd op het midden van de huidige uitsnede.
export function herUitsnede(huidig: Uitsnede | null, bron: { breedte: number; hoogte: number }, doelB: number, doelH: number): Uitsnede {
  const ratio = doelB / doelH;
  const breedte = Math.min(bron.breedte, bron.hoogte * ratio);
  const hoogte = breedte / ratio;
  const cx = huidig ? huidig.x + huidig.breedte / 2 : bron.breedte / 2;
  const cy = huidig ? huidig.y + huidig.hoogte / 2 : bron.hoogte / 2;
  return {
    x: Math.min(bron.breedte - breedte, Math.max(0, cx - breedte / 2)),
    y: Math.min(bron.hoogte - hoogte, Math.max(0, cy - hoogte / 2)),
    breedte, hoogte,
  };
}
