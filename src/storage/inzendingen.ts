import JSZip from 'jszip';
import type { CollageDb, InzendingRij } from './db';
import { vanBestand } from './bestand';
import { nieuwId } from '../document/create';

async function voorbeeldUit(pakket: Blob): Promise<Blob | null> {
  try {
    const f = (await JSZip.loadAsync(pakket)).file('voorbeeld.png');
    return f ? new Blob([await f.async('arraybuffer')], { type: 'image/png' }) : null;
  } catch { return null; }
}

export async function bewaarInzending(db: CollageDb, naam: string, pakket: Blob, nu = Date.now()): Promise<InzendingRij> {
  await vanBestand(pakket);
  const rij: InzendingRij = { id: nieuwId(), naam, ontvangen: nu, bestand: pakket, voorbeeld: await voorbeeldUit(pakket) };
  await db.inzendingen.put(rij);
  return rij;
}

export async function lijstInzendingen(db: CollageDb): Promise<InzendingRij[]> {
  return db.inzendingen.orderBy('ontvangen').reverse().toArray();
}

export async function wisInzending(db: CollageDb, id: string): Promise<void> { await db.inzendingen.delete(id); }
export async function wisAlleInzendingen(db: CollageDb): Promise<void> { await db.inzendingen.clear(); }
