import type { CollageDb } from './db';

/** Sluit en wist een testdatabase. De verbinding krijgt eerst een macrotaak om echt te sluiten, anders meldt Dexie "Dexie.delete(...) was blocked". */
export async function ruimTestDbOp(db: CollageDb): Promise<void> {
  db.close();
  await new Promise((r) => setTimeout(r, 0));
  await db.delete();
}
