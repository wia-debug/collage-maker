import { writable } from 'svelte/store';

export interface Melding { id: number; tekst: string; icoon: 'info' | 'warning' | 'check-circle' }

let teller = 0;
export const meldingen = writable<Melding[]>([]);

export function toon(tekst: string, icoon: Melding['icoon'] = 'info'): void {
  const id = ++teller;
  meldingen.update((m) => [...m, { id, tekst, icoon }]);
  setTimeout(() => meldingen.update((m) => m.filter((x) => x.id !== id)), 4500);
}
