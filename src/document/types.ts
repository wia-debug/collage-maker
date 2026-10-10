export const SCHEMA_VERSIE = 1;

export type Formaat = 'vierkant' | 'a4-liggend' | 'a4-staand' | 'poster';
export type Pad = 'rechthoek' | 'rond' | 'hart' | 'ster' | 'wolk' | 'blob' | 'driehoek' | 'pijl' | 'ruit' | 'vijfhoek' | 'zeshoek';
export type Masker = 'rechthoek' | 'rond' | 'hart' | 'ster' | 'wolk' | 'blob';
export type KaderStijl = 'geen' | 'effen' | 'polaroid' | 'plakband' | 'plakband-boven' | 'plakband-hoeken' | 'gescheurd' | 'stippen' | 'film' | 'goud' | 'krijt' | 'dubbel' | 'schaduw' | 'golf' | 'sterren';
export type PlakbandMotief = 'effen' | 'sterren' | 'strepen' | 'hartjes' | 'bolletjes';
export type FilterNaam = 'normaal' | 'zwartwit' | 'sepia' | 'warm' | 'koel' | 'vrolijk' | 'vervaagd' | 'pixel' | 'strip' | 'negatief';
export type Patroon = 'stippen' | 'strepen' | 'ruitjes' | 'sterren' | 'papier' | 'karton' | 'golfjes' | 'zigzag' | 'hartjes';

export type Achtergrond =
  | { soort: 'kleur'; kleur: string }
  | { soort: 'verloop'; van: string; naar: string; hoek: number }
  | { soort: 'patroon'; patroon: Patroon; kleur: string; achtergrondkleur: string }
  | { soort: 'foto'; assetId: string };

export interface Basis {
  id: string;
  x: number;
  y: number;
  breedte: number;
  hoogte: number;
  rotatie: number;
  schaalX: number;
  schaalY: number;
  gespiegeld: boolean;
  vergrendeld: boolean;
}

export interface Uitsnede { x: number; y: number; breedte: number; hoogte: number }

export interface FotoElement extends Basis {
  type: 'foto';
  assetId: string | null;
  uitsnede: Uitsnede | null;
  masker: Masker;
  kader: { stijl: KaderStijl; kleur: string; motief?: PlakbandMotief };
  filter: FilterNaam;
  helderheid: number; // -100..100
  contrast: number; // -100..100
}

export interface Omlijning { kleur: string; dikte: number }
export type WordArtVorm = 'recht' | 'boog-omhoog' | 'boog-omlaag' | 'cirkel' | 'golf';

export interface WordArt {
  vorm: WordArtVorm;
  vulling: { soort: 'kleur' | 'verloop' | 'regenboog'; kleuren: string[] };
  omlijning: Omlijning | null;
  tweedeOmlijning: Omlijning | null;
  effect: 'geen' | '3d' | 'neon' | 'schaduw';
}

export interface TekstElement extends Basis {
  type: 'tekst';
  tekst: string;
  lettertype: string;
  grootte: number;
  kleur: string;
  vet: boolean;
  schuin: boolean;
  uitlijning: 'left' | 'center' | 'right';
  regelafstand: number;
  omlijning: Omlijning | null;
  schaduw: boolean;
  ballon: string | null;
  wordart: WordArt | null;
}

export interface StickerElement extends Basis { type: 'sticker'; sticker: string; kleur: string; doorzichtigheid?: number /* 0.1..1, afwezig = 1 */ }

export interface VormElement extends Basis {
  type: 'vorm';
  vorm: Pad | 'lijn';
  vulling: string | null;
  rand: string | null;
  randDikte: number;
  doorzichtigheid: number; // 0..1
}

export type TekenGereedschap = 'pen' | 'stift' | 'krijt';

export interface TekeningElement extends Basis {
  type: 'tekening';
  gereedschap: TekenGereedschap;
  punten: number[]; // relatief t.o.v. linkerbovenhoek van het element
  kleur: string;
  dikte: number;
}

export type Element = FotoElement | TekstElement | StickerElement | VormElement | TekeningElement;
export type ElementType = Element['type'];

export interface Collage {
  id: string;
  versie: number;
  naam: string;
  profielId: string | null;
  formaat: Formaat;
  achtergrond: Achtergrond;
  elementen: Element[];
  aangemaakt: number;
  gewijzigd: number;
}
