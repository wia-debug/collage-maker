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
