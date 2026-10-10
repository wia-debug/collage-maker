import { writable, type Readable } from 'svelte/store';

let aan = true;
const teller = writable(0);
export const confetti: Readable<number> = { subscribe: teller.subscribe };

export function zetAnimatie(v: boolean): void { aan = v; }

export function magAnimeren(): boolean {
  if (!aan) return false;
  try { return !matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return true; }
}

export function vier(): void {
  if (magAnimeren()) teller.update((n) => n + 1);
}
