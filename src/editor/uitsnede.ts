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

// Nieuwe uitsnede voor een foto die naar doelB x doelH wordt geschaald.
// - Zelfde verhouding als de huidige uitsnede (marge 1e-3): ongewijzigd (draaien, evenredig schalen).
// - Andere verhouding: houdt de OPPERVLAKTE van de huidige uitsnede (zoomniveau), gecentreerd op het midden
//   ervan, en krimpt alleen als dat nodig is om binnen de bron te passen.
// - Zonder huidige uitsnede telt de hele bron als huidige uitsnede.
// - Ongeldige verhouding (niet eindig of <= 0): huidige (of hele) uitsnede ongewijzigd.
export function herUitsnede(huidig: Uitsnede | null, bron: { breedte: number; hoogte: number }, doelB: number, doelH: number): Uitsnede {
  const basis: Uitsnede = huidig ?? { x: 0, y: 0, breedte: bron.breedte, hoogte: bron.hoogte };
  const ratio = doelB / doelH;
  if (!Number.isFinite(ratio) || ratio <= 0) return basis;
  if (Math.abs(basis.breedte / basis.hoogte - ratio) < 1e-3) return basis;
  const oppervlakte = basis.breedte * basis.hoogte;
  let breedte = Math.sqrt(oppervlakte * ratio);
  let hoogte = breedte / ratio;
  const krimp = Math.min(1, bron.breedte / breedte, bron.hoogte / hoogte);
  breedte *= krimp;
  hoogte *= krimp;
  const cx = basis.x + basis.breedte / 2, cy = basis.y + basis.hoogte / 2;
  return {
    x: Math.min(bron.breedte - breedte, Math.max(0, cx - breedte / 2)),
    y: Math.min(bron.hoogte - hoogte, Math.max(0, cy - hoogte / 2)),
    breedte, hoogte,
  };
}
