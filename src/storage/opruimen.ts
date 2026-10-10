import type { CollageDb } from './db';
import type { Profiel } from './profielen';
import { lijstCollages, wisCollages, type CollageSamenvatting } from './collages';

export const DAG = 86_400_000;

export function beoordeelCollages(rijen: { id: string; gewijzigd: number }[], nu: number): { vragen: string[]; wissen: string[] } {
  const vragen: string[] = [], wissen: string[] = [];
  for (const r of rijen) {
    const leeftijd = nu - r.gewijzigd;
    if (leeftijd > 60 * DAG) wissen.push(r.id);
    else if (leeftijd > 30 * DAG) vragen.push(r.id);
  }
  return { vragen, wissen };
}

export function oudeProfielen(profielen: Profiel[], profielenMetCollages: Set<string>, nu: number): string[] {
  return profielen.filter((p) => !profielenMetCollages.has(p.id) && nu - p.laatstGebruikt > 60 * DAG).map((p) => p.id);
}

export async function ruimAutomatischOp(db: CollageDb, nu = Date.now()): Promise<void> {
  const rijen = await db.collages.toArray();
  await wisCollages(db, beoordeelCollages(rijen, nu).wissen);
  const over = await db.collages.toArray();
  const weg = oudeProfielen(await db.profielen.toArray(), new Set(over.map((r) => r.profielId)), nu);
  if (weg.length) await db.profielen.bulkDelete(weg);
  const grens = nu - 60 * DAG;
  await db.eigenStickers.where('gebruikt').below(grens).delete();
  await db.inzendingen.where('ontvangen').below(grens).delete();
}

export async function teVragen(db: CollageDb, profielId: string | null, nu = Date.now()): Promise<CollageSamenvatting[]> {
  const lijst = await lijstCollages(db, profielId);
  const { vragen } = beoordeelCollages(lijst, nu);
  return lijst.filter((c) => vragen.includes(c.id));
}
