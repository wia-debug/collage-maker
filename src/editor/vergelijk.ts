import type { Element } from '../document/types';

const TRANSFORM = new Set(['x', 'y', 'rotatie', 'schaalX', 'schaalY', 'gespiegeld', 'vergrendeld']);

/** True als a en b alleen verschillen in transformatie-velden (geen nieuwe render nodig). */
export function alleenTransform(a: Element, b: Element): boolean {
  const ra = a as unknown as Record<string, unknown>, rb = b as unknown as Record<string, unknown>;
  const sleutels = new Set([...Object.keys(ra), ...Object.keys(rb)]);
  for (const k of sleutels) {
    if (TRANSFORM.has(k)) continue;
    if (ra[k] !== rb[k]) return false;
  }
  return true;
}
