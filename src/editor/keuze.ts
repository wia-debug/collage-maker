import type { Element } from '../document/types';

type Patches = Record<string, Partial<Element>>;
const vrij = (els: Element[]) => els.filter((e) => !e.vergrendeld);

export function midden(els: Element[]): { x: number; y: number } {
  const xs = els.map((e) => e.x), ys = els.map((e) => e.y);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

/** Draait elk (niet vastgezet) element rond het midden van de keuze. */
export function draaiKeuze(els: Element[], graden: number): Patches {
  const m = midden(els), r = (graden * Math.PI) / 180, cos = Math.cos(r), sin = Math.sin(r);
  return Object.fromEntries(vrij(els).map((e) => {
    const dx = e.x - m.x, dy = e.y - m.y;
    return [e.id, { x: m.x + dx * cos - dy * sin, y: m.y + dx * sin + dy * cos, rotatie: (((e.rotatie + graden) % 360) + 360) % 360 }];
  }));
}

/** Spiegelt elk (niet vastgezet) element en zijn positie rond het midden van de keuze. */
export function spiegelKeuze(els: Element[]): Patches {
  const m = midden(els);
  return Object.fromEntries(vrij(els).map((e) => [e.id, { x: 2 * m.x - e.x, gespiegeld: !e.gespiegeld, rotatie: (360 - e.rotatie) % 360 }]));
}

export function schuifKeuze(els: Element[], dx: number, dy: number): Patches {
  return Object.fromEntries(vrij(els).map((e) => [e.id, { x: e.x + dx, y: e.y + dy }]));
}

/** De groeps-id als de keuze precies alle leden van één groep is, anders null. */
export function isEenGroep(keuze: Element[], alle: Element[]): string | null {
  const g = keuze[0]?.groep;
  if (!g || keuze.length < 2 || keuze.some((e) => e.groep !== g)) return null;
  return alle.filter((e) => e.groep === g).length === keuze.length ? g : null;
}
