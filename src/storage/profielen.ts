import type { CollageDb } from './db';
import { controleerCode, maakHash, type GehashteCode } from './hash';
import { nieuwId } from '../document/create';
import { wisCollages } from './collages';

export interface Profiel { id: string; naam: string; symbool: string; kleur: string; pin: GehashteCode; aangemaakt: number; laatstGebruikt: number }

export const PROFIEL_SYMBOLEN = ['paw-print', 'rocket', 'soccer-ball', 'leaf', 'cake', 'tree', 'pizza', 'car', 'star', 'heart', 'cloud', 'drop'];
export const PIN_SYMBOLEN = ['star', 'heart', 'cloud', 'drop', 'leaf', 'rocket', 'cake', 'car', 'pizza'];
export const PIN_LENGTE = 3;
export const SYMBOOL_NAMEN: Record<string, string> = {
  star: 'ster', heart: 'hart', cloud: 'wolk', drop: 'druppel', leaf: 'blad', rocket: 'raket',
  cake: 'taart', car: 'auto', pizza: 'pizza', 'paw-print': 'pootje', 'soccer-ball': 'voetbal', tree: 'boom',
};
const PIN_ITERATIES = 20_000;

const pinTekst = (pin: string[]): string => pin.join('|');

export async function maakProfiel(db: CollageDb, p: { naam: string; symbool: string; kleur: string; pin: string[] }): Promise<Profiel> {
  const nu = Date.now();
  const profiel: Profiel = { id: nieuwId(), naam: p.naam.trim(), symbool: p.symbool, kleur: p.kleur, pin: await maakHash(pinTekst(p.pin), PIN_ITERATIES), aangemaakt: nu, laatstGebruikt: nu };
  await db.profielen.put(profiel);
  return profiel;
}

export async function lijstProfielen(db: CollageDb): Promise<Profiel[]> {
  return (await db.profielen.toArray()).sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));
}

export async function controleerPin(db: CollageDb, id: string, pin: string[]): Promise<boolean> {
  const p = await db.profielen.get(id);
  if (!p || !(await controleerCode(pinTekst(pin), p.pin))) return false;
  try { await db.profielen.update(id, { laatstGebruikt: Date.now() }); } catch { /* best-effort: een goede code blijft goed */ }
  return true;
}

export async function zetPin(db: CollageDb, id: string, pin: string[]): Promise<void> {
  await db.profielen.update(id, { pin: await maakHash(pinTekst(pin), PIN_ITERATIES) });
}

export async function wisProfiel(db: CollageDb, id: string): Promise<void> {
  const ids = (await db.collages.where('profielId').equals(id).primaryKeys()) as string[];
  await wisCollages(db, ids);
  await db.profielen.delete(id);
}
