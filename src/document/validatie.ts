import { FORMATEN } from './formats';
import { SCHEMA_VERSIE, type Collage } from './types';

export class CollageFout extends Error {
  constructor(public code: 'ongeldig' | 'nieuwer') { super(code); }
}

export const FOUTTEKST_BESTAND: Record<CollageFout['code'], string> = {
  ongeldig: 'Dit bestand kan ik niet openen.',
  nieuwer: 'Dit bestand is gemaakt met een nieuwere versie.',
};

// Sleutel n: migratie van versie n naar n + 1. Leeg zolang SCHEMA_VERSIE 1 is.
export const MIGRATIES: Record<number, (c: Record<string, unknown>) => Record<string, unknown>> = {};

const GETALLEN = ['x', 'y', 'breedte', 'hoogte', 'rotatie', 'schaalX', 'schaalY'];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isGetal = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

type Controle = (v: unknown) => boolean;
const isTekst: Controle = (v) => typeof v === 'string';
const isBool: Controle = (v) => typeof v === 'boolean';
const isTekstOfNull: Controle = (v) => v === null || typeof v === 'string';
const isGetalLijst: Controle = (v) => Array.isArray(v) && v.every(isGetal);
const isGetalOfAfwezig: Controle = (v) => v === undefined || isGetal(v);
const isUitsnede: Controle = (v) => v === null || (isObj(v) && ['x', 'y', 'breedte', 'hoogte'].every((k) => isGetal(v[k])));
const isKader: Controle = (v) => isObj(v) && isTekst(v.stijl) && isTekst(v.kleur) && (v.motief === undefined || isTekst(v.motief));

// Per elementtype / achtergrondsoort: veld -> controle.
const ELEMENT_VELDEN: Record<string, Record<string, Controle>> = {
  foto: { assetId: isTekstOfNull, uitsnede: isUitsnede, masker: isTekst, kader: isKader, filter: isTekst, helderheid: isGetal, contrast: isGetal },
  tekst: { tekst: isTekst, lettertype: isTekst, kleur: isTekst, grootte: isGetal },
  sticker: { sticker: isTekst, kleur: isTekst, doorzichtigheid: isGetalOfAfwezig },
  vorm: { vorm: isTekst, randDikte: isGetal, doorzichtigheid: isGetal },
  tekening: { gereedschap: isTekst, kleur: isTekst, dikte: isGetal, punten: isGetalLijst },
};
const ACHTERGROND_VELDEN: Record<string, Record<string, Controle>> = {
  kleur: { kleur: isTekst },
  verloop: { van: isTekst, naar: isTekst, hoek: isGetal },
  patroon: { patroon: isTekst, kleur: isTekst, achtergrondkleur: isTekst },
  foto: { assetId: isTekst },
};
const velden = (o: Record<string, unknown>, tabel: Record<string, Record<string, Controle>>, sleutel: unknown): boolean =>
  typeof sleutel === 'string' && Object.hasOwn(tabel, sleutel) && Object.entries(tabel[sleutel]).every(([k, ok]) => ok(o[k]));

export function leesCollage(data: unknown): Collage {
  if (!isObj(data) || !isGetal(data.versie)) throw new CollageFout('ongeldig');
  if (data.versie > SCHEMA_VERSIE) throw new CollageFout('nieuwer');
  let c: Record<string, unknown> = data;
  for (let v = data.versie; v < SCHEMA_VERSIE; v++) {
    const m = MIGRATIES[v];
    if (!m) throw new CollageFout('ongeldig');
    try {
      c = { ...m(c), versie: v + 1 };
    } catch {
      throw new CollageFout('ongeldig');
    }
  }
  const geldigeBasis =
    typeof c.id === 'string' && typeof c.naam === 'string' &&
    typeof c.formaat === 'string' && Object.hasOwn(FORMATEN, c.formaat) &&
    isObj(c.achtergrond) && velden(c.achtergrond, ACHTERGROND_VELDEN, c.achtergrond.soort) &&
    Array.isArray(c.elementen);
  if (!geldigeBasis) throw new CollageFout('ongeldig');
  for (const e of c.elementen as unknown[]) {
    if (
      !isObj(e) || typeof e.id !== 'string' || !GETALLEN.every((k) => isGetal(e[k])) ||
      !isBool(e.gespiegeld) || !isBool(e.vergrendeld) || !velden(e, ELEMENT_VELDEN, e.type)
    ) {
      throw new CollageFout('ongeldig');
    }
  }
  const nu = Date.now();
  return {
    ...c,
    profielId: typeof c.profielId === 'string' ? c.profielId : null,
    aangemaakt: isGetal(c.aangemaakt) ? c.aangemaakt : nu,
    gewijzigd: isGetal(c.gewijzigd) ? c.gewijzigd : nu,
  } as Collage;
}
