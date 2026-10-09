import type { CollageDb } from './db';
import { maakHash } from './hash';
import { leesInstellingen, schrijfInstellingen, type Instellingen, type Toestel } from './instellingen';

interface E2eInstellingen { toestel: Toestel; profielenAan?: boolean; mastercode?: string }

async function zaaiE2e(db: CollageDb): Promise<void> {
  (window as unknown as { __opslag: unknown }).__opslag = { db };
  const cfg = (window as unknown as { __e2eInstellingen?: E2eInstellingen }).__e2eInstellingen;
  if (!cfg) return;
  if ((await leesInstellingen(db)).master) return;
  await schrijfInstellingen(db, { toestel: cfg.toestel, profielenAan: cfg.profielenAan ?? false, master: await maakHash(cfg.mastercode ?? '123456', 1000) });
}

export async function opstart(db: CollageDb): Promise<Instellingen> {
  if (import.meta.env.MODE === 'e2e') await zaaiE2e(db);
  return leesInstellingen(db);
}

export async function wisAlles(db: CollageDb): Promise<void> {
  await db.delete();
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('collage-tours-gezien')) localStorage.removeItem(k);
  } catch { /* opslag geblokkeerd */ }
}
