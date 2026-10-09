import Dexie, { type Table } from 'dexie';
import type { Collage } from '../document/types';
import type { Profiel } from './profielen';

export interface CollageRij { id: string; profielId: string; naam: string; gewijzigd: number; data: Collage; voorbeeld: string | null }
export interface AssetRij { collageId: string; id: string; blob: Blob }
export interface InstellingRij { sleutel: string; waarde: unknown }

export class CollageDb extends Dexie {
  collages!: Table<CollageRij, string>;
  assets!: Table<AssetRij, [string, string]>;
  profielen!: Table<Profiel, string>;
  instellingen!: Table<InstellingRij, string>;

  constructor(naam: string) {
    super(naam);
    this.version(1).stores({
      collages: 'id, profielId, gewijzigd',
      assets: '[collageId+id], collageId',
      profielen: 'id',
      instellingen: 'sleutel',
    });
  }
}

export const maakDb = (naam = 'collagemaker'): CollageDb => new CollageDb(naam);
export const db = maakDb();
