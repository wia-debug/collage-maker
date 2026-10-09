import type { Collage } from '../document/types';
import { leesCollage } from '../document/validatie';
import type { AssetStore } from '../assets/store';
import type { CollageDb } from './db';

export interface CollageSamenvatting { id: string; profielId: string; naam: string; gewijzigd: number; voorbeeld: string | null }

export function gebruikteAssets(c: Collage): string[] {
  const ids = new Set<string>();
  for (const e of c.elementen) if (e.type === 'foto' && e.assetId) ids.add(e.assetId);
  if (c.achtergrond.soort === 'foto') ids.add(c.achtergrond.assetId);
  return [...ids];
}

export async function bewaarCollage(db: CollageDb, c: Collage, assets: { blob(id: string): Blob | undefined }, voorbeeld?: string | null): Promise<void> {
  const nodig = gebruikteAssets(c);
  await db.transaction('rw', db.collages, db.assets, async () => {
    const bestaand = await db.collages.get(c.id);
    await db.collages.put({
      id: c.id, profielId: c.profielId ?? '', naam: c.naam, gewijzigd: c.gewijzigd, data: c,
      voorbeeld: voorbeeld === undefined ? bestaand?.voorbeeld ?? null : voorbeeld,
    });
    const sleutels = (await db.assets.where('collageId').equals(c.id).primaryKeys()) as [string, string][];
    const opgeslagen = new Set(sleutels.map((k) => k[1]));
    for (const id of nodig) {
      if (opgeslagen.has(id)) continue;
      const blob = assets.blob(id);
      if (blob) await db.assets.put({ collageId: c.id, id, blob });
    }
    const weg = [...opgeslagen].filter((id) => !nodig.includes(id)).map((id) => [c.id, id] as [string, string]);
    if (weg.length) await db.assets.bulkDelete(weg);
  });
}

export async function laadCollage(db: CollageDb, id: string): Promise<{ collage: Collage; blobs: Map<string, Blob> } | null> {
  const rij = await db.collages.get(id);
  if (!rij) return null;
  const assets = await db.assets.where('collageId').equals(id).toArray();
  return { collage: leesCollage(rij.data), blobs: new Map(assets.map((a) => [a.id, a.blob])) };
}

export async function lijstCollages(db: CollageDb, profielId: string | null): Promise<CollageSamenvatting[]> {
  const rijen = await db.collages.where('profielId').equals(profielId ?? '').toArray();
  return rijen
    .sort((a, b) => b.gewijzigd - a.gewijzigd)
    .map(({ id, profielId: p, naam, gewijzigd, voorbeeld }) => ({ id, profielId: p, naam, gewijzigd, voorbeeld }));
}

export async function wisCollages(db: CollageDb, ids: string[]): Promise<void> {
  if (!ids.length) return;
  await db.transaction('rw', db.collages, db.assets, async () => {
    await db.collages.bulkDelete(ids);
    for (const id of ids) await db.assets.where('collageId').equals(id).delete();
  });
}

export async function vulAssets(assets: AssetStore, blobs: Map<string, Blob>): Promise<void> {
  await Promise.all([...blobs].map(([id, b]) => assets.addBlob(b, id)));
}
