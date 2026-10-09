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

const TYPES = new Set(['foto', 'tekst', 'sticker', 'vorm', 'tekening']);
const ACHTERGRONDEN = new Set(['kleur', 'verloop', 'patroon', 'foto']);
const GETALLEN = ['x', 'y', 'breedte', 'hoogte', 'rotatie', 'schaalX', 'schaalY'];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isGetal = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function leesCollage(data: unknown): Collage {
  if (!isObj(data) || !isGetal(data.versie)) throw new CollageFout('ongeldig');
  if (data.versie > SCHEMA_VERSIE) throw new CollageFout('nieuwer');
  let c: Record<string, unknown> = data;
  for (let v = data.versie; v < SCHEMA_VERSIE; v++) {
    const m = MIGRATIES[v];
    if (!m) throw new CollageFout('ongeldig');
    c = { ...m(c), versie: v + 1 };
  }
  const geldigeBasis =
    typeof c.id === 'string' && typeof c.naam === 'string' &&
    typeof c.formaat === 'string' && c.formaat in FORMATEN &&
    isObj(c.achtergrond) && ACHTERGRONDEN.has(c.achtergrond.soort as string) &&
    Array.isArray(c.elementen);
  if (!geldigeBasis) throw new CollageFout('ongeldig');
  for (const e of c.elementen as unknown[]) {
    if (!isObj(e) || typeof e.id !== 'string' || !TYPES.has(e.type as string) || !GETALLEN.every((k) => isGetal(e[k]))) {
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
