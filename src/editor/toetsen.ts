export type Actie =
  | { soort: 'ongedaan' } | { soort: 'opnieuw' } | { soort: 'wissen' } | { soort: 'kopie' } | { soort: 'deselecteer' }
  | { soort: 'schuif'; dx: number; dy: number };

export function toetsNaarActie(e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey'>): Actie | null {
  const mod = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();
  if (mod && k === 'z') return e.shiftKey ? { soort: 'opnieuw' } : { soort: 'ongedaan' };
  if (mod && k === 'y') return { soort: 'opnieuw' };
  if (mod && k === 'd') return { soort: 'kopie' };
  if (mod) return null;
  if (k === 'delete' || k === 'backspace') return { soort: 'wissen' };
  if (k === 'escape') return { soort: 'deselecteer' };
  const stap = e.shiftKey ? 20 : 5;
  const pijlen: Record<string, [number, number]> = { arrowleft: [-stap, 0], arrowright: [stap, 0], arrowup: [0, -stap], arrowdown: [0, stap] };
  const p = pijlen[k];
  return p ? { soort: 'schuif', dx: p[0], dy: p[1] } : null;
}
