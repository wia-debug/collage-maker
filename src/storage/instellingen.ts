import type { CollageDb } from './db';
import type { GehashteCode } from './hash';

export type Toestel = 'ipad' | 'chromebook' | 'pc';
export type CloudDelen = 'nooit' | 'kind' | 'leerkracht';
export interface Instellingen { toestel: Toestel | null; profielenAan: boolean; master: GehashteCode | null; cloudDelen: CloudDelen }

const STANDAARD: Instellingen = { toestel: null, profielenAan: false, master: null, cloudDelen: 'leerkracht' };

export async function leesInstellingen(db: CollageDb): Promise<Instellingen> {
  const r = await db.instellingen.get('app');
  return { ...STANDAARD, ...((r?.waarde as Partial<Instellingen> | undefined) ?? {}) };
}

export async function schrijfInstellingen(db: CollageDb, patch: Partial<Instellingen>): Promise<Instellingen> {
  const nieuw = { ...(await leesInstellingen(db)), ...patch };
  await db.instellingen.put({ sleutel: 'app', waarde: nieuw });
  return nieuw;
}

export const profielenActief = (i: Instellingen): boolean => i.toestel === 'ipad' || (i.toestel === 'pc' && i.profielenAan);
