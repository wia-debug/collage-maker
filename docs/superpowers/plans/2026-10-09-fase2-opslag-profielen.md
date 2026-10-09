# Collagemaker fase 2 — opslag en profielen — uitvoeringsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collages blijven bewaard (automatisch in IndexedDB, of als `.collage`-bestand op Chromebook), met een leerkracht-mastercode, een toesteltype, kindprofielen met een symbool-pincode, een lijst "Mijn collages" en automatisch opruimen van oude collages.

**Architecture:** Een nieuwe module `src/storage/` bevat alle opslaglogica als losse functies die een `CollageDb` (Dexie) als eerste parameter krijgen, zodat tests elk hun eigen database gebruiken. `App.svelte` wordt een kleine toestandsmachine (laden → eerste start → profielkeuze → startscherm → editor). De editor bewaart automatisch via een debounced `startAutosave` die op de bestaande editor-store luistert. Het `.collage`-bestand is een ZIP (JSZip) met `collage.json`, de gebruikte afbeeldingen en een voorbeeld; inlezen gaat altijd via `leesCollage` (validatie + migraties).

**Tech Stack:** bestaand (Vite, Svelte 5, TypeScript, Konva, Vitest browsermodus, Playwright) + Dexie 4, JSZip 3, @noble/hashes (PBKDF2 in puur JavaScript).

**Spec:** `docs/superpowers/specs/2026-10-08-kids-collage-design.md` — fase 2 = sectie 12 punt 2; details in secties 1 (toestellen), 4 (datamodel), 5 (startscherm, rondleiding), 6 (automatisch bewaren), 7 (profielen, leerkracht, opruimen), 10 (foutafhandeling), 11 (testen).

## Global Constraints

- Alle constraints van fase 1 blijven gelden: nooit emoji, interface in het Nederlands, knoppen minimaal 56 px, iPadOS 16+ Safari / ChromeOS Chrome 110+ / recente desktopbrowsers, volledig offline, geen netwerkverzoeken behalve een gesleepte afbeeldings-URL.
- Geen gegevens verlaten het toestel in fase 2. Geen accounts, geen login op een server.
- Opslag: IndexedDB via Dexie. Database-naam in de app: `collagemaker`. Elke opslagfunctie krijgt de database als eerste parameter (tests gebruiken een eigen naam).
- De app moet ook werken zonder "secure context" (iPad via `http://<ip>` tijdens testen): gebruik nooit `crypto.randomUUID` of `crypto.subtle` direct. Id's via `nieuwId()`, hashing via `@noble/hashes`.
- Leerkracht-mastercode: 6 cijfers, bewaard als PBKDF2-SHA-256-hash met willekeurige salt. Kind-pincode: 3 symbolen uit 9, ook als hash. De pincode is geen echte beveiliging (spec 7).
- Toesteltype wordt nooit geraden uit de browser; de leerkracht kiest bij de eerste start: `ipad` (profielen), `chromebook` (bewaren als bestand) of `pc` (profielen optioneel).
- Opruimen (niet op Chromebook): collage ouder dan 30 dagen (op basis van `gewijzigd`) → vraag; ouder dan 60 dagen → automatisch wissen; profielen zonder collages en 60 dagen niet gebruikt → wissen.
- `.collage`-bestand = ZIP met `collage.json`, map `assets/` (bestandsnaam = assetId) en `voorbeeld.png`. Inlezen controleert `versie`: hoger dan `SCHEMA_VERSIE` → melding "Dit bestand is gemaakt met een nieuwere versie."
- Elk e2e-bestand importeert `test` en `expect` uit `e2e/helpers.ts` (behalve tests die bewust zonder voorinstellingen starten; die zeggen dat expliciet).

## Review Focus

1. **Herladen, crash of tab sluiten midden in een collage (iPad/PC):** bij opnieuw openen staat de collage in "Mijn collages" met de laatste wijziging (hooguit ~1 seconde verloren). Test: Task 9 (e2e herladen).
2. **Een kapot, vreemd of nieuwer `.collage`-bestand openen:** vriendelijke melding, de app blijft werken, er wordt niets half geopend. Test: Task 4 (unit) en Task 10 (e2e).
3. **Opslag vol (QuotaExceededError) tijdens automatisch bewaren:** precies één vriendelijke melding, verder werken kan, volgende bewaarpogingen gaan door. Test: Task 6.
4. **Verkeerde pincode of twee verschillende mastercodes:** duidelijke melding, geen toegang, geen blokkering. Test: Task 7 en Task 8 (e2e).
5. **Twee profielen op één iPad:** zien elkaars collages niet; een profiel wissen wist alleen diens collages. Test: Task 5 (unit) en Task 8 (e2e).

---

## Bestandsstructuur

```
src/storage/db.ts            CollageDb (Dexie-schema), maakDb, db (singleton)
src/storage/hash.ts          maakHash, controleerCode (PBKDF2 via @noble/hashes)
src/storage/instellingen.ts  Instellingen, Toestel, lees/schrijf, profielenActief
src/storage/collages.ts      gebruikteAssets, bewaar/laad/lijst/wis collages, vulAssets
src/storage/bestand.ts       naarBestand, vanBestand (.collage)
src/storage/profielen.ts     Profiel, symbolen, maak/lijst/controleerPin/zetPin/wisProfiel
src/storage/opruimen.ts      beoordeelCollages, oudeProfielen, ruimAutomatischOp, teVragen
src/storage/autosave.ts      startAutosave, isVolFout
src/storage/herinnering.ts   startHerinnering
src/storage/opstart.ts       opstart (e2e-voorinstellingen, persist, opruimen), wisAlles
src/document/validatie.ts    CollageFout, leesCollage, FOUTTEKST_BESTAND
src/ui/CijferCode.svelte     cijfertoetsen voor de mastercode
src/ui/SymboolCode.svelte    symbooltoetsen voor de kind-pincode
src/ui/EersteStart.svelte    eerste opstart: mastercode + toesteltype
src/ui/ProfielKiezer.svelte  profieltegels + pincode
src/ui/NieuwProfiel.svelte   naam, symbool, kleur, pincode
src/ui/MijnCollages.svelte   lijst bewaarde collages
src/ui/LeerkrachtMenu.svelte leerkrachtinstellingen
src/ui/OpruimDialoog.svelte  "Deze oude collages wissen?"
```

---

### Task 1: Opslagbasis — Dexie-schema, instellingen, hashing, id zonder secure context

**Files:**
- Create: `src/storage/db.ts`, `src/storage/hash.ts`, `src/storage/instellingen.ts`, `src/storage/db.test.ts`, `src/document/id.test.ts`
- Modify: `src/document/create.ts` (nieuwId), `src/assets/icon-names.json`, `package.json` (via npm install)

**Interfaces:**
- Produces:
  - `uuidUitBytes(b: Uint8Array): string`, `nieuwId(): string` (in `create.ts`)
  - `class CollageDb extends Dexie` met tabellen `collages: Table<CollageRij, string>`, `assets: Table<AssetRij, [string, string]>`, `profielen: Table<Profiel, string>`, `instellingen: Table<InstellingRij, string>`
  - `interface CollageRij { id: string; profielId: string; naam: string; gewijzigd: number; data: Collage; voorbeeld: string | null }` — `profielId` is `''` als er geen profiel is (IndexedDB kan `null` niet indexeren)
  - `interface AssetRij { collageId: string; id: string; blob: Blob }`
  - `maakDb(naam?: string): CollageDb`, `db: CollageDb`
  - `interface GehashteCode { salt: string; hash: string; iteraties: number }`
  - `maakHash(geheim: string, iteraties?: number): Promise<GehashteCode>`, `controleerCode(geheim: string, h: GehashteCode): Promise<boolean>`
  - `type Toestel = 'ipad' | 'chromebook' | 'pc'`
  - `interface Instellingen { toestel: Toestel | null; profielenAan: boolean; master: GehashteCode | null }`
  - `leesInstellingen(db): Promise<Instellingen>`, `schrijfInstellingen(db, patch: Partial<Instellingen>): Promise<Instellingen>`, `profielenActief(i: Instellingen): boolean`
  - `interface Profiel` wordt in Task 5 gedefinieerd; in deze taak typeert `db.ts` de tabel met een type-import uit `./profielen` — maak daarom in deze taak `src/storage/profielen.ts` aan met alleen de interface (Task 5 vult het bestand aan):
    ```ts
    import type { GehashteCode } from './hash';
    export interface Profiel { id: string; naam: string; symbool: string; kleur: string; pin: GehashteCode; aangemaakt: number; laatstGebruikt: number }
    ```

- [ ] **Step 1: Afhankelijkheden en iconen**

Run:
```bash
npm install dexie jszip @noble/hashes
```
Voeg aan `src/assets/icon-names.json` (aan het einde van de lijst) toe: `"floppy-disk", "folder-open", "users", "gear", "backspace", "desktop", "device-tablet", "laptop", "user-plus"`. Run `npm run assets` (moet slagen; ontbrekende namen vervangen door een bestaand Phosphor-icoon met dezelfde betekenis en elke verwijzing in dit plan mee aanpassen).

- [ ] **Step 2: Failing tests schrijven**

`src/document/id.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { nieuwId, uuidUitBytes } from './create';

describe('id', () => {
  it('uuidUitBytes maakt een geldige v4-uuid', () => {
    const u = uuidUitBytes(new Uint8Array(16).fill(255));
    expect(u).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  it('nieuwId is uniek', () => {
    expect(new Set(Array.from({ length: 200 }, nieuwId)).size).toBe(200);
  });
});
```

`src/storage/db.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { maakDb, type CollageDb } from './db';
import { controleerCode, maakHash } from './hash';
import { leesInstellingen, profielenActief, schrijfInstellingen } from './instellingen';
import { nieuwId } from '../document/create';

let db: CollageDb;
beforeEach(() => { db = maakDb(`test-${nieuwId()}`); });
afterEach(async () => { await db.delete(); });

describe('hash', () => {
  it('controleert de juiste code en weigert een andere', async () => {
    const h = await maakHash('123456', 1000);
    expect(h.iteraties).toBe(1000);
    expect(await controleerCode('123456', h)).toBe(true);
    expect(await controleerCode('123457', h)).toBe(false);
  });
  it('gebruikt elke keer een andere salt', async () => {
    const a = await maakHash('x', 1000), b = await maakHash('x', 1000);
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });
});

describe('instellingen', () => {
  it('standaard leeg', async () => {
    expect(await leesInstellingen(db)).toEqual({ toestel: null, profielenAan: false, master: null });
  });
  it('schrijven voegt samen en blijft bewaard', async () => {
    await schrijfInstellingen(db, { toestel: 'pc' });
    await schrijfInstellingen(db, { profielenAan: true });
    const i = await leesInstellingen(db);
    expect(i).toMatchObject({ toestel: 'pc', profielenAan: true });
  });
  it('profielenActief: iPad altijd, pc alleen als aan, chromebook nooit', () => {
    const basis = { master: null, profielenAan: false };
    expect(profielenActief({ ...basis, toestel: 'ipad' })).toBe(true);
    expect(profielenActief({ ...basis, toestel: 'pc' })).toBe(false);
    expect(profielenActief({ ...basis, toestel: 'pc', profielenAan: true })).toBe(true);
    expect(profielenActief({ ...basis, toestel: 'chromebook', profielenAan: true })).toBe(false);
  });
});

describe('schema', () => {
  it('heeft de vier tabellen', async () => {
    await db.open();
    expect(db.tables.map((t) => t.name).sort()).toEqual(['assets', 'collages', 'instellingen', 'profielen']);
  });
});
```

- [ ] **Step 3: Run tests — moeten falen**

Run: `npx vitest run src/storage src/document/id.test.ts`
Expected: FAIL — `uuidUitBytes` niet geëxporteerd en `./db` niet gevonden.

- [ ] **Step 4: Implementatie**

In `src/document/create.ts`, vervang de regel `export const nieuwId = ...` door:
```ts
export function uuidUitBytes(b: Uint8Array): string {
  const c = Uint8Array.from(b);
  c[6] = (c[6] & 0x0f) | 0x40;
  c[8] = (c[8] & 0x3f) | 0x80;
  const h = [...c].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// crypto.randomUUID bestaat alleen in een "secure context" (https of localhost); getRandomValues overal.
export const nieuwId = (): string => uuidUitBytes(crypto.getRandomValues(new Uint8Array(16)));
```

`src/storage/hash.ts`:
```ts
import { pbkdf2Async } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha2';

export interface GehashteCode { salt: string; hash: string; iteraties: number }

const naarB64 = (b: Uint8Array): string => btoa(String.fromCharCode(...b));
const uitB64 = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function afleiden(geheim: string, salt: Uint8Array, iteraties: number): Promise<string> {
  return naarB64(await pbkdf2Async(sha256, new TextEncoder().encode(geheim), salt, { c: iteraties, dkLen: 32 }));
}

export async function maakHash(geheim: string, iteraties = 100_000): Promise<GehashteCode> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: naarB64(salt), hash: await afleiden(geheim, salt, iteraties), iteraties };
}

export async function controleerCode(geheim: string, h: GehashteCode): Promise<boolean> {
  return (await afleiden(geheim, uitB64(h.salt), h.iteraties)) === h.hash;
}
```
(Als `@noble/hashes` in de geïnstalleerde versie andere importpaden heeft, bv. `@noble/hashes/pbkdf2.js` en `@noble/hashes/sha2.js`, gebruik die en noteer het.)

`src/storage/db.ts`:
```ts
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
```

`src/storage/instellingen.ts`:
```ts
import type { CollageDb } from './db';
import type { GehashteCode } from './hash';

export type Toestel = 'ipad' | 'chromebook' | 'pc';
export interface Instellingen { toestel: Toestel | null; profielenAan: boolean; master: GehashteCode | null }

const STANDAARD: Instellingen = { toestel: null, profielenAan: false, master: null };

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
```

`src/storage/profielen.ts` (alleen de interface, zie Interfaces).

- [ ] **Step 5: Run tests — moeten slagen**

Run: `npx vitest run src/storage src/document && npm test && npm run check`
Expected: PASS, 0 errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Dexie storage schema, settings and PBKDF2 code hashing"
```

---

### Task 2: Validatie en migraties van collage-documenten

**Files:**
- Create: `src/document/validatie.ts`, `src/document/validatie.test.ts`

**Interfaces:**
- Consumes: `SCHEMA_VERSIE`, `Collage` (types), `FORMATEN`, `nieuweCollage`, `maakVorm`, `maakFoto` (fase 1)
- Produces:
  - `class CollageFout extends Error { code: 'ongeldig' | 'nieuwer' }`
  - `FOUTTEKST_BESTAND: Record<CollageFout['code'], string>` = `{ ongeldig: 'Dit bestand kan ik niet openen.', nieuwer: 'Dit bestand is gemaakt met een nieuwere versie.' }`
  - `leesCollage(data: unknown): Collage`
  - `MIGRATIES: Record<number, (c: Record<string, unknown>) => Record<string, unknown>>` (leeg in versie 1; sleutel n = migratie van versie n naar n+1)

- [ ] **Step 1: Failing test schrijven**

`src/document/validatie.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { CollageFout, leesCollage } from './validatie';
import { maakFoto, maakVorm, nieuweCollage } from './create';
import { SCHEMA_VERSIE } from './types';

const geldig = () => ({ ...nieuweCollage('vierkant'), elementen: [maakVorm({ x: 1, y: 2, vorm: 'hart', breedte: 10, hoogte: 10 }), maakFoto({ x: 5, y: 5, breedte: 5, hoogte: 5, assetId: 'a' })] });
const fout = (data: unknown) => { try { leesCollage(data); return null; } catch (e) { return e instanceof CollageFout ? e.code : 'andere'; } };

describe('leesCollage', () => {
  it('geeft een geldige collage ongewijzigd terug', () => {
    const c = geldig();
    expect(leesCollage(JSON.parse(JSON.stringify(c)))).toEqual(c);
  });

  it('weigert geen object, ontbrekende velden en onbekende types', () => {
    expect(fout(null)).toBe('ongeldig');
    expect(fout('tekst')).toBe('ongeldig');
    expect(fout({ ...geldig(), formaat: 'a3' })).toBe('ongeldig');
    expect(fout({ ...geldig(), elementen: 'nee' })).toBe('ongeldig');
    expect(fout({ ...geldig(), elementen: [{ id: 'x', type: 'video', x: 0, y: 0, breedte: 1, hoogte: 1, rotatie: 0, schaalX: 1, schaalY: 1 }] })).toBe('ongeldig');
    expect(fout({ ...geldig(), elementen: [{ ...maakVorm({ x: 0, y: 0, vorm: 'hart', breedte: 1, hoogte: 1 }), x: 'veel' }] })).toBe('ongeldig');
    expect(fout({ ...geldig(), achtergrond: { soort: 'glitter' } })).toBe('ongeldig');
    const { versie: _v, ...zonderVersie } = geldig();
    expect(fout(zonderVersie)).toBe('ongeldig');
  });

  it('herkent een nieuwere versie', () => {
    expect(fout({ ...geldig(), versie: SCHEMA_VERSIE + 1 })).toBe('nieuwer');
  });

  it('versie zonder migratiepad is ongeldig', () => {
    expect(fout({ ...geldig(), versie: 0 })).toBe('ongeldig');
  });

  it('vult ontbrekende profielId en tijden aan', () => {
    const { profielId: _p, aangemaakt: _a, gewijzigd: _g, ...rest } = geldig();
    const c = leesCollage(rest);
    expect(c.profielId).toBeNull();
    expect(c.gewijzigd).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test — moet falen**

Run: `npx vitest run src/document/validatie.test.ts`
Expected: FAIL — `./validatie` niet gevonden.

- [ ] **Step 3: Implementatie**

`src/document/validatie.ts`:
```ts
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
```

- [ ] **Step 4: Run test — moet slagen**

Run: `npx vitest run src/document && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: validate and migrate collage documents"
```

---

### Task 3: Collages bewaren, laden, opsommen en wissen

**Files:**
- Create: `src/storage/collages.ts`, `src/storage/collages.test.ts`
- Modify: `src/document/create.ts` (kopieVan)

**Interfaces:**
- Consumes: `CollageDb` (Task 1), `leesCollage` (Task 2), `AssetStore` (fase 1: `blob(id)`, `addBlob(blob, id)`)
- Produces:
  - `kopieVan(c: Collage, profielId: string | null): Collage` (in `create.ts`; nieuw collage-id, `aangemaakt`/`gewijzigd` = nu, asset-id's blijven)
  - `gebruikteAssets(c: Collage): string[]`
  - `interface CollageSamenvatting { id: string; profielId: string; naam: string; gewijzigd: number; voorbeeld: string | null }`
  - `bewaarCollage(db, c: Collage, assets: { blob(id: string): Blob | undefined }, voorbeeld?: string | null): Promise<void>` — `voorbeeld` weggelaten = bestaand voorbeeld behouden
  - `laadCollage(db, id: string): Promise<{ collage: Collage; blobs: Map<string, Blob> } | null>` (gooit `CollageFout` bij kapotte data)
  - `lijstCollages(db, profielId: string | null): Promise<CollageSamenvatting[]>` (nieuwste eerst)
  - `wisCollages(db, ids: string[]): Promise<void>` (wist ook hun assets)
  - `vulAssets(assets: AssetStore, blobs: Map<string, Blob>): Promise<void>`

- [ ] **Step 1: Failing test schrijven**

`src/storage/collages.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { maakDb, type CollageDb } from './db';
import { bewaarCollage, gebruikteAssets, laadCollage, lijstCollages, vulAssets, wisCollages } from './collages';
import { kopieVan, maakFoto, nieuweCollage, nieuwId } from '../document/create';
import { AssetStore } from '../assets/store';
import type { Collage } from '../document/types';

let db: CollageDb;
beforeEach(() => { db = maakDb(`test-${nieuwId()}`); });
afterEach(async () => { await db.delete(); });

async function png(): Promise<Blob> {
  const c = new OffscreenCanvas(4, 4);
  c.getContext('2d')!.fillRect(0, 0, 4, 4);
  return c.convertToBlob({ type: 'image/png' });
}

async function collageMetFoto(profielId: string | null = null): Promise<{ c: Collage; assets: AssetStore }> {
  const assets = new AssetStore();
  const id = await assets.addBlob(await png());
  const c = { ...nieuweCollage('vierkant'), profielId, elementen: [maakFoto({ x: 1, y: 1, breedte: 4, hoogte: 4, assetId: id })] };
  return { c, assets };
}

describe('collages', () => {
  it('gebruikteAssets vindt foto-elementen en fotoachtergrond, zonder dubbels', () => {
    const c = { ...nieuweCollage('vierkant'), achtergrond: { soort: 'foto' as const, assetId: 'b' }, elementen: [maakFoto({ x: 0, y: 0, breedte: 1, hoogte: 1, assetId: 'a' }), maakFoto({ x: 0, y: 0, breedte: 1, hoogte: 1, assetId: 'a' }), maakFoto({ x: 0, y: 0, breedte: 1, hoogte: 1, assetId: null })] };
    expect(gebruikteAssets(c).sort()).toEqual(['a', 'b']);
  });

  it('bewaart en laadt een collage met afbeeldingen', async () => {
    const { c, assets } = await collageMetFoto();
    await bewaarCollage(db, c, assets);
    const r = await laadCollage(db, c.id);
    expect(r!.collage).toEqual(c);
    expect([...r!.blobs.keys()]).toEqual(gebruikteAssets(c));
    const nieuw = new AssetStore();
    await vulAssets(nieuw, r!.blobs);
    expect(nieuw.image(gebruikteAssets(c)[0])).toBeDefined();
  });

  it('ruimt niet meer gebruikte afbeeldingen op bij opnieuw bewaren', async () => {
    const { c, assets } = await collageMetFoto();
    await bewaarCollage(db, c, assets);
    await bewaarCollage(db, { ...c, elementen: [] }, assets);
    expect(await db.assets.where('collageId').equals(c.id).count()).toBe(0);
  });

  it('behoudt het voorbeeld als er geen nieuw wordt meegegeven', async () => {
    const { c, assets } = await collageMetFoto();
    await bewaarCollage(db, c, assets, 'data:image/png;base64,AAA');
    await bewaarCollage(db, { ...c, naam: 'Nieuw' }, assets);
    const [s] = await lijstCollages(db, null);
    expect(s).toMatchObject({ naam: 'Nieuw', voorbeeld: 'data:image/png;base64,AAA', profielId: '' });
  });

  it('lijst per profiel, nieuwste eerst', async () => {
    const a = { ...nieuweCollage('vierkant', 'A'), profielId: 'p1', gewijzigd: 100 };
    const b = { ...nieuweCollage('vierkant', 'B'), profielId: 'p1', gewijzigd: 200 };
    const x = { ...nieuweCollage('vierkant', 'X'), profielId: 'p2', gewijzigd: 300 };
    const leeg = new AssetStore();
    for (const c of [a, b, x]) await bewaarCollage(db, c, leeg);
    expect((await lijstCollages(db, 'p1')).map((s) => s.naam)).toEqual(['B', 'A']);
    expect((await lijstCollages(db, 'p2')).map((s) => s.naam)).toEqual(['X']);
    expect(await lijstCollages(db, null)).toEqual([]);
  });

  it('wisCollages wist collage en afbeeldingen', async () => {
    const { c, assets } = await collageMetFoto();
    await bewaarCollage(db, c, assets);
    await wisCollages(db, [c.id]);
    expect(await laadCollage(db, c.id)).toBeNull();
    expect(await db.assets.count()).toBe(0);
  });

  it('kopieVan geeft nieuw id en profiel, behoudt inhoud', () => {
    const c = { ...nieuweCollage('poster'), elementen: [maakFoto({ x: 0, y: 0, breedte: 1, hoogte: 1, assetId: 'a' })] };
    const k = kopieVan(c, 'p9');
    expect(k.id).not.toBe(c.id);
    expect(k.profielId).toBe('p9');
    expect(k.elementen).toEqual(c.elementen);
  });
});
```

- [ ] **Step 2: Run test — moet falen**

Run: `npx vitest run src/storage/collages.test.ts`
Expected: FAIL — `./collages` niet gevonden.

- [ ] **Step 3: Implementatie**

Voeg toe aan `src/document/create.ts`:
```ts
export function kopieVan(c: Collage, profielId: string | null): Collage {
  const nu = Date.now();
  return { ...structuredClone(c), id: nieuwId(), profielId, aangemaakt: nu, gewijzigd: nu };
}
```

`src/storage/collages.ts`:
```ts
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
```

- [ ] **Step 4: Run test — moet slagen**

Run: `npx vitest run src/storage && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: persist collages and their images in IndexedDB"
```

---

### Task 4: Het `.collage`-bestand

**Files:**
- Create: `src/storage/bestand.ts`, `src/storage/bestand.test.ts`

**Interfaces:**
- Consumes: `gebruikteAssets` (Task 3), `leesCollage`, `CollageFout` (Task 2)
- Produces:
  - `naarBestand(c: Collage, assets: { blob(id: string): Blob | undefined }, voorbeeld?: Blob): Promise<Blob>` (type `application/zip`)
  - `vanBestand(bestand: Blob): Promise<{ collage: Collage; blobs: Map<string, Blob> }>` (gooit `CollageFout('ongeldig' | 'nieuwer')`)

- [ ] **Step 1: Failing test schrijven**

`src/storage/bestand.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { naarBestand, vanBestand } from './bestand';
import { AssetStore } from '../assets/store';
import { maakFoto, nieuweCollage } from '../document/create';
import { CollageFout } from '../document/validatie';
import { SCHEMA_VERSIE } from '../document/types';

async function png(): Promise<Blob> {
  const c = new OffscreenCanvas(3, 3);
  c.getContext('2d')!.fillRect(0, 0, 3, 3);
  return c.convertToBlob({ type: 'image/png' });
}

const code = async (p: Promise<unknown>) => { try { await p; return null; } catch (e) { return e instanceof CollageFout ? e.code : 'andere'; } };

describe('.collage-bestand', () => {
  it('heen en terug: zelfde collage en afbeeldingen', async () => {
    const assets = new AssetStore();
    const id = await assets.addBlob(await png());
    const c = { ...nieuweCollage('a4-staand', 'Test'), elementen: [maakFoto({ x: 1, y: 1, breedte: 3, hoogte: 3, assetId: id })] };
    const bestand = await naarBestand(c, assets, await png());
    expect(bestand.type).toBe('application/zip');
    const zip = await JSZip.loadAsync(bestand);
    expect(Object.keys(zip.files).sort()).toEqual(['assets/', `assets/${id}`, 'collage.json', 'voorbeeld.png']);
    const r = await vanBestand(bestand);
    expect(r.collage).toEqual(c);
    expect(r.blobs.get(id)!.size).toBe((await png()).size);
  });

  it('geen zip of kapotte json is ongeldig', async () => {
    expect(await code(vanBestand(new Blob(['hallo'])))).toBe('ongeldig');
    const z = new JSZip();
    z.file('collage.json', '{kapot');
    expect(await code(vanBestand(await z.generateAsync({ type: 'blob' })))).toBe('ongeldig');
    expect(await code(vanBestand(await new JSZip().generateAsync({ type: 'blob' })))).toBe('ongeldig');
  });

  it('ontbrekende afbeelding is ongeldig', async () => {
    const z = new JSZip();
    z.file('collage.json', JSON.stringify({ ...nieuweCollage('vierkant'), elementen: [maakFoto({ x: 0, y: 0, breedte: 1, hoogte: 1, assetId: 'weg' })] }));
    expect(await code(vanBestand(await z.generateAsync({ type: 'blob' })))).toBe('ongeldig');
  });

  it('nieuwere versie geeft nieuwer', async () => {
    const z = new JSZip();
    z.file('collage.json', JSON.stringify({ ...nieuweCollage('vierkant'), versie: SCHEMA_VERSIE + 1 }));
    expect(await code(vanBestand(await z.generateAsync({ type: 'blob' })))).toBe('nieuwer');
  });
});
```

- [ ] **Step 2: Run test — moet falen**

Run: `npx vitest run src/storage/bestand.test.ts`
Expected: FAIL — `./bestand` niet gevonden.

- [ ] **Step 3: Implementatie**

`src/storage/bestand.ts`:
```ts
import JSZip from 'jszip';
import type { Collage } from '../document/types';
import { CollageFout, leesCollage } from '../document/validatie';
import { gebruikteAssets } from './collages';

export async function naarBestand(c: Collage, assets: { blob(id: string): Blob | undefined }, voorbeeld?: Blob): Promise<Blob> {
  const zip = new JSZip();
  zip.file('collage.json', JSON.stringify(c));
  const map = zip.folder('assets')!;
  for (const id of gebruikteAssets(c)) {
    const b = assets.blob(id);
    if (b) map.file(id, b);
  }
  if (voorbeeld) zip.file('voorbeeld.png', voorbeeld);
  return zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
}

export async function vanBestand(bestand: Blob): Promise<{ collage: Collage; blobs: Map<string, Blob> }> {
  let zip: JSZip;
  try { zip = await JSZip.loadAsync(bestand); } catch { throw new CollageFout('ongeldig'); }
  const json = zip.file('collage.json');
  if (!json) throw new CollageFout('ongeldig');
  let data: unknown;
  try { data = JSON.parse(await json.async('string')); } catch { throw new CollageFout('ongeldig'); }
  const collage = leesCollage(data);
  const blobs = new Map<string, Blob>();
  for (const id of gebruikteAssets(collage)) {
    const f = zip.file(`assets/${id}`);
    if (!f) throw new CollageFout('ongeldig');
    blobs.set(id, await f.async('blob'));
  }
  return { collage, blobs };
}
```

- [ ] **Step 4: Run test — moet slagen**

Run: `npx vitest run src/storage && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: save and open collages as .collage zip files"
```

---

### Task 5: Profielen en opruimregels

**Files:**
- Modify: `src/storage/profielen.ts` (aanvullen)
- Create: `src/storage/opruimen.ts`, `src/storage/profielen.test.ts`, `src/storage/opruimen.test.ts`

**Interfaces:**
- Consumes: `CollageDb`, `maakHash`, `controleerCode`, `wisCollages`, `lijstCollages`, `CollageSamenvatting`
- Produces:
  - `PROFIEL_SYMBOLEN: string[]` (12 iconen), `PIN_SYMBOLEN: string[]` (9 iconen), `PIN_LENGTE = 3`
  - `maakProfiel(db, p: { naam: string; symbool: string; kleur: string; pin: string[] }): Promise<Profiel>`
  - `lijstProfielen(db): Promise<Profiel[]>` (op naam, `localeCompare(…, 'nl')`)
  - `controleerPin(db, id: string, pin: string[]): Promise<boolean>` (bij succes: `laatstGebruikt = nu`)
  - `zetPin(db, id: string, pin: string[]): Promise<void>`
  - `wisProfiel(db, id: string): Promise<void>` (wist ook diens collages)
  - `DAG = 86_400_000`
  - `beoordeelCollages(rijen: { id: string; gewijzigd: number }[], nu: number): { vragen: string[]; wissen: string[] }`
  - `oudeProfielen(profielen: Profiel[], profielenMetCollages: Set<string>, nu: number): string[]`
  - `ruimAutomatischOp(db, nu?: number): Promise<void>`
  - `teVragen(db, profielId: string | null, nu?: number): Promise<CollageSamenvatting[]>`

- [ ] **Step 1: Failing tests schrijven**

`src/storage/profielen.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { maakDb, type CollageDb } from './db';
import { controleerPin, lijstProfielen, maakProfiel, wisProfiel, zetPin, PIN_SYMBOLEN, PROFIEL_SYMBOLEN } from './profielen';
import { bewaarCollage, lijstCollages } from './collages';
import { nieuweCollage, nieuwId } from '../document/create';
import { AssetStore } from '../assets/store';

let db: CollageDb;
beforeEach(() => { db = maakDb(`test-${nieuwId()}`); });
afterEach(async () => { await db.delete(); });

const pin = ['star', 'heart', 'cloud'];

describe('profielen', () => {
  it('symbolensets hebben de juiste grootte en geen dubbels', () => {
    expect(PIN_SYMBOLEN).toHaveLength(9);
    expect(new Set(PIN_SYMBOLEN).size).toBe(9);
    expect(PROFIEL_SYMBOLEN).toHaveLength(12);
  });

  it('maakt profielen en sorteert op naam', async () => {
    await maakProfiel(db, { naam: 'Zoë', symbool: 'rocket', kleur: '#FF6B6B', pin });
    await maakProfiel(db, { naam: 'Amir', symbool: 'cake', kleur: '#4ECDC4', pin });
    expect((await lijstProfielen(db)).map((p) => p.naam)).toEqual(['Amir', 'Zoë']);
  });

  it('controleert de pincode en werkt laatstGebruikt bij', async () => {
    const p = await maakProfiel(db, { naam: 'Lies', symbool: 'star', kleur: '#FFC94D', pin });
    expect(await controleerPin(db, p.id, ['star', 'heart', 'drop'])).toBe(false);
    expect(await controleerPin(db, p.id, ['heart', 'star', 'cloud'])).toBe(false);
    const voor = (await db.profielen.get(p.id))!.laatstGebruikt;
    await new Promise((r) => setTimeout(r, 5));
    expect(await controleerPin(db, p.id, pin)).toBe(true);
    expect((await db.profielen.get(p.id))!.laatstGebruikt).toBeGreaterThan(voor);
    expect(await controleerPin(db, 'bestaat-niet', pin)).toBe(false);
  });

  it('zetPin vervangt de pincode', async () => {
    const p = await maakProfiel(db, { naam: 'Lies', symbool: 'star', kleur: '#FFC94D', pin });
    await zetPin(db, p.id, ['car', 'car', 'car']);
    expect(await controleerPin(db, p.id, pin)).toBe(false);
    expect(await controleerPin(db, p.id, ['car', 'car', 'car'])).toBe(true);
  });

  it('wisProfiel wist alleen de collages van dat profiel', async () => {
    const a = await maakProfiel(db, { naam: 'A', symbool: 'star', kleur: '#FFC94D', pin });
    const b = await maakProfiel(db, { naam: 'B', symbool: 'star', kleur: '#FFC94D', pin });
    const leeg = new AssetStore();
    await bewaarCollage(db, { ...nieuweCollage('vierkant'), profielId: a.id }, leeg);
    await bewaarCollage(db, { ...nieuweCollage('vierkant'), profielId: b.id }, leeg);
    await wisProfiel(db, a.id);
    expect(await lijstCollages(db, a.id)).toEqual([]);
    expect(await lijstCollages(db, b.id)).toHaveLength(1);
    expect((await lijstProfielen(db)).map((p) => p.naam)).toEqual(['B']);
  });
});
```

`src/storage/opruimen.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { maakDb, type CollageDb } from './db';
import { DAG, beoordeelCollages, oudeProfielen, ruimAutomatischOp, teVragen } from './opruimen';
import { bewaarCollage, lijstCollages } from './collages';
import { maakProfiel, lijstProfielen } from './profielen';
import { nieuweCollage, nieuwId } from '../document/create';
import { AssetStore } from '../assets/store';

let db: CollageDb;
beforeEach(() => { db = maakDb(`test-${nieuwId()}`); });
afterEach(async () => { await db.delete(); });

const NU = 1_000 * DAG;

describe('opruimregels', () => {
  it('30 dagen = vragen, 60 dagen = wissen, grenzen exclusief', () => {
    const r = beoordeelCollages([
      { id: 'vers', gewijzigd: NU - 10 * DAG },
      { id: 'precies30', gewijzigd: NU - 30 * DAG },
      { id: 'oud', gewijzigd: NU - 31 * DAG },
      { id: 'precies60', gewijzigd: NU - 60 * DAG },
      { id: 'heelOud', gewijzigd: NU - 61 * DAG },
    ], NU);
    expect(r).toEqual({ vragen: ['oud', 'precies60'], wissen: ['heelOud'] });
  });

  it('oude profielen: geen collages én 60 dagen niet gebruikt', () => {
    const p = (id: string, dagen: number) => ({ id, naam: id, symbool: 'star', kleur: '#000000', pin: { salt: '', hash: '', iteraties: 1 }, aangemaakt: 0, laatstGebruikt: NU - dagen * DAG });
    expect(oudeProfielen([p('a', 61), p('b', 61), p('c', 10)], new Set(['b']), NU)).toEqual(['a']);
  });

  it('ruimAutomatischOp wist heel oude collages en lege oude profielen', async () => {
    const leeg = new AssetStore();
    const oudProfiel = await maakProfiel(db, { naam: 'Oud', symbool: 'star', kleur: '#000000', pin: ['star', 'star', 'star'] });
    await db.profielen.update(oudProfiel.id, { laatstGebruikt: NU - 90 * DAG });
    await bewaarCollage(db, { ...nieuweCollage('vierkant', 'heel oud'), profielId: oudProfiel.id, gewijzigd: NU - 70 * DAG }, leeg);
    await bewaarCollage(db, { ...nieuweCollage('vierkant', 'vers'), gewijzigd: NU - 1 * DAG }, leeg);
    await ruimAutomatischOp(db, NU);
    expect((await lijstCollages(db, null)).map((c) => c.naam)).toEqual(['vers']);
    expect(await lijstProfielen(db)).toEqual([]);
  });

  it('teVragen geeft collages tussen 30 en 60 dagen van dat profiel', async () => {
    const leeg = new AssetStore();
    await bewaarCollage(db, { ...nieuweCollage('vierkant', 'oud'), profielId: 'p', gewijzigd: NU - 40 * DAG }, leeg);
    await bewaarCollage(db, { ...nieuweCollage('vierkant', 'vers'), profielId: 'p', gewijzigd: NU - 2 * DAG }, leeg);
    await bewaarCollage(db, { ...nieuweCollage('vierkant', 'ander'), profielId: 'q', gewijzigd: NU - 40 * DAG }, leeg);
    expect((await teVragen(db, 'p', NU)).map((c) => c.naam)).toEqual(['oud']);
  });
});
```

- [ ] **Step 2: Run tests — moeten falen**

Run: `npx vitest run src/storage/profielen.test.ts src/storage/opruimen.test.ts`
Expected: FAIL — `maakProfiel` niet geëxporteerd, `./opruimen` niet gevonden.

- [ ] **Step 3: Implementatie**

`src/storage/profielen.ts` (volledig):
```ts
import type { CollageDb } from './db';
import { controleerCode, maakHash, type GehashteCode } from './hash';
import { nieuwId } from '../document/create';
import { wisCollages } from './collages';

export interface Profiel { id: string; naam: string; symbool: string; kleur: string; pin: GehashteCode; aangemaakt: number; laatstGebruikt: number }

export const PROFIEL_SYMBOLEN = ['paw-print', 'rocket', 'soccer-ball', 'leaf', 'cake', 'tree', 'pizza', 'car', 'star', 'heart', 'cloud', 'drop'];
export const PIN_SYMBOLEN = ['star', 'heart', 'cloud', 'drop', 'leaf', 'rocket', 'cake', 'car', 'pizza'];
export const PIN_LENGTE = 3;
const PIN_ITERATIES = 20_000;

const pinTekst = (pin: string[]): string => pin.join('|');

export async function maakProfiel(db: CollageDb, p: { naam: string; symbool: string; kleur: string; pin: string[] }): Promise<Profiel> {
  const nu = Date.now();
  const profiel: Profiel = { id: nieuwId(), naam: p.naam.trim(), symbool: p.symbool, kleur: p.kleur, pin: await maakHash(pinTekst(p.pin), PIN_ITERATIES), aangemaakt: nu, laatstGebruikt: nu };
  await db.profielen.put(profiel);
  return profiel;
}

export async function lijstProfielen(db: CollageDb): Promise<Profiel[]> {
  return (await db.profielen.toArray()).sort((a, b) => a.naam.localeCompare(b.naam, 'nl'));
}

export async function controleerPin(db: CollageDb, id: string, pin: string[]): Promise<boolean> {
  const p = await db.profielen.get(id);
  if (!p || !(await controleerCode(pinTekst(pin), p.pin))) return false;
  await db.profielen.update(id, { laatstGebruikt: Date.now() });
  return true;
}

export async function zetPin(db: CollageDb, id: string, pin: string[]): Promise<void> {
  await db.profielen.update(id, { pin: await maakHash(pinTekst(pin), PIN_ITERATIES) });
}

export async function wisProfiel(db: CollageDb, id: string): Promise<void> {
  const ids = (await db.collages.where('profielId').equals(id).primaryKeys()) as string[];
  await wisCollages(db, ids);
  await db.profielen.delete(id);
}
```

`src/storage/opruimen.ts`:
```ts
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
}

export async function teVragen(db: CollageDb, profielId: string | null, nu = Date.now()): Promise<CollageSamenvatting[]> {
  const lijst = await lijstCollages(db, profielId);
  const { vragen } = beoordeelCollages(lijst, nu);
  return lijst.filter((c) => vragen.includes(c.id));
}
```

Let op de import-cyclus `profielen.ts` ↔ `collages.ts`: `collages.ts` importeert niets uit `profielen.ts`, dus er is geen cyclus. `db.ts` importeert alleen het type `Profiel`.

- [ ] **Step 4: Run tests — moeten slagen**

Run: `npx vitest run src/storage && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add child profiles with symbol pin and cleanup rules"
```

---

### Task 6: Automatisch bewaren en herinnering

**Files:**
- Create: `src/storage/autosave.ts`, `src/storage/herinnering.ts`, `src/storage/autosave.test.ts`

**Interfaces:**
- Consumes: `EditorState` (fase 1, `src/editor/store.ts`), Svelte `Readable`
- Produces:
  - `isVolFout(e: unknown): boolean` (`QuotaExceededError`, ook als `inner` van een Dexie-fout)
  - `startAutosave(o: { state: Readable<EditorState>; bewaar: (c: Collage) => Promise<void>; wacht?: number; onFout?: (e: unknown) => void }): Autosave`
  - `interface Autosave { flush(): Promise<void>; stop(): Promise<void>; heeftBewaard(): boolean }`
  - Gedrag: de eerste collage (bij het openen) wordt niet bewaard; elke nieuwe collage-referentie start een timer van `wacht` ms (standaard 800); bewaren gebeurt na elkaar, nooit tegelijk; een fout gaat naar `onFout` en blokkeert volgende pogingen niet.
  - `startHerinnering(o: { interval: number; moet: () => boolean; toon: () => void }): () => void`

- [ ] **Step 1: Failing test schrijven**

`src/storage/autosave.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { writable } from 'svelte/store';
import { isVolFout, startAutosave } from './autosave';
import { startHerinnering } from './herinnering';
import { nieuweCollage } from '../document/create';
import type { EditorState } from '../editor/store';
import type { Collage } from '../document/types';

afterEach(() => { vi.useRealTimers(); });

const toestand = (c: Collage): EditorState => ({ collage: c, selectedId: null, canUndo: false, canRedo: false });

describe('autosave', () => {
  it('bewaart niet bij openen, wel na een wijziging (debounced, laatste wint)', async () => {
    vi.useFakeTimers();
    const c0 = nieuweCollage('vierkant');
    const state = writable(toestand(c0));
    const bewaard: Collage[] = [];
    const a = startAutosave({ state, bewaar: async (c) => { bewaard.push(c); }, wacht: 500 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(bewaard).toEqual([]);
    const c1 = { ...c0, naam: '1' }, c2 = { ...c0, naam: '2' };
    state.set(toestand(c1));
    await vi.advanceTimersByTimeAsync(200);
    state.set(toestand(c2));
    await vi.advanceTimersByTimeAsync(499);
    expect(bewaard).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(bewaard.map((c) => c.naam)).toEqual(['2']);
    expect(a.heeftBewaard()).toBe(true);
    await a.stop();
  });

  it('flush bewaart meteen wat nog wacht; stop flusht en luistert niet meer', async () => {
    const c0 = nieuweCollage('vierkant');
    const state = writable(toestand(c0));
    const bewaard: string[] = [];
    const a = startAutosave({ state, bewaar: async (c) => { bewaard.push(c.naam); }, wacht: 10_000 });
    state.set(toestand({ ...c0, naam: 'x' }));
    await a.flush();
    expect(bewaard).toEqual(['x']);
    await a.flush();
    expect(bewaard).toEqual(['x']);
    state.set(toestand({ ...c0, naam: 'y' }));
    await a.stop();
    expect(bewaard).toEqual(['x', 'y']);
    state.set(toestand({ ...c0, naam: 'z' }));
    await a.flush();
    expect(bewaard).toEqual(['x', 'y']);
  });

  it('bewaart nooit twee keer tegelijk', async () => {
    const c0 = nieuweCollage('vierkant');
    const state = writable(toestand(c0));
    let actief = 0, maxActief = 0;
    const a = startAutosave({ state, wacht: 0, bewaar: async () => { actief++; maxActief = Math.max(maxActief, actief); await new Promise((r) => setTimeout(r, 20)); actief--; } });
    state.set(toestand({ ...c0, naam: '1' }));
    await new Promise((r) => setTimeout(r, 5));
    state.set(toestand({ ...c0, naam: '2' }));
    await new Promise((r) => setTimeout(r, 5));
    state.set(toestand({ ...c0, naam: '3' }));
    await a.stop();
    expect(maxActief).toBe(1);
  });

  it('opslag vol: onFout wordt geroepen en volgende pogingen gaan door', async () => {
    const c0 = nieuweCollage('vierkant');
    const state = writable(toestand(c0));
    const fouten: unknown[] = [];
    let keer = 0;
    const a = startAutosave({
      state, wacht: 0, onFout: (e) => fouten.push(e),
      bewaar: async () => { keer++; if (keer === 1) throw new DOMException('vol', 'QuotaExceededError'); },
    });
    state.set(toestand({ ...c0, naam: '1' }));
    await a.flush();
    state.set(toestand({ ...c0, naam: '2' }));
    await a.flush();
    expect(keer).toBe(2);
    expect(fouten).toHaveLength(1);
    expect(isVolFout(fouten[0])).toBe(true);
    await a.stop();
  });

  it('isVolFout herkent ook een ingepakte Dexie-fout', () => {
    expect(isVolFout({ name: 'AbortError', inner: { name: 'QuotaExceededError' } })).toBe(true);
    expect(isVolFout(new Error('anders'))).toBe(false);
  });
});

describe('herinnering', () => {
  it('toont alleen als het moet, elk interval', async () => {
    vi.useFakeTimers();
    let moet = false;
    const toon = vi.fn();
    const stop = startHerinnering({ interval: 1000, moet: () => moet, toon });
    await vi.advanceTimersByTimeAsync(1000);
    expect(toon).not.toHaveBeenCalled();
    moet = true;
    await vi.advanceTimersByTimeAsync(2000);
    expect(toon).toHaveBeenCalledTimes(2);
    stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(toon).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test — moet falen**

Run: `npx vitest run src/storage/autosave.test.ts`
Expected: FAIL — `./autosave` niet gevonden.

- [ ] **Step 3: Implementatie**

`src/storage/autosave.ts`:
```ts
import type { Readable } from 'svelte/store';
import type { Collage } from '../document/types';
import type { EditorState } from '../editor/store';

export interface Autosave { flush(): Promise<void>; stop(): Promise<void>; heeftBewaard(): boolean }

export function isVolFout(e: unknown): boolean {
  const naam = (x: unknown) => (typeof x === 'object' && x !== null ? (x as { name?: string }).name : undefined);
  return naam(e) === 'QuotaExceededError' || naam((e as { inner?: unknown } | null)?.inner) === 'QuotaExceededError';
}

export function startAutosave(o: { state: Readable<EditorState>; bewaar: (c: Collage) => Promise<void>; wacht?: number; onFout?: (e: unknown) => void }): Autosave {
  const wacht = o.wacht ?? 800;
  let eerste: Collage | null = null;
  let laatstBewaard: Collage | null = null;
  let wachtend: Collage | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let keten: Promise<void> = Promise.resolve();
  let bewaardOoit = false;
  let gestopt = false;

  function plan(): void {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; void flush(); }, wacht);
  }

  function flush(): Promise<void> {
    if (timer) { clearTimeout(timer); timer = null; }
    const c = wachtend;
    wachtend = null;
    if (c && c !== laatstBewaard) {
      keten = keten.then(async () => {
        try {
          await o.bewaar(c);
          laatstBewaard = c;
          bewaardOoit = true;
        } catch (e) {
          o.onFout?.(e);
        }
      });
    }
    return keten;
  }

  const stopLuisteren = o.state.subscribe((s) => {
    if (gestopt) return;
    if (eerste === null) { eerste = s.collage; laatstBewaard = s.collage; return; }
    if (s.collage === laatstBewaard || s.collage === wachtend) return;
    wachtend = s.collage;
    plan();
  });

  return {
    flush,
    async stop() { gestopt = true; stopLuisteren(); await flush(); },
    heeftBewaard: () => bewaardOoit,
  };
}
```

`src/storage/herinnering.ts`:
```ts
export function startHerinnering(o: { interval: number; moet: () => boolean; toon: () => void }): () => void {
  const t = setInterval(() => { if (o.moet()) o.toon(); }, o.interval);
  return () => clearInterval(t);
}
```

- [ ] **Step 4: Run test — moet slagen**

Run: `npx vitest run src/storage && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: debounced autosave with quota handling and file reminder"
```

---
### Task 7: Codetoetsen, eerste start en opstart van de app

**Files:**
- Create: `src/ui/CijferCode.svelte`, `src/ui/SymboolCode.svelte`, `src/ui/EersteStart.svelte`, `src/storage/opstart.ts`, `e2e/eerste-start.spec.ts`
- Modify: `src/App.svelte`, `e2e/helpers.ts`

**Interfaces:**
- Consumes: `db`, `leesInstellingen`, `schrijfInstellingen`, `maakHash`, `Instellingen`, `Toestel` (Task 1)
- Produces:
  - `<CijferCode titel lengte? fout? onKlaar(code: string) />` — DOM-id's `#cijfer-0` … `#cijfer-9`, `#cijfer-terug`; ook toetsenbordcijfers en Backspace
  - `<SymboolCode titel symbolen lengte? fout? onKlaar(code: string[]) />` — DOM-id's `#symbool-<icoon>`, `#symbool-terug`
  - `<EersteStart onKlaar(i: Instellingen) />` — DOM-id's `#eerste-verder`, `#toestel-kies-ipad`, `#toestel-kies-chromebook`, `#toestel-kies-pc`, `#profielen-ja`, `#profielen-nee`
  - `opstart(db): Promise<Instellingen>` — in `MODE === 'e2e'`: zaait instellingen uit `window.__e2eInstellingen` (alleen als er nog geen mastercode is) en zet `window.__opslag = { db }`
  - `wisAlles(db): Promise<void>` (wist database en tour-sleutels; gebruikt in Task 11)
  - e2e-helpers: standaard-fixture zaait `{ toestel: 'pc', profielenAan: false, mastercode: '123456' }`; `metInstellingen(page, cfg: { toestel: 'ipad' | 'chromebook' | 'pc'; profielenAan?: boolean; mastercode?: string })` overschrijft dat (aanroepen vóór de eerste `goto`)

- [ ] **Step 1: e2e-helpers uitbreiden**

In `e2e/helpers.ts`, vervang de `test`-definitie door:
```ts
const ALLE_TOURS = ['editor', 'foto', 'tekst', 'stickers', 'vormen', 'tekenen', 'achtergrond', 'leerkracht'];

export interface E2eInstellingen { toestel: 'ipad' | 'chromebook' | 'pc'; profielenAan?: boolean; mastercode?: string }

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript((tours) => {
      try { localStorage.setItem('collage-tours-gezien', JSON.stringify(tours)); } catch { /* opslag geblokkeerd */ }
    }, ALLE_TOURS);
    await page.addInitScript(() => {
      (window as any).__e2eInstellingen = { toestel: 'pc', profielenAan: false, mastercode: '123456' };
    });
    await use(page);
  },
});

// Init-scripts lopen in volgorde: deze overschrijft de standaard. Roep aan vóór de eerste page.goto.
export async function metInstellingen(page: Page, cfg: E2eInstellingen): Promise<void> {
  await page.addInitScript((c) => { (window as any).__e2eInstellingen = c; }, cfg);
}
```

- [ ] **Step 2: Failing e2e-test schrijven**

`e2e/eerste-start.spec.ts` (bewust zonder voorinstellingen, dus rechtstreeks uit `@playwright/test`):
```ts
import { test, expect } from '@playwright/test';

async function typCode(page: import('@playwright/test').Page, code: string) {
  for (const c of code) await page.click(`#cijfer-${c}`);
}

test('eerste start: mastercode tweemaal, toestel kiezen, daarna onthouden', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welkom bij Collagemaker' })).toBeVisible();
  await page.click('#eerste-verder');
  await typCode(page, '123456');
  await typCode(page, '654321');
  await expect(page.getByText('De codes zijn niet gelijk. Probeer opnieuw.')).toBeVisible();
  await typCode(page, '246810');
  await typCode(page, '246810');
  await page.click('#toestel-kies-pc');
  await page.click('#profielen-nee');
  await expect(page.locator('#start-nieuw')).toBeVisible();
  await page.reload();
  await expect(page.locator('#start-nieuw')).toBeVisible();
});

test('eerste start op Chromebook vraagt niets over profielen', async ({ page }) => {
  await page.goto('/');
  await page.click('#eerste-verder');
  await typCode(page, '111111');
  await typCode(page, '111111');
  await page.click('#toestel-kies-chromebook');
  await expect(page.locator('#start-nieuw')).toBeVisible();
});

test('cijfers werken ook met het toetsenbord', async ({ page }) => {
  await page.goto('/');
  await page.click('#eerste-verder');
  await page.keyboard.type('135791');
  await page.keyboard.type('135791');
  await expect(page.locator('#toestel-kies-pc')).toBeVisible();
});
```

- [ ] **Step 3: Run e2e — moet falen**

Run: `npx playwright test e2e/eerste-start.spec.ts --project=chromebook`
Expected: FAIL — heading "Welkom bij Collagemaker" niet gevonden.

- [ ] **Step 4: Codetoetsen**

`src/ui/CijferCode.svelte`:
```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  let { titel, lengte = 6, fout = '', onKlaar }: { titel: string; lengte?: number; fout?: string; onKlaar: (code: string) => void } = $props();
  let code = $state('');

  function tik(c: string) {
    if (code.length >= lengte) return;
    code += c;
    if (code.length === lengte) {
      const klaar = code;
      code = '';
      onKlaar(klaar);
    }
  }
  function wis() { code = code.slice(0, -1); }
  function toets(e: KeyboardEvent) {
    if ((e.target as HTMLElement | null)?.closest?.('input, textarea')) return;
    if (/^[0-9]$/.test(e.key)) { tik(e.key); e.preventDefault(); }
    else if (e.key === 'Backspace') { wis(); e.preventDefault(); }
  }
</script>

<svelte:window onkeydown={toets} />

<div class="code">
  <h2>{titel}</h2>
  <div class="bolletjes" role="status" aria-label="{code.length} van {lengte} cijfers">
    {#each Array(lengte) as _, i}<span class:vol={i < code.length}></span>{/each}
  </div>
  {#if fout}<p class="fout" role="alert">{fout}</p>{/if}
  <div class="toetsen">
    {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as c}
      <button id="cijfer-{c}" onclick={() => tik(c)}>{c}</button>
    {/each}
    <span></span>
    <button id="cijfer-0" onclick={() => tik('0')}>0</button>
    <button id="cijfer-terug" aria-label="Wis" onclick={wis}><Icon name="backspace" /></button>
  </div>
</div>

<style>
  .code { display: grid; justify-items: center; gap: 14px; }
  .bolletjes { display: flex; gap: 12px; }
  .bolletjes span { width: 20px; height: 20px; border-radius: 50%; border: 3px solid var(--inkt); }
  .bolletjes span.vol { background: var(--inkt); }
  .fout { color: #c0392b; font-weight: 700; margin: 0; }
  .toetsen { display: grid; grid-template-columns: repeat(3, 80px); gap: 10px; }
  .toetsen button { height: 72px; font-size: 1.8rem; background: var(--paneel); box-shadow: var(--schaduw); }
</style>
```

`src/ui/SymboolCode.svelte`:
```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  let { titel, symbolen, lengte = 3, fout = '', onKlaar }: { titel: string; symbolen: string[]; lengte?: number; fout?: string; onKlaar: (code: string[]) => void } = $props();
  let code = $state<string[]>([]);

  function tik(s: string) {
    if (code.length >= lengte) return;
    code = [...code, s];
    if (code.length === lengte) {
      const klaar = code;
      code = [];
      onKlaar(klaar);
    }
  }
  function wis() { code = code.slice(0, -1); }
</script>

<div class="code">
  <h2>{titel}</h2>
  <div class="gekozen" role="status" aria-label="{code.length} van {lengte} gekozen">
    {#each Array(lengte) as _, i}<span class="vak">{#if code[i]}<Icon name={code[i]} size={36} />{/if}</span>{/each}
  </div>
  {#if fout}<p class="fout" role="alert">{fout}</p>{/if}
  <div class="toetsen" style:--kolommen={symbolen.length > 9 ? 4 : 3}>
    {#each symbolen as s}
      <button id="symbool-{s}" aria-label={s} onclick={() => tik(s)}><Icon name={s} size={44} /></button>
    {/each}
  </div>
  <button id="symbool-terug" aria-label="Wis" onclick={wis}><Icon name="backspace" /></button>
</div>

<style>
  .code { display: grid; justify-items: center; gap: 14px; }
  .gekozen { display: flex; gap: 12px; }
  .vak { width: 64px; height: 64px; border-radius: 18px; border: 3px dashed var(--rand); display: grid; place-items: center; background: var(--paneel); }
  .fout { color: #c0392b; font-weight: 700; margin: 0; }
  .toetsen { display: grid; grid-template-columns: repeat(var(--kolommen), 88px); gap: 10px; }
  .toetsen button { height: 88px; background: var(--paneel); box-shadow: var(--schaduw); }
</style>
```

- [ ] **Step 5: Eerste start en opstart**

`src/ui/EersteStart.svelte`:
```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  import CijferCode from './CijferCode.svelte';
  import { db } from '../storage/db';
  import { maakHash } from '../storage/hash';
  import { schrijfInstellingen, type Instellingen, type Toestel } from '../storage/instellingen';

  let { onKlaar }: { onKlaar: (i: Instellingen) => void } = $props();
  let stap = $state<'welkom' | 'code' | 'herhaal' | 'toestel' | 'profielen'>('welkom');
  let fout = $state('');
  let eerste = '';
  let toestel: Toestel = 'pc';
  let bezig = $state(false);

  const TOESTELLEN: { id: Toestel; naam: string; uitleg: string; icoon: string }[] = [
    { id: 'ipad', naam: 'Gedeelde iPad', uitleg: 'Elk kind heeft een eigen profiel met een geheime code. Collages blijven op de iPad.', icoon: 'device-tablet' },
    { id: 'chromebook', naam: 'Chromebook', uitleg: 'Alles wordt gewist bij het uitloggen. Kinderen bewaren hun collage als bestand.', icoon: 'laptop' },
    { id: 'pc', naam: 'Computer', uitleg: 'Collages blijven op deze computer. Profielen kan je aanzetten.', icoon: 'desktop' },
  ];

  function codeKlaar(c: string) { eerste = c; fout = ''; stap = 'herhaal'; }
  function herhaalKlaar(c: string) {
    if (c !== eerste) { fout = 'De codes zijn niet gelijk. Probeer opnieuw.'; stap = 'code'; return; }
    fout = '';
    stap = 'toestel';
  }
  function kiesToestel(t: Toestel) {
    toestel = t;
    if (t === 'pc') stap = 'profielen';
    else void klaar(false);
  }
  async function klaar(profielenAan: boolean) {
    bezig = true;
    const i = await schrijfInstellingen(db, { toestel, profielenAan, master: await maakHash(eerste) });
    onKlaar(i);
  }
</script>

<main class="eerste">
  {#if stap === 'welkom'}
    <h1>Welkom bij Collagemaker</h1>
    <p>Dit stel je één keer in, als leerkracht of ouder. Je kiest een geheime code van 6 cijfers. Daarmee open je later de instellingen.</p>
    <p class="let-op">Bewaar de code goed. Vergeten? Wis de sitegegevens van deze app in de browser.</p>
    <button id="eerste-verder" class="hoofd" onclick={() => (stap = 'code')}>Verder <Icon name="arrow-right" /></button>
  {:else if stap === 'code'}
    <CijferCode titel="Kies een code van 6 cijfers" {fout} onKlaar={codeKlaar} />
  {:else if stap === 'herhaal'}
    <CijferCode titel="Typ de code nog een keer" onKlaar={herhaalKlaar} />
  {:else if stap === 'toestel'}
    <h2>Op welk toestel draait de app?</h2>
    <div class="kaarten">
      {#each TOESTELLEN as t}
        <button id="toestel-kies-{t.id}" class="kaart" disabled={bezig} onclick={() => kiesToestel(t.id)}>
          <Icon name={t.icoon} size={56} /><strong>{t.naam}</strong><span>{t.uitleg}</span>
        </button>
      {/each}
    </div>
  {:else}
    <h2>Profielen gebruiken?</h2>
    <p>Met profielen heeft elk kind een eigen plek met een geheime code. Handig als meerdere kinderen deze computer gebruiken.</p>
    <div class="knoppen">
      <button id="profielen-ja" class="hoofd" disabled={bezig} onclick={() => klaar(true)}>Ja, met profielen</button>
      <button id="profielen-nee" disabled={bezig} onclick={() => klaar(false)}>Nee</button>
    </div>
  {/if}
</main>

<style>
  .eerste { min-height: 100dvh; box-sizing: border-box; padding: max(24px, env(safe-area-inset-top)) 24px 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; text-align: center; }
  h1 { color: var(--koraal); font-size: clamp(2rem, 6vw, 3rem); }
  p { max-width: 560px; font-size: 1.15rem; line-height: 1.5; margin: 0; }
  .let-op { font-weight: 700; }
  .hoofd { padding: 0 24px; }
  .kaarten { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; width: min(900px, 100%); }
  .kaart { flex-direction: column; gap: 8px; padding: 20px; border-radius: 24px; box-shadow: var(--schaduw); text-align: center; }
  .kaart span { font-weight: 400; line-height: 1.4; }
  .knoppen { display: flex; gap: 12px; }
  .knoppen button { padding: 0 24px; }
</style>
```

`src/storage/opstart.ts`:
```ts
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
```

`src/App.svelte` (vervangen):
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import StartScherm from './ui/StartScherm.svelte';
  import EditorScherm from './ui/EditorScherm.svelte';
  import EersteStart from './ui/EersteStart.svelte';
  import Toast from './ui/Toast.svelte';
  import type { Collage } from './document/types';
  import { db } from './storage/db';
  import { opstart } from './storage/opstart';
  import type { Instellingen } from './storage/instellingen';

  let inst = $state.raw<Instellingen | null>(null);
  let collage = $state.raw<Collage | null>(null);
  let opdracht = $state<string | null>(null);
  let pakket = $state<string | null>(null);

  onMount(async () => { inst = await opstart(db); });

  function start(c: Collage, o?: string, p?: string) { collage = c; opdracht = o ?? null; pakket = p ?? null; }
  function terug() { collage = null; opdracht = null; pakket = null; }
</script>

{#if !inst}
  <main class="laden" aria-busy="true"></main>
{:else if !inst.master || !inst.toestel}
  <EersteStart onKlaar={(i) => (inst = i)} />
{:else if collage}
  <EditorScherm {collage} {opdracht} startPakket={pakket} onTerug={terug} />
{:else}
  <StartScherm onStart={start} />
{/if}
<Toast />

<style>
  .laden { min-height: 100dvh; }
</style>
```

- [ ] **Step 6: Run tests — moeten slagen**

Run: `npx playwright test e2e/eerste-start.spec.ts` (beide projecten), daarna de volledige suite `npm run test:e2e` (alle bestaande specs moeten slagen dankzij de standaard-fixture), `npm test`, `npm run check`.
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: first-run setup with teacher code and device type"
```

---

### Task 8: Profielen kiezen en aanmaken

**Files:**
- Create: `src/ui/ProfielKiezer.svelte`, `src/ui/NieuwProfiel.svelte`, `e2e/profielen.spec.ts`
- Modify: `src/App.svelte`, `src/ui/StartScherm.svelte`, `src/tour/tour.ts`, `src/tour/tour.test.ts`

**Interfaces:**
- Consumes: `lijstProfielen`, `maakProfiel`, `controleerPin`, `PROFIEL_SYMBOLEN`, `PIN_SYMBOLEN`, `PIN_LENGTE`, `Profiel` (Task 5), `profielenActief` (Task 1), `SymboolCode` (Task 7), `KleurPalet` (fase 1)
- Produces:
  - `<ProfielKiezer profielen onGekozen(p: Profiel) onNieuw() onLeerkracht? />` — tegels zijn knoppen met de profielnaam als toegankelijke naam; `#profiel-nieuw`; `#knop-leerkracht` als `onLeerkracht` gegeven is
  - `<NieuwProfiel onKlaar(p: Profiel) onAnnuleer() />` — `#profiel-naam` (input), `#avatar-<icoon>`, `#profiel-verder`, `#profiel-annuleer`
  - StartScherm-props `profiel?: Profiel | null`, `onWissel?: () => void` — kop toont naam en `#knop-wissel`
  - Tour: `zetTourProfiel(id: string | null): void` — "gezien" = in de algemene sleutel `collage-tours-gezien` OF in `collage-tours-gezien:<id>`; markeren schrijft in de profielsleutel als er een profiel is, anders in de algemene

- [ ] **Step 1: Failing tests schrijven**

Voeg toe aan `src/tour/tour.test.ts` (import `zetTourProfiel`):
```ts
  it('onthoudt gezien per profiel en telt de algemene sleutel voor iedereen', () => {
    zetTourProfiel('p1');
    markeerGezien('foto');
    expect(tourGezien('foto')).toBe(true);
    zetTourProfiel('p2');
    expect(tourGezien('foto')).toBe(false);
    localStorage.setItem('collage-tours-gezien', JSON.stringify(['foto']));
    expect(tourGezien('foto')).toBe(true);
    zetTourProfiel(null);
  });
```

`e2e/profielen.spec.ts`:
```ts
import { test, expect, metInstellingen } from './helpers';
import type { Page } from '@playwright/test';

async function maakProfielAan(page: Page, naam: string, pin: string[]) {
  await page.click('#profiel-nieuw');
  await page.fill('#profiel-naam', naam);
  await page.click('#avatar-rocket');
  await page.click('#profiel-verder');
  for (const s of pin) await page.click(`#symbool-${s}`);
  for (const s of pin) await page.click(`#symbool-${s}`);
}

test('iPad: profiel aanmaken, wisselen en met pincode terugkomen', async ({ page }) => {
  await metInstellingen(page, { toestel: 'ipad' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Wie ben jij?' })).toBeVisible();
  await maakProfielAan(page, 'Mila', ['star', 'heart', 'cloud']);
  await expect(page.locator('#start-nieuw')).toBeVisible();
  await expect(page.getByText('Mila')).toBeVisible();

  await page.click('#knop-wissel');
  await page.getByRole('button', { name: 'Mila' }).click();
  for (const s of ['star', 'star', 'star']) await page.click(`#symbool-${s}`);
  await expect(page.getByText('Dat is niet je code. Probeer opnieuw.')).toBeVisible();
  for (const s of ['star', 'heart', 'cloud']) await page.click(`#symbool-${s}`);
  await expect(page.locator('#start-nieuw')).toBeVisible();
});

test('nieuw profiel: twee verschillende pincodes worden geweigerd, lege naam kan niet verder', async ({ page }) => {
  await metInstellingen(page, { toestel: 'ipad' });
  await page.goto('/');
  await page.click('#profiel-nieuw');
  await expect(page.locator('#profiel-verder')).toBeDisabled();
  await page.fill('#profiel-naam', 'Noor');
  await page.click('#profiel-verder');
  for (const s of ['car', 'car', 'car']) await page.click(`#symbool-${s}`);
  for (const s of ['cake', 'car', 'car']) await page.click(`#symbool-${s}`);
  await expect(page.getByText('De codes zijn niet gelijk. Probeer opnieuw.')).toBeVisible();
});

test('PC zonder profielen gaat meteen naar het startscherm', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#start-nieuw')).toBeVisible();
  await expect(page.locator('#knop-wissel')).toHaveCount(0);
});

test('PC met profielen toont de profielkeuze', async ({ page }) => {
  await metInstellingen(page, { toestel: 'pc', profielenAan: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Wie ben jij?' })).toBeVisible();
});
```

- [ ] **Step 2: Run tests — moeten falen**

Run: `npx vitest run src/tour && npx playwright test e2e/profielen.spec.ts --project=chromebook`
Expected: FAIL — `zetTourProfiel` niet geëxporteerd; heading "Wie ben jij?" niet gevonden.

- [ ] **Step 3: Tour per profiel**

In `src/tour/tour.ts`, vervang `gelezen`, `tourGezien` en `markeerGezien` door:
```ts
let profielSleutel: string | null = null;

export function zetTourProfiel(id: string | null): void {
  profielSleutel = id ? `${SLEUTEL}:${id}` : null;
}

function gelezen(sleutel: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(sleutel) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function tourGezien(id: TourId): boolean {
  return gelezen(SLEUTEL).includes(id) || (profielSleutel !== null && gelezen(profielSleutel).includes(id));
}

export function markeerGezien(id: TourId): void {
  const sleutel = profielSleutel ?? SLEUTEL;
  try {
    localStorage.setItem(sleutel, JSON.stringify([...new Set([...gelezen(sleutel), id])]));
  } catch { /* opslag geblokkeerd: tour komt dan opnieuw */ }
}
```

- [ ] **Step 4: Profielschermen**

`src/ui/NieuwProfiel.svelte`:
```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  import KleurPalet from './KleurPalet.svelte';
  import SymboolCode from './SymboolCode.svelte';
  import { db } from '../storage/db';
  import { maakProfiel, PIN_LENGTE, PIN_SYMBOLEN, PROFIEL_SYMBOLEN, type Profiel } from '../storage/profielen';

  let { onKlaar, onAnnuleer }: { onKlaar: (p: Profiel) => void; onAnnuleer: () => void } = $props();
  let stap = $state<'wie' | 'pin' | 'herhaal'>('wie');
  let naam = $state('');
  let symbool = $state(PROFIEL_SYMBOLEN[0]);
  let kleur = $state<string>('#FF6B6B');
  let fout = $state('');
  let eerstePin: string[] = [];

  function pinKlaar(p: string[]) { eerstePin = p; fout = ''; stap = 'herhaal'; }
  async function herhaalKlaar(p: string[]) {
    if (p.join('|') !== eerstePin.join('|')) { fout = 'De codes zijn niet gelijk. Probeer opnieuw.'; stap = 'pin'; return; }
    onKlaar(await maakProfiel(db, { naam: naam.trim().slice(0, 30), symbool, kleur, pin: p }));
  }
</script>

<main class="nieuw">
  <button id="profiel-annuleer" class="terug" onclick={onAnnuleer}><Icon name="arrow-left" /> Terug</button>
  {#if stap === 'wie'}
    <h1>Nieuw profiel</h1>
    <label for="profiel-naam">Hoe heet je?</label>
    <input id="profiel-naam" bind:value={naam} maxlength="30" autocomplete="off" />
    <h2>Kies je teken</h2>
    <div class="avatars">
      {#each PROFIEL_SYMBOLEN as s}
        <button id="avatar-{s}" aria-label={s} class:actief={symbool === s} onclick={() => (symbool = s)}><Icon name={s} size={40} /></button>
      {/each}
    </div>
    <h2>Kies je kleur</h2>
    <KleurPalet waarde={kleur} onKies={(k) => k && (kleur = k)} />
    <button id="profiel-verder" class="hoofd" disabled={!naam.trim()} onclick={() => (stap = 'pin')}>Verder <Icon name="arrow-right" /></button>
  {:else if stap === 'pin'}
    <SymboolCode titel="Kies je geheime code" symbolen={PIN_SYMBOLEN} lengte={PIN_LENGTE} {fout} onKlaar={pinKlaar} />
  {:else}
    <SymboolCode titel="Tik je code nog een keer" symbolen={PIN_SYMBOLEN} lengte={PIN_LENGTE} onKlaar={herhaalKlaar} />
  {/if}
</main>

<style>
  .nieuw { min-height: 100dvh; box-sizing: border-box; padding: max(16px, env(safe-area-inset-top)) 24px 24px; display: flex; flex-direction: column; align-items: center; gap: 14px; max-width: 640px; margin: 0 auto; }
  .terug { align-self: flex-start; padding: 0 18px; }
  label { font-weight: 800; font-size: 1.3rem; }
  input { width: 100%; max-width: 420px; font-size: 1.5rem; padding: 12px 16px; border: 3px solid var(--rand); border-radius: 16px; text-align: center; user-select: text; -webkit-user-select: text; }
  .avatars { display: grid; grid-template-columns: repeat(6, 64px); gap: 8px; }
  .avatars button { background: var(--paneel); }
  .avatars button.actief { background: var(--zon); }
  .hoofd { padding: 0 24px; }
</style>
```

`src/ui/ProfielKiezer.svelte`:
```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  import SymboolCode from './SymboolCode.svelte';
  import { db } from '../storage/db';
  import { controleerPin, PIN_LENGTE, PIN_SYMBOLEN, type Profiel } from '../storage/profielen';

  let { profielen, onGekozen, onNieuw, onLeerkracht }: { profielen: Profiel[]; onGekozen: (p: Profiel) => void; onNieuw: () => void; onLeerkracht?: () => void } = $props();
  let kies = $state.raw<Profiel | null>(null);
  let fout = $state('');

  async function pinKlaar(pin: string[]) {
    const p = kies;
    if (!p) return;
    if (await controleerPin(db, p.id, pin)) { kies = null; fout = ''; onGekozen(p); }
    else fout = 'Dat is niet je code. Probeer opnieuw.';
  }
</script>

<main class="kiezer">
  {#if onLeerkracht}
    <button id="knop-leerkracht" class="slot" aria-label="Leerkracht" onclick={onLeerkracht}><Icon name="lock" /></button>
  {/if}
  {#if !kies}
    <h1>Wie ben jij?</h1>
    <div class="tegels">
      {#each profielen as p (p.id)}
        <button class="tegel" style:--kleur={p.kleur} onclick={() => { kies = p; fout = ''; }}>
          <span class="avatar"><Icon name={p.symbool} size={56} /></span><span>{p.naam}</span>
        </button>
      {/each}
      <button id="profiel-nieuw" class="tegel nieuw" onclick={onNieuw}><Icon name="user-plus" size={56} /><span>Ik ben nieuw</span></button>
    </div>
  {:else}
    <button class="terug" onclick={() => (kies = null)}><Icon name="arrow-left" /> Terug</button>
    <p class="wie"><Icon name={kies.symbool} size={36} /> {kies.naam}</p>
    <SymboolCode titel="Wat is je geheime code?" symbolen={PIN_SYMBOLEN} lengte={PIN_LENGTE} {fout} onKlaar={pinKlaar} />
  {/if}
</main>

<style>
  .kiezer { position: relative; min-height: 100dvh; box-sizing: border-box; padding: max(24px, env(safe-area-inset-top)) 24px 24px; display: flex; flex-direction: column; align-items: center; gap: 18px; }
  .slot { position: absolute; top: max(12px, env(safe-area-inset-top)); right: 12px; background: transparent; }
  h1 { color: var(--koraal); }
  .tegels { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px; width: min(960px, 100%); }
  .tegel { flex-direction: column; gap: 8px; min-height: 160px; border-radius: 24px; box-shadow: var(--schaduw); font-size: 1.2rem; }
  .avatar { display: grid; place-items: center; width: 88px; height: 88px; border-radius: 50%; background: var(--kleur); color: #fff; }
  .nieuw { color: var(--hemel); }
  .terug { align-self: flex-start; padding: 0 18px; }
  .wie { display: flex; align-items: center; gap: 10px; font-size: 1.5rem; font-weight: 800; margin: 0; }
</style>
```

- [ ] **Step 5: StartScherm-kop en App**

In `src/ui/StartScherm.svelte`: breid de props uit en voeg een kop toe.
```ts
  import type { Profiel } from '../storage/profielen';
  let { onStart, profiel = null, onWissel }: { onStart: (c: Collage, opdracht?: string, pakket?: string) => void; profiel?: Profiel | null; onWissel?: () => void } = $props();
```
Direct onder `<h1>Collagemaker</h1>`:
```svelte
  {#if profiel}
    <div class="profiel">
      <span class="avatar" style:--kleur={profiel.kleur}><Icon name={profiel.symbool} size={28} /></span>
      <strong>{profiel.naam}</strong>
      {#if onWissel}<button id="knop-wissel" onclick={onWissel}><Icon name="users" /> Wissel</button>{/if}
    </div>
  {/if}
```
CSS:
```css
  .profiel { display: flex; align-items: center; gap: 10px; font-size: 1.2rem; }
  .profiel .avatar { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; background: var(--kleur); color: #fff; }
  .profiel button { padding: 0 16px; }
```

`src/App.svelte`: voeg toe in het script:
```ts
  import ProfielKiezer from './ui/ProfielKiezer.svelte';
  import NieuwProfiel from './ui/NieuwProfiel.svelte';
  import { profielenActief } from './storage/instellingen';
  import { lijstProfielen, type Profiel } from './storage/profielen';
  import { zetTourProfiel } from './tour/tour';

  let profiel = $state.raw<Profiel | null>(null);
  let profielen = $state.raw<Profiel[]>([]);
  let nieuwProfiel = $state(false);

  async function laadProfielen() { profielen = await lijstProfielen(db); }
  function kiesProfiel(p: Profiel) { profiel = p; nieuwProfiel = false; zetTourProfiel(p.id); }
  function wissel() { profiel = null; zetTourProfiel(null); void laadProfielen(); }
```
Wijzig `onMount` naar:
```ts
  onMount(async () => { inst = await opstart(db); await laadProfielen(); });
```
Wijzig de start-functie zodat nieuwe collages bij het profiel horen:
```ts
  function start(c: Collage, o?: string, p?: string) { collage = { ...c, profielId: profiel?.id ?? null }; opdracht = o ?? null; pakket = p ?? null; }
```
Vervang de markup tussen `{:else if !inst.master || !inst.toestel}` en `<Toast />` door:
```svelte
{:else if !inst.master || !inst.toestel}
  <EersteStart onKlaar={(i) => (inst = i)} />
{:else if profielenActief(inst) && !profiel}
  {#if nieuwProfiel}
    <NieuwProfiel onKlaar={kiesProfiel} onAnnuleer={() => (nieuwProfiel = false)} />
  {:else}
    <ProfielKiezer {profielen} onGekozen={kiesProfiel} onNieuw={() => (nieuwProfiel = true)} />
  {/if}
{:else if collage}
  <EditorScherm {collage} {opdracht} startPakket={pakket} onTerug={terug} />
{:else}
  <StartScherm onStart={start} {profiel} onWissel={profielenActief(inst) ? wissel : undefined} />
{/if}
```

- [ ] **Step 6: Run tests — moeten slagen**

Run: `npx vitest run src/tour && npx playwright test e2e/profielen.spec.ts && npm run test:e2e && npm test && npm run check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: child profiles with symbol pin on shared devices"
```

---

### Task 9: Automatisch bewaren in de editor en "Mijn collages"

**Files:**
- Create: `src/ui/MijnCollages.svelte`, `e2e/opslag.spec.ts`
- Modify: `src/ui/EditorScherm.svelte`, `src/ui/BovenBalk.svelte`, `src/ui/TekstInvoer.svelte`, `src/ui/StartScherm.svelte`, `src/App.svelte`, `e2e/editor.spec.ts`, `e2e/laatste-fixes.spec.ts`

**Interfaces:**
- Consumes: `startAutosave`, `isVolFout` (Task 6), `bewaarCollage`, `laadCollage`, `lijstCollages`, `wisCollages`, `vulAssets`, `CollageSamenvatting` (Task 3), `maakVoorbeeld` (fase 1), `Toestel` (Task 1)
- Produces:
  - EditorScherm-props erbij: `toestel: Toestel`, `vooraf?: AssetStore` (afbeeldingen van een geopende collage)
  - EditorScherm-intern: `laatsteBestand: Collage` (de collage zoals bij openen of bij het laatste `.collage`-bestand; Task 10 werkt hem bij), `afsluiten(): Promise<void>`
  - TekstInvoer-prop `prefix = 'tekst'` → id's `#<prefix>-veld`, `#<prefix>-klaar`, `#<prefix>-annuleer`
  - BovenBalk-prop `onNaam?: () => void` → naam wordt knop `#knop-naam`
  - `<MijnCollages collages onOpen(id) onWis(id) />` — sectie `#mijn-collages`, kaart-knop met de collagenaam als toegankelijke naam, wisknop `#collage-wis-<id>`
  - StartScherm-props erbij: `collages: CollageSamenvatting[]`, `onOpen(id: string)`, `onWis(id: string)`

Gedrag (spec 5, 6, 7):
- Op alle toestellen bewaart de editor automatisch (800 ms na de laatste wijziging, en meteen bij `visibilitychange` naar `hidden` en bij `pagehide`).
- iPad/PC: "Terug" bewaart, maakt een voorbeeld van 320 px en gaat zonder vraag terug naar het startscherm. Er is geen `beforeunload`-vraag meer (automatisch bewaard).
- Chromebook: "Terug" toont de Stoppen-dialoog alleen als de collage gewijzigd is sinds `laatsteBestand`; `beforeunload` vraagt bevestiging onder dezelfde voorwaarde.
- Opslag vol: één melding "Je toestel is vol. Wis een paar oude collages."; andere bewaarfout: één melding "Bewaren lukte niet. Bewaar je collage als foto."
- Naam wijzigen: tik op de naam, typ in de invoerbalk; leeg = niets wijzigen; maximaal 40 tekens.

- [ ] **Step 1: Bestaande e2e aanpassen en nieuwe failing e2e schrijven**

In `e2e/editor.spec.ts`, vervang de test "nieuwe collage openen en terugkeren" door:
```ts
test('PC: terug gaat zonder vraag naar het startscherm', async ({ page }) => {
  await openNieuweCollage(page, 'a4-liggend');
  await page.evaluate(() => {
    const { editor, maakVorm } = window.__collage;
    editor.add(maakVorm({ x: 600, y: 600, vorm: 'rechthoek', breedte: 300, hoogte: 300 }));
  });
  await page.click('#knop-terug');
  await expect(page.locator('#start-nieuw')).toBeVisible();
});

test('Chromebook: terug na een wijziging vraagt eerst', async ({ page }) => {
  await metInstellingen(page, { toestel: 'chromebook' });
  await openNieuweCollage(page, 'a4-liggend');
  await page.evaluate(() => {
    const { editor, maakVorm } = window.__collage;
    editor.add(maakVorm({ x: 600, y: 600, vorm: 'rechthoek', breedte: 300, hoogte: 300 }));
  });
  await page.click('#knop-terug');
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Stoppen' }).click();
  await expect(page.locator('#start-nieuw')).toBeVisible();
});
```
(Voeg `metInstellingen` toe aan de import uit `./helpers`.)

In `e2e/laatste-fixes.spec.ts`: voeg `metInstellingen` toe aan de import, en zet in de tests "herladen vraagt bevestiging alleen na een wijziging" en "Stoppen-dialoog blokkeert Delete" als eerste regel `await metInstellingen(page, { toestel: 'chromebook' });`.

`e2e/opslag.spec.ts`:
```ts
import { test, expect, openNieuweCollage, elementen, metInstellingen } from './helpers';
import type { Page } from '@playwright/test';

async function voegVormToe(page: Page) {
  await page.evaluate(() => {
    const { editor, maakVorm } = window.__collage;
    editor.add(maakVorm({ x: 600, y: 600, vorm: 'hart', breedte: 300, hoogte: 300 }));
  });
}

async function wachtTotBewaard(page: Page, aantal = 1) {
  await page.waitForFunction((n) => (window as any).__opslag.db.collages.count().then((c: number) => c === n), aantal);
}

test('PC: collage blijft bewaard na herladen en is weer te openen', async ({ page }) => {
  await openNieuweCollage(page);
  await voegVormToe(page);
  await wachtTotBewaard(page);
  await page.reload();
  await expect(page.locator('#mijn-collages')).toBeVisible();
  await page.getByRole('button', { name: 'Mijn collage', exact: true }).click();
  await page.waitForFunction(() => window.__collage?.controller);
  expect(await elementen(page)).toHaveLength(1);
});

test('PC: terug maakt een voorbeeld, naam wijzigen, wissen', async ({ page }) => {
  await openNieuweCollage(page);
  await voegVormToe(page);
  await page.click('#knop-naam');
  await page.fill('#naam-veld', 'Mijn hart');
  await page.click('#naam-klaar');
  await page.click('#knop-terug');
  const kaart = page.getByRole('button', { name: 'Mijn hart', exact: true });
  await expect(kaart).toBeVisible();
  await expect(kaart.locator('img')).toHaveAttribute('src', /^data:image\/png/);
  await page.locator('[id^="collage-wis-"]').click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Wissen', exact: true }).click();
  await expect(page.locator('#mijn-collages')).toHaveCount(0);
});

test('iPad: profielen zien elkaars collages niet', async ({ page }) => {
  await metInstellingen(page, { toestel: 'ipad' });
  await page.goto('/');
  for (const naam of ['Ann', 'Bo']) {
    if (naam === 'Bo') await page.click('#knop-wissel');
    await page.click('#profiel-nieuw');
    await page.fill('#profiel-naam', naam);
    await page.click('#profiel-verder');
    for (let i = 0; i < 6; i++) await page.click('#symbool-star');
    if (naam === 'Ann') {
      await page.click('#start-nieuw');
      await page.click('#formaat-vierkant');
      await page.waitForFunction(() => window.__collage?.controller);
      await voegVormToe(page);
      await page.click('#knop-terug');
      await expect(page.locator('#mijn-collages')).toBeVisible();
    }
  }
  await expect(page.locator('#start-nieuw')).toBeVisible();
  await expect(page.locator('#mijn-collages')).toHaveCount(0);
});
```

- [ ] **Step 2: Run e2e — moet falen**

Run: `npx playwright test e2e/opslag.spec.ts e2e/editor.spec.ts --project=chromebook`
Expected: FAIL — `#mijn-collages` niet gevonden; PC-terug toont nog de dialoog.

- [ ] **Step 3: TekstInvoer en BovenBalk**

`src/ui/TekstInvoer.svelte`: props worden
```ts
  let { onKlaar, prefix = 'tekst', placeholder = 'Typ hier je tekst' }: { onKlaar: (tekst: string, id: string | null) => void; prefix?: string; placeholder?: string } = $props();
```
en in de markup: `id="{prefix}-veld"`, `placeholder={placeholder}`, `id="{prefix}-annuleer"`, `id="{prefix}-klaar"`.

`src/ui/BovenBalk.svelte`: voeg `onNaam?: () => void` toe aan props-destructuring en -type, en vervang `<h1>{naam}</h1>` door:
```svelte
  <h1>{#if onNaam}<button id="knop-naam" class="naam" onclick={onNaam}>{naam} <Icon name="pencil" size={20} /></button>{:else}{naam}{/if}</h1>
```
CSS: `.naam { background: transparent; font: inherit; font-weight: 800; max-width: 100%; justify-content: flex-start; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 8px; }`

- [ ] **Step 4: EditorScherm**

In `src/ui/EditorScherm.svelte`:

Imports erbij:
```ts
  import { db } from '../storage/db';
  import { bewaarCollage } from '../storage/collages';
  import { isVolFout, startAutosave } from '../storage/autosave';
  import { maakVoorbeeld } from '../export/voorbeeld';
  import type { Toestel } from '../storage/instellingen';
```
Props worden:
```ts
  let { collage, opdracht = null, startPakket = null, toestel, vooraf, onTerug }: { collage: Collage; opdracht?: string | null; startPakket?: string | null; toestel: Toestel; vooraf?: AssetStore; onTerug: () => void } = $props();
```
Vervang `const assets = new AssetStore();` door:
```ts
  const assets = untrack(() => vooraf) ?? new AssetStore();
```
Voeg na `const editorState = editor.state;` toe:
```ts
  let laatsteBestand: Collage = untrack(() => collage);
  let foutGemeld = false;
  const autosave = startAutosave({
    state: editor.state,
    bewaar: (c) => bewaarCollage(db, c, assets),
    onFout: (e) => {
      if (foutGemeld) return;
      foutGemeld = true;
      toon(isVolFout(e) ? 'Je toestel is vol. Wis een paar oude collages.' : 'Bewaren lukte niet. Bewaar je collage als foto.', 'warning');
    },
  });
  const gewijzigdSindsBestand = () => editor.get().collage !== laatsteBestand;

  async function afsluiten() {
    await autosave.flush();
    if (autosave.heeftBewaard()) {
      try {
        const c = editor.get().collage;
        await bewaarCollage(db, c, assets, await maakVoorbeeld(c, assets, 320));
      } catch { /* een voorbeeld is niet nodig om verder te kunnen */ }
    }
    onTerug();
  }

  function terug() {
    if (toestel === 'chromebook' && gewijzigdSindsBestand()) { vraagTerug = true; return; }
    void afsluiten();
  }
```
Vervang `voorUitladen` en de `onMount` die het registreert door:
```ts
  function voorUitladen(e: BeforeUnloadEvent) {
    if (toestel !== 'chromebook' || !gewijzigdSindsBestand()) return;
    e.preventDefault();
    e.returnValue = '';
  }
  function opVerbergen() { if (document.visibilityState === 'hidden') void autosave.flush(); }
  function opPagehide() { void autosave.flush(); }
  onMount(() => {
    window.addEventListener('beforeunload', voorUitladen);
    document.addEventListener('visibilitychange', opVerbergen);
    window.addEventListener('pagehide', opPagehide);
    return () => {
      window.removeEventListener('beforeunload', voorUitladen);
      document.removeEventListener('visibilitychange', opVerbergen);
      window.removeEventListener('pagehide', opPagehide);
    };
  });
```
Vervang `onDestroy(() => controller?.destroy());` door:
```ts
  onDestroy(() => { controller?.destroy(); void autosave.stop(); });
```
Naam wijzigen — voeg toe:
```ts
  let naamInvoer: { openen(tekst: string, id: string | null): void };
  function naamKlaar(t: string) {
    const n = t.trim().slice(0, 40);
    if (n && n !== editor.get().collage.naam) editor.rename(n);
  }
```
In de `<BovenBalk …>`: vervang `onTerug={() => (vraagTerug = true)}` door `onTerug={terug}` en voeg `onNaam={() => naamInvoer.openen(editor.get().collage.naam, null)}` toe.

Vervang de Stoppen-dialoog door:
```svelte
{#if vraagTerug}
  <Dialoog
    titel="Stoppen met deze collage?"
    tekst="Op deze Chromebook wordt alles gewist bij het uitloggen. Bewaar je collage als bestand als je later verder wil werken."
    knoppen={[
      { label: 'Verder werken', hoofd: true, actie: () => (vraagTerug = false) },
      { label: 'Stoppen', gevaar: true, actie: () => { vraagTerug = false; void afsluiten(); } },
    ]}
  />
{/if}
```
Voeg onderaan, na de bestaande `<TekstInvoer …>`, toe:
```svelte
<TekstInvoer bind:this={naamInvoer} prefix="naam" placeholder="Naam van je collage" onKlaar={(t) => naamKlaar(t)} />
```

- [ ] **Step 5: Mijn collages en App**

`src/ui/MijnCollages.svelte`:
```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  import Dialoog from './Dialoog.svelte';
  import type { CollageSamenvatting } from '../storage/collages';

  let { collages, onOpen, onWis }: { collages: CollageSamenvatting[]; onOpen: (id: string) => void; onWis: (id: string) => void } = $props();
  let teWissen = $state.raw<CollageSamenvatting | null>(null);
</script>

<section id="mijn-collages" aria-labelledby="mijn-collages-titel">
  <h2 id="mijn-collages-titel">Mijn collages</h2>
  <div class="lijst">
    {#each collages as c (c.id)}
      <div class="item">
        <button class="kaart" aria-label={c.naam} onclick={() => onOpen(c.id)}>
          {#if c.voorbeeld}<img src={c.voorbeeld} alt="" />{:else}<span class="leeg"><Icon name="image" size={48} /></span>{/if}
          <span class="naam">{c.naam}</span>
        </button>
        <button id="collage-wis-{c.id}" class="wis" aria-label="{c.naam} wissen" onclick={() => (teWissen = c)}><Icon name="trash" /></button>
      </div>
    {/each}
  </div>
</section>

{#if teWissen}
  <Dialoog
    titel="Deze collage wissen?"
    tekst="Als je {teWissen.naam} wist, is hij voor altijd weg."
    knoppen={[
      { label: 'Niet wissen', hoofd: true, actie: () => (teWissen = null) },
      { label: 'Wissen', gevaar: true, actie: () => { const id = teWissen!.id; teWissen = null; onWis(id); } },
    ]}
  />
{/if}

<style>
  section { width: min(960px, 100%); }
  .lijst { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
  .item { position: relative; }
  .kaart { width: 100%; flex-direction: column; gap: 6px; padding: 10px; border-radius: 20px; box-shadow: var(--schaduw); }
  img, .leeg { width: 100%; height: 130px; object-fit: contain; border-radius: 12px; background: var(--werkvlak); display: grid; place-items: center; }
  .naam { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .wis { position: absolute; top: 6px; right: 6px; background: var(--paneel); color: #c0392b; box-shadow: var(--schaduw); }
</style>
```

`src/ui/StartScherm.svelte`: props erbij `collages = [], onOpen, onWis` (types `CollageSamenvatting[]`, `(id: string) => void`), import `MijnCollages` en `type CollageSamenvatting`. Zet direct na de afsluitende `</div>` van de menukaarten (binnen `{#if stap === 'menu'}`):
```svelte
    {#if collages.length && onOpen && onWis}<MijnCollages {collages} {onOpen} {onWis} />{/if}
```

`src/App.svelte` — script erbij:
```ts
  import { AssetStore } from './assets/store';
  import { laadCollage, lijstCollages, vulAssets, wisCollages, type CollageSamenvatting } from './storage/collages';
  import { toon } from './ui/toast';

  let editorAssets = $state.raw<AssetStore | undefined>(undefined);
  let collages = $state.raw<CollageSamenvatting[]>([]);

  async function herlaadLijst() { collages = await lijstCollages(db, profiel?.id ?? null); }

  async function open(id: string) {
    try {
      const r = await laadCollage(db, id);
      if (!r) return;
      const a = new AssetStore();
      await vulAssets(a, r.blobs);
      editorAssets = a;
      opdracht = null;
      pakket = null;
      collage = r.collage;
    } catch {
      toon('Deze collage kan ik niet openen.', 'warning');
    }
  }

  async function wis(id: string) { await wisCollages(db, [id]); await herlaadLijst(); }
```
Pas aan:
```ts
  onMount(async () => { inst = await opstart(db); await laadProfielen(); await herlaadLijst(); });
  function start(c: Collage, o?: string, p?: string) { editorAssets = undefined; collage = { ...c, profielId: profiel?.id ?? null }; opdracht = o ?? null; pakket = p ?? null; }
  function terug() { collage = null; opdracht = null; pakket = null; editorAssets = undefined; void herlaadLijst(); }
  function kiesProfiel(p: Profiel) { profiel = p; nieuwProfiel = false; zetTourProfiel(p.id); void herlaadLijst(); }
  function wissel() { profiel = null; collages = []; zetTourProfiel(null); void laadProfielen(); }
```
Markup:
```svelte
{:else if collage}
  <EditorScherm {collage} {opdracht} startPakket={pakket} toestel={inst.toestel} vooraf={editorAssets} onTerug={terug} />
{:else}
  <StartScherm onStart={start} {profiel} onWissel={profielenActief(inst) ? wissel : undefined} {collages} onOpen={open} onWis={wis} />
{/if}
```

- [ ] **Step 6: Run tests — moeten slagen**

Run: `npx playwright test e2e/opslag.spec.ts e2e/editor.spec.ts e2e/laatste-fixes.spec.ts`, daarna `npm run test:e2e`, `npm test`, `npm run check`.
Expected: PASS op beide projecten.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: autosave collages and list them under Mijn collages"
```

---

### Task 10: Bewaren en openen als `.collage`-bestand, herinnering op Chromebook

**Files:**
- Modify: `src/ui/ExportDialoog.svelte`, `src/export/bewaar.ts`, `src/ui/EditorScherm.svelte`, `src/ui/StartScherm.svelte`, `src/App.svelte`
- Create: `e2e/bestand.spec.ts`

**Interfaces:**
- Consumes: `naarBestand`, `vanBestand` (Task 4), `CollageFout`, `FOUTTEKST_BESTAND` (Task 2), `kopieVan`, `vulAssets` (Task 3), `startHerinnering` (Task 6)
- Produces:
  - `bestandsnaam(naam, ext: 'png' | 'pdf' | 'collage', datum?)`
  - ExportDialoog-props erbij: `assets: AssetStore`, `onBestandBewaard?: () => void`; knop `#export-collage` "Om verder te werken"
  - Chromebook-Stoppen-dialoog: extra knop "Bewaar als bestand" (opent de bewaardialoog)
  - StartScherm-props erbij: `onOpenBestand?: (f: File) => void` → kaart `#start-open` + verborgen input `#bestand-input` (`accept=".collage,application/zip"`)
  - Chromebook: elke 10 minuten de melding "Vergeet niet je collage als bestand te bewaren." zolang er wijzigingen zijn sinds het laatste bestand

- [ ] **Step 1: Failing e2e schrijven**

`e2e/bestand.spec.ts`:
```ts
import { test, expect, openNieuweCollage, elementen, metInstellingen } from './helpers';

test('Chromebook: bewaren als .collage en later weer openen', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromebook', 'Downloaden testen we op Chromebook');
  await metInstellingen(page, { toestel: 'chromebook' });
  await openNieuweCollage(page);
  await page.evaluate(() => {
    const { editor, maakVorm } = window.__collage;
    editor.add(maakVorm({ x: 600, y: 600, vorm: 'ster', breedte: 300, hoogte: 300 }));
  });
  await page.click('#knop-bewaar');
  await page.click('#export-collage');
  const download = page.waitForEvent('download');
  await page.click('#export-bewaar');
  const d = await download;
  expect(d.suggestedFilename()).toMatch(/\.collage$/);
  const pad = info.outputPath('mijn.collage');
  await d.saveAs(pad);

  await page.click('#knop-terug');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.locator('#start-open')).toBeVisible();

  const kiezer = page.waitForEvent('filechooser');
  await page.click('#start-open');
  await (await kiezer).setFiles(pad);
  await page.waitForFunction(() => window.__collage?.controller);
  const els = await elementen(page);
  expect(els).toHaveLength(1);
  expect(els[0].vorm).toBe('ster');
});

test('kapot bestand geeft een melding', async ({ page }) => {
  await page.goto('/');
  const kiezer = page.waitForEvent('filechooser');
  await page.click('#start-open');
  await (await kiezer).setFiles({ name: 'kapot.collage', mimeType: 'application/zip', buffer: Buffer.from('geen zip') });
  await expect(page.getByText('Dit bestand kan ik niet openen.')).toBeVisible();
  await expect(page.locator('#start-nieuw')).toBeVisible();
});

test('Chromebook: Stoppen-dialoog biedt bewaren als bestand aan', async ({ page }) => {
  await metInstellingen(page, { toestel: 'chromebook' });
  await openNieuweCollage(page);
  await page.evaluate(() => {
    const { editor, maakVorm } = window.__collage;
    editor.add(maakVorm({ x: 600, y: 600, vorm: 'ster', breedte: 300, hoogte: 300 }));
  });
  await page.click('#knop-terug');
  await page.getByRole('button', { name: 'Bewaar als bestand' }).click();
  await expect(page.locator('#export-collage')).toBeVisible();
});

test('iPad toont geen knop om een bestand te openen', async ({ page }) => {
  await metInstellingen(page, { toestel: 'ipad' });
  await page.goto('/');
  await page.click('#profiel-nieuw');
  await page.fill('#profiel-naam', 'Kim');
  await page.click('#profiel-verder');
  for (let i = 0; i < 6; i++) await page.click('#symbool-heart');
  await expect(page.locator('#start-nieuw')).toBeVisible();
  await expect(page.locator('#start-open')).toHaveCount(0);
});
```

- [ ] **Step 2: Run e2e — moet falen**

Run: `npx playwright test e2e/bestand.spec.ts --project=chromebook`
Expected: FAIL — `#export-collage` / `#start-open` niet gevonden.

- [ ] **Step 3: Implementatie**

`src/export/bewaar.ts`: wijzig de signatuur naar `export function bestandsnaam(naam: string, ext: 'png' | 'pdf' | 'collage', datum = new Date()): string`.

`src/ui/ExportDialoog.svelte`:
- imports erbij: `import type { AssetStore } from '../assets/store';` en `import { naarBestand } from '../storage/bestand';`
- props: `let { controller, collage, assets, onSluit, onBestandBewaard }: { controller: CanvasController; collage: Collage; assets: AssetStore; onSluit: () => void; onBestandBewaard?: () => void } = $props();`
- `klaar` krijgt een veld `soort`: `$state.raw<{ blob: Blob; naam: string; voorbeeld: string; soort: 'png' | 'pdf' | 'collage' } | null>(null)`
- vervang de body van `maak`:
```ts
  async function maak(soort: 'png' | 'pdf' | 'collage') {
    bezig = true;
    try {
      const png = controller.exportPng(soort === 'collage' ? 0.5 : 2);
      const blob = soort === 'png' ? await dataUrlNaarBlob(png)
        : soort === 'pdf' ? await maakPdf(png, collage.formaat)
        : await naarBestand(collage, assets, await dataUrlNaarBlob(png));
      klaar = { blob, naam: bestandsnaam(collage.naam, soort), voorbeeld: png, soort };
    } catch {
      toon('Bewaren lukte niet. Probeer het nog eens.', 'warning');
    } finally {
      bezig = false;
    }
  }
```
- in `bewaar()`, vervang `if (r !== 'geannuleerd') { toon('Bewaard!', 'check-circle'); onSluit(); }` door:
```ts
      if (r !== 'geannuleerd') {
        if (klaar.soort === 'collage') onBestandBewaard?.();
        toon('Bewaard!', 'check-circle');
        onSluit();
      }
```
- in de keuze-`div` een derde knop, en de grid naar 3 kolommen (`grid-template-columns: repeat(3, 1fr)`; in de knopstijl `min-height: 140px`):
```svelte
        <button id="export-collage" disabled={bezig} onclick={() => maak('collage')}><Icon name="floppy-disk" size={56} /><span>Om verder te werken</span></button>
```

`src/ui/EditorScherm.svelte`:
- import `import { startHerinnering } from '../storage/herinnering';`
- `<ExportDialoog {controller} collage={$editorState.collage} {assets} onBestandBewaard={() => (laatsteBestand = editor.get().collage)} onSluit={sluitExport} />`
- de bestaande `onBewaar`-handler wordt een functie die ook vanuit de dialoog bruikbaar is:
```ts
  function openBewaren() { selectieVoorExport = editor.get().selectedId; editor.select(null); toonExport = true; }
```
  en `onBewaar={openBewaren}` in BovenBalk.
- Stoppen-dialoog knoppen worden:
```ts
      { label: 'Bewaar als bestand', hoofd: true, actie: () => { vraagTerug = false; openBewaren(); } },
      { label: 'Verder werken', actie: () => (vraagTerug = false) },
      { label: 'Stoppen', gevaar: true, actie: () => { vraagTerug = false; void afsluiten(); } },
```
- herinnering in de tweede `onMount` (die met de listeners): vóór de `return`:
```ts
    const stopHerinnering = toestel === 'chromebook'
      ? startHerinnering({ interval: 10 * 60_000, moet: gewijzigdSindsBestand, toon: () => toon('Vergeet niet je collage als bestand te bewaren.', 'info') })
      : () => {};
```
  en roep `stopHerinnering()` aan in de opruimfunctie.

`src/ui/StartScherm.svelte`:
- prop `onOpenBestand?: (f: File) => void`; script: `let bestandInput: HTMLInputElement;`
- extra kaart na de Uitdaging-kaart:
```svelte
      {#if onOpenBestand}
        <button id="start-open" class="kaart" style:--kleur="var(--mint)" onclick={() => { bestandInput.value = ''; bestandInput.click(); }}>
          <Icon name="folder-open" size={64} /><span>Open bestand</span>
        </button>
      {/if}
```
- na `</main>` (maar binnen het component): 
```svelte
<input id="bestand-input" class="visueel-verborgen" type="file" accept=".collage,application/zip" bind:this={bestandInput}
  onchange={() => { const f = bestandInput.files?.[0]; if (f && onOpenBestand) onOpenBestand(f); }} />
```

`src/App.svelte`:
```ts
  import { vanBestand } from './storage/bestand';
  import { CollageFout, FOUTTEKST_BESTAND } from './document/validatie';
  import { kopieVan } from './document/create';

  async function openBestand(f: File) {
    try {
      const { collage: c, blobs } = await vanBestand(f);
      const a = new AssetStore();
      await vulAssets(a, blobs);
      editorAssets = a;
      opdracht = null;
      pakket = null;
      collage = kopieVan(c, profiel?.id ?? null);
    } catch (e) {
      toon(e instanceof CollageFout ? FOUTTEKST_BESTAND[e.code] : 'Dit bestand kan ik niet openen.', 'warning');
    }
  }
```
In de StartScherm-markup: `onOpenBestand={inst.toestel === 'ipad' ? undefined : openBestand}`.

- [ ] **Step 4: Run tests — moeten slagen**

Run: `npx playwright test e2e/bestand.spec.ts e2e/export.spec.ts`, daarna `npm run test:e2e`, `npm test`, `npm run check`.
Expected: PASS (download-test SKIP op ipad).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: save and open .collage files, Chromebook reminder"
```

---

### Task 11: Leerkrachtmenu

**Files:**
- Create: `src/ui/LeerkrachtMenu.svelte`, `e2e/leerkracht.spec.ts`
- Modify: `src/App.svelte`, `src/ui/StartScherm.svelte`, `src/tour/tour.ts`, `src/tour/tour.test.ts`

**Interfaces:**
- Consumes: `controleerCode` (Task 1), `schrijfInstellingen`, `profielenActief`, `Instellingen`, `Toestel` (Task 1), `lijstProfielen`, `zetPin`, `wisProfiel`, `PIN_SYMBOLEN`, `PIN_LENGTE` (Task 5), `wisAlles` (Task 7), `CijferCode`, `SymboolCode` (Task 7), `Dialoog`, `startTour`, `tourGezien`
- Produces:
  - `<LeerkrachtMenu inst onInstellingen(i: Instellingen) onSluit() />` — eerst de mastercode (fout: "Dat is niet de juiste code."); daarna `#toestel-ipad`, `#toestel-chromebook`, `#toestel-pc`, `#profielen-aan` (alleen pc, `aria-pressed`), per profiel `#pin-reset-<id>` en `#profiel-wis-<id>`, `#alles-wissen`, `#leerkracht-sluit`
  - StartScherm-prop `onLeerkracht?: () => void` → `#knop-leerkracht` rechtsboven
  - TourId `'leerkracht'` met 2 stappen

- [ ] **Step 1: Failing tests schrijven**

In `src/tour/tour.test.ts`, breid de lijst in "heeft een tour voor de editor en voor elk paneel" uit met `'leerkracht'`.

`e2e/leerkracht.spec.ts`:
```ts
import { test, expect, metInstellingen } from './helpers';
import type { Page } from '@playwright/test';

async function openMenu(page: Page, code = '123456') {
  await page.click('#knop-leerkracht');
  for (const c of code) await page.click(`#cijfer-${c}`);
}

test('verkeerde code geeft geen toegang', async ({ page }) => {
  await page.goto('/');
  await openMenu(page, '111111');
  await expect(page.getByText('Dat is niet de juiste code.')).toBeVisible();
  await expect(page.locator('#alles-wissen')).toHaveCount(0);
});

test('toestel wisselen naar iPad toont de profielkeuze', async ({ page }) => {
  await page.goto('/');
  await openMenu(page);
  await page.click('#toestel-ipad');
  await page.click('#leerkracht-sluit');
  await expect(page.getByRole('heading', { name: 'Wie ben jij?' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Wie ben jij?' })).toBeVisible();
});

test('PC: profielen aanzetten', async ({ page }) => {
  await page.goto('/');
  await openMenu(page);
  await page.click('#profielen-aan');
  await expect(page.locator('#profielen-aan')).toHaveAttribute('aria-pressed', 'true');
  await page.click('#leerkracht-sluit');
  await expect(page.getByRole('heading', { name: 'Wie ben jij?' })).toBeVisible();
});

test('profiel: pincode resetten en profiel wissen', async ({ page }) => {
  await metInstellingen(page, { toestel: 'ipad' });
  await page.goto('/');
  await page.click('#profiel-nieuw');
  await page.fill('#profiel-naam', 'Sem');
  await page.click('#profiel-verder');
  for (let i = 0; i < 6; i++) await page.click('#symbool-star');
  await page.click('#knop-wissel');
  await openMenu(page);
  await page.locator('[id^="pin-reset-"]').click();
  for (let i = 0; i < 6; i++) await page.click('#symbool-car');
  await expect(page.getByText('Nieuwe code bewaard.')).toBeVisible();
  await page.click('#leerkracht-sluit');
  await page.getByRole('button', { name: 'Sem' }).click();
  for (let i = 0; i < 3; i++) await page.click('#symbool-car');
  await expect(page.locator('#start-nieuw')).toBeVisible();

  await page.click('#knop-wissel');
  await openMenu(page);
  await page.locator('[id^="profiel-wis-"]').click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Wissen', exact: true }).click();
  await page.click('#leerkracht-sluit');
  await expect(page.getByRole('button', { name: 'Sem' })).toHaveCount(0);
});

test('alles wissen begint opnieuw', async ({ page }) => {
  await page.goto('/');
  await page.click('#start-nieuw');
  await page.click('#formaat-vierkant');
  await page.waitForFunction(() => window.__collage?.controller);
  await page.evaluate(() => {
    const { editor, maakVorm } = window.__collage;
    editor.add(maakVorm({ x: 600, y: 600, vorm: 'ster', breedte: 300, hoogte: 300 }));
  });
  await page.click('#knop-terug');
  await expect(page.locator('#mijn-collages')).toBeVisible();
  await openMenu(page);
  await page.click('#alles-wissen');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Alles wissen', exact: true }).click();
  await expect(page.locator('#start-nieuw')).toBeVisible();
  await expect(page.locator('#mijn-collages')).toHaveCount(0);
});
```
(De laatste test herstart via de e2e-voorinstellingen meteen als PC; zonder voorinstellingen zou het welkomstscherm verschijnen.)

- [ ] **Step 2: Run tests — moeten falen**

Run: `npx vitest run src/tour && npx playwright test e2e/leerkracht.spec.ts --project=chromebook`
Expected: FAIL — `TOURS.leerkracht` ontbreekt; `#knop-leerkracht` niet gevonden.

- [ ] **Step 3: Implementatie**

`src/tour/tour.ts`: wijzig `export type TourId = 'editor' | Paneel;` naar `export type TourId = 'editor' | 'leerkracht' | Paneel;` en voeg aan `TOURS` toe:
```ts
  leerkracht: [
    stap('#toestel-ipad', 'Toestel', 'Kies hier hoe dit toestel gebruikt wordt. Dat bepaalt hoe collages bewaard worden.'),
    stap('#alles-wissen', 'Alles wissen', 'Wis alle profielen en collages, bijvoorbeeld aan het einde van het schooljaar.'),
  ],
```

`src/ui/LeerkrachtMenu.svelte`:
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from './Icon.svelte';
  import CijferCode from './CijferCode.svelte';
  import SymboolCode from './SymboolCode.svelte';
  import Dialoog from './Dialoog.svelte';
  import { db } from '../storage/db';
  import { controleerCode } from '../storage/hash';
  import { profielenActief, schrijfInstellingen, type Instellingen, type Toestel } from '../storage/instellingen';
  import { lijstProfielen, PIN_LENGTE, PIN_SYMBOLEN, wisProfiel, zetPin, type Profiel } from '../storage/profielen';
  import { wisAlles } from '../storage/opstart';
  import { startTour, tourGezien } from '../tour/tour';
  import { toon } from './toast';

  let { inst, onInstellingen, onSluit }: { inst: Instellingen; onInstellingen: (i: Instellingen) => void; onSluit: () => void } = $props();
  let open = $state(false);
  let fout = $state('');
  let profielen = $state.raw<Profiel[]>([]);
  let pinVoor = $state.raw<Profiel | null>(null);
  let pinStap = $state<'pin' | 'herhaal'>('pin');
  let pinFout = $state('');
  let eerstePin: string[] = [];
  let wisVoor = $state.raw<Profiel | null>(null);
  let allesWissen = $state(false);

  const TOESTELLEN: { id: Toestel; naam: string; icoon: string }[] = [
    { id: 'ipad', naam: 'Gedeelde iPad', icoon: 'device-tablet' },
    { id: 'chromebook', naam: 'Chromebook', icoon: 'laptop' },
    { id: 'pc', naam: 'Computer', icoon: 'desktop' },
  ];

  async function codeKlaar(c: string) {
    if (inst.master && (await controleerCode(c, inst.master))) {
      open = true;
      fout = '';
      profielen = await lijstProfielen(db);
      if (!tourGezien('leerkracht')) setTimeout(() => startTour('leerkracht'), 300);
    } else fout = 'Dat is niet de juiste code.';
  }

  async function zet(patch: Partial<Instellingen>) { onInstellingen(await schrijfInstellingen(db, patch)); }

  function pinKlaar(p: string[]) { eerstePin = p; pinFout = ''; pinStap = 'herhaal'; }
  async function pinHerhaal(p: string[]) {
    if (!pinVoor) return;
    if (p.join('|') !== eerstePin.join('|')) { pinFout = 'De codes zijn niet gelijk. Probeer opnieuw.'; pinStap = 'pin'; return; }
    await zetPin(db, pinVoor.id, p);
    pinVoor = null;
    toon('Nieuwe code bewaard.', 'check-circle');
  }

  async function wisBevestigd() {
    const p = wisVoor;
    wisVoor = null;
    if (!p) return;
    await wisProfiel(db, p.id);
    profielen = await lijstProfielen(db);
  }

  async function allesBevestigd() {
    allesWissen = false;
    await wisAlles(db);
    location.reload();
  }

  onMount(() => { fout = ''; });
</script>

<div class="scherm">
  <div class="menu" role="dialog" aria-modal="true" aria-labelledby="leerkracht-titel">
    <button id="leerkracht-sluit" class="sluit" aria-label="Sluiten" onclick={onSluit}><Icon name="x" /></button>
    <h1 id="leerkracht-titel">Voor de leerkracht</h1>
    {#if !open}
      <CijferCode titel="Typ je code" {fout} onKlaar={codeKlaar} />
    {:else if pinVoor}
      <p>Nieuwe geheime code voor <strong>{pinVoor.naam}</strong></p>
      {#if pinStap === 'pin'}
        <SymboolCode titel="Kies de nieuwe code" symbolen={PIN_SYMBOLEN} lengte={PIN_LENGTE} fout={pinFout} onKlaar={pinKlaar} />
      {:else}
        <SymboolCode titel="Nog een keer" symbolen={PIN_SYMBOLEN} lengte={PIN_LENGTE} onKlaar={pinHerhaal} />
      {/if}
      <button onclick={() => (pinVoor = null)}>Annuleer</button>
    {:else}
      <section>
        <h2>Toestel</h2>
        <div class="rij">
          {#each TOESTELLEN as t}
            <button id="toestel-{t.id}" class:actief={inst.toestel === t.id} aria-pressed={inst.toestel === t.id} onclick={() => zet({ toestel: t.id })}>
              <Icon name={t.icoon} /> {t.naam}
            </button>
          {/each}
        </div>
        {#if inst.toestel === 'pc'}
          <button id="profielen-aan" class:actief={inst.profielenAan} aria-pressed={inst.profielenAan} onclick={() => zet({ profielenAan: !inst.profielenAan })}>
            <Icon name="users" /> Profielen {inst.profielenAan ? 'aan' : 'uit'}
          </button>
        {/if}
      </section>
      {#if profielenActief(inst)}
        <section>
          <h2>Profielen</h2>
          {#if !profielen.length}<p>Er zijn nog geen profielen.</p>{/if}
          <ul>
            {#each profielen as p (p.id)}
              <li>
                <span class="naam"><Icon name={p.symbool} /> {p.naam}</span>
                <button id="pin-reset-{p.id}" onclick={() => { pinVoor = p; pinStap = 'pin'; pinFout = ''; }}>Nieuwe code</button>
                <button id="profiel-wis-{p.id}" class="gevaar" aria-label="{p.naam} wissen" onclick={() => (wisVoor = p)}><Icon name="trash" /></button>
              </li>
            {/each}
          </ul>
        </section>
      {/if}
      <section>
        <h2>Alles wissen</h2>
        <button id="alles-wissen" class="gevaar" onclick={() => (allesWissen = true)}><Icon name="trash" /> Alles wissen</button>
      </section>
    {/if}
  </div>
</div>

{#if wisVoor}
  <Dialoog
    titel="Profiel van {wisVoor.naam} wissen?"
    tekst="Alle collages van {wisVoor.naam} worden ook gewist."
    knoppen={[
      { label: 'Niet wissen', hoofd: true, actie: () => (wisVoor = null) },
      { label: 'Wissen', gevaar: true, actie: () => void wisBevestigd() },
    ]}
  />
{/if}

{#if allesWissen}
  <Dialoog
    titel="Alles wissen?"
    tekst="Alle profielen, collages en instellingen worden gewist. Dit kan je niet ongedaan maken."
    knoppen={[
      { label: 'Niet wissen', hoofd: true, actie: () => (allesWissen = false) },
      { label: 'Alles wissen', gevaar: true, actie: () => void allesBevestigd() },
    ]}
  />
{/if}

<style>
  .scherm { position: fixed; inset: 0; z-index: 80; background: rgba(45, 42, 50, 0.45); display: grid; place-items: center; padding: 16px; }
  .menu { position: relative; background: var(--creme); border-radius: 28px; padding: 24px; width: min(640px, 100%); max-height: 92dvh; overflow-y: auto; box-sizing: border-box; display: grid; gap: 16px; }
  .sluit { position: absolute; top: 12px; right: 12px; background: transparent; }
  section { background: var(--paneel); border-radius: 20px; padding: 16px; display: grid; gap: 10px; }
  .rij { display: flex; gap: 8px; flex-wrap: wrap; }
  .rij button, section > button { padding: 0 16px; background: var(--creme); }
  .actief { background: var(--zon) !important; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  li { display: flex; align-items: center; gap: 8px; }
  .naam { flex: 1; display: flex; align-items: center; gap: 8px; font-weight: 700; }
  li button { padding: 0 14px; background: var(--creme); }
  .gevaar { color: #c0392b; }
</style>
```

`src/ui/StartScherm.svelte`: prop `onLeerkracht?: () => void`; als eerste kind van `<main class="start">`:
```svelte
  {#if onLeerkracht}<button id="knop-leerkracht" class="slot" aria-label="Leerkracht" onclick={onLeerkracht}><Icon name="lock" /></button>{/if}
```
CSS: `.start { position: relative; }` en `.slot { position: absolute; top: max(12px, env(safe-area-inset-top)); right: 12px; background: transparent; }`

`src/App.svelte`:
```ts
  import LeerkrachtMenu from './ui/LeerkrachtMenu.svelte';
  let toonLeerkracht = $state(false);

  function nieuweInstellingen(i: Instellingen) {
    inst = i;
    if (!profielenActief(i) && profiel) { profiel = null; zetTourProfiel(null); }
    void laadProfielen();
    void herlaadLijst();
  }
```
Geef `onLeerkracht={() => (toonLeerkracht = true)}` mee aan `ProfielKiezer` en `StartScherm`. Voeg vóór `<Toast />` toe:
```svelte
{#if toonLeerkracht && inst}
  <LeerkrachtMenu {inst} onInstellingen={nieuweInstellingen} onSluit={() => { toonLeerkracht = false; void laadProfielen(); }} />
{/if}
```

In `e2e/helpers.ts` staat `'leerkracht'` al in `ALLE_TOURS` (Task 7).

- [ ] **Step 4: Run tests — moeten slagen**

Run: `npx vitest run src/tour && npx playwright test e2e/leerkracht.spec.ts`, daarna `npm run test:e2e`, `npm test`, `npm run check`.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: teacher menu for device type, profiles and full reset"
```

---

### Task 12: Opruimen bij het opstarten

**Files:**
- Create: `src/ui/OpruimDialoog.svelte`, `e2e/opruimen.spec.ts`
- Modify: `src/storage/opstart.ts`, `src/App.svelte`

**Interfaces:**
- Consumes: `ruimAutomatischOp`, `teVragen`, `DAG` (Task 5), `wisCollages`, `CollageSamenvatting` (Task 3)
- Produces:
  - `opstart` vraagt op iPad/PC `navigator.storage.persist()` aan en roept `ruimAutomatischOp` aan (fouten worden genegeerd: opruimen mag het opstarten nooit blokkeren); op Chromebook niet
  - `<OpruimDialoog collages onJa() onLater() />` — knoppen "Ja, wissen" en "Later"
  - App vraagt per sessie hoogstens één keer per profiel (of zonder profiel) om collages tussen 30 en 60 dagen te wissen, zodra het startscherm verschijnt

- [ ] **Step 1: Failing e2e schrijven**

`e2e/opruimen.spec.ts`:
```ts
import { test, expect } from './helpers';
import type { Page } from '@playwright/test';

const DAG = 86_400_000;

async function zaaiCollage(page: Page, naam: string, dagenOud: number) {
  await page.evaluate(async ([n, dagen]) => {
    const db = (window as any).__opslag.db;
    const nu = Date.now();
    const id = crypto.getRandomValues(new Uint32Array(4)).join('-');
    const data = { id, versie: 1, naam: n, profielId: null, formaat: 'vierkant', achtergrond: { soort: 'kleur', kleur: '#FFFFFF' }, elementen: [], aangemaakt: nu, gewijzigd: nu - (dagen as number) * 86_400_000 };
    await db.collages.put({ id, profielId: '', naam: n, gewijzigd: data.gewijzigd, data, voorbeeld: null });
  }, [naam, dagenOud] as const);
}

test('oude collages: 40 dagen = vraag, 70 dagen = stil gewist', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#start-nieuw')).toBeVisible();
  await zaaiCollage(page, 'Vers', 2);
  await zaaiCollage(page, 'Oud', 40);
  await zaaiCollage(page, 'Heel oud', 70);
  await page.reload();
  await expect(page.getByRole('alertdialog')).toContainText('Deze oude collages wissen?');
  await expect(page.getByRole('alertdialog')).toContainText('Oud');
  await expect(page.getByRole('alertdialog')).not.toContainText('Heel oud');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Ja, wissen' }).click();
  await expect(page.getByRole('button', { name: 'Vers', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Oud', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Heel oud', exact: true })).toHaveCount(0);
});

test('Later houdt de collages en vraagt deze sessie niet opnieuw', async ({ page }) => {
  await page.goto('/');
  await zaaiCollage(page, 'Oud', 40);
  await page.reload();
  await page.getByRole('button', { name: 'Later' }).click();
  await expect(page.getByRole('button', { name: 'Oud', exact: true })).toBeVisible();
  await page.click('#start-nieuw');
  await page.click('#formaat-vierkant');
  await page.waitForFunction(() => window.__collage?.controller);
  await page.click('#knop-terug');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});
```

- [ ] **Step 2: Run e2e — moet falen**

Run: `npx playwright test e2e/opruimen.spec.ts --project=chromebook`
Expected: FAIL — geen dialoog "Deze oude collages wissen?".

- [ ] **Step 3: Implementatie**

`src/storage/opstart.ts`: import `ruimAutomatischOp` uit `./opruimen` en vervang `opstart` door:
```ts
export async function opstart(db: CollageDb): Promise<Instellingen> {
  if (import.meta.env.MODE === 'e2e') await zaaiE2e(db);
  const inst = await leesInstellingen(db);
  if (inst.toestel && inst.toestel !== 'chromebook') {
    try { await navigator.storage?.persist?.(); } catch { /* niet ondersteund */ }
    try { await ruimAutomatischOp(db); } catch { /* opruimen mag opstarten nooit blokkeren */ }
  }
  return inst;
}
```

`src/ui/OpruimDialoog.svelte`:
```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  import type { CollageSamenvatting } from '../storage/collages';
  let { collages, onJa, onLater }: { collages: CollageSamenvatting[]; onJa: () => void; onLater: () => void } = $props();
</script>

<div class="scherm" role="presentation">
  <div class="dialoog" role="alertdialog" aria-modal="true" aria-labelledby="opruim-titel">
    <h2 id="opruim-titel">Deze oude collages wissen?</h2>
    <p>Je hebt er al meer dan een maand niet meer aan gewerkt.</p>
    <ul>
      {#each collages as c (c.id)}
        <li>
          {#if c.voorbeeld}<img src={c.voorbeeld} alt="" />{:else}<span class="leeg"><Icon name="image" /></span>{/if}
          <span>{c.naam}</span>
        </li>
      {/each}
    </ul>
    <div class="knoppen">
      <button class="hoofd" onclick={onLater}>Later</button>
      <button class="gevaar" onclick={onJa}>Ja, wissen</button>
    </div>
  </div>
</div>

<style>
  .scherm { position: fixed; inset: 0; background: rgba(45, 42, 50, 0.45); display: grid; place-items: center; z-index: 90; padding: 16px; }
  .dialoog { background: var(--paneel); border-radius: 28px; padding: 24px; width: min(520px, 100%); max-height: 90dvh; overflow-y: auto; box-shadow: var(--schaduw); }
  ul { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; }
  li { display: grid; gap: 4px; text-align: center; font-weight: 700; }
  img, .leeg { width: 100%; height: 90px; object-fit: contain; background: var(--werkvlak); border-radius: 12px; display: grid; place-items: center; }
  .knoppen { display: flex; gap: 12px; justify-content: flex-end; }
  .knoppen button { padding: 0 22px; }
  .hoofd { background: var(--koraal); color: #fff; }
  .gevaar { background: #fde2e1; color: #c0392b; }
</style>
```

`src/App.svelte`:
```ts
  import OpruimDialoog from './ui/OpruimDialoog.svelte';
  import { teVragen } from './storage/opruimen';

  let teOpruimen = $state.raw<CollageSamenvatting[]>([]);
  const gevraagd = new Set<string>();

  async function vraagOpruimen() {
    if (!inst || inst.toestel === 'chromebook') return;
    const sleutel = profiel?.id ?? '';
    if (gevraagd.has(sleutel)) return;
    gevraagd.add(sleutel);
    teOpruimen = await teVragen(db, profiel?.id ?? null);
  }

  async function opruimenJa() {
    const ids = teOpruimen.map((c) => c.id);
    teOpruimen = [];
    await wisCollages(db, ids);
    await herlaadLijst();
  }
```
Roep `void vraagOpruimen();` aan aan het einde van `herlaadLijst` (na het zetten van `collages`), zodat het gebeurt zodra een startscherm met lijst geladen is. Voeg vóór `<Toast />` toe:
```svelte
{#if teOpruimen.length && !collage}
  <OpruimDialoog collages={teOpruimen} onJa={() => void opruimenJa()} onLater={() => (teOpruimen = [])} />
{/if}
```

- [ ] **Step 4: Run tests — moeten slagen**

Run: `npx playwright test e2e/opruimen.spec.ts`, daarna `npm run test:e2e`, `npm test`, `npm run check`.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: ask to remove month-old collages and auto-remove after two months"
```

---

### Task 13: Testen op een echte iPad, Chromebook en PC

**Files:**
- Modify: `vite.config.ts`, `package.json`
- Create: `docs/testen-op-toestellen.md`

**Interfaces:** geen.

Een service worker, "Voeg toe aan beginscherm" en `navigator.storage.persist()` werken alleen via https. Voor testen op het lokale netwerk krijgt de dev-server een zelfondertekend certificaat.

- [ ] **Step 1: HTTPS-devserver**

Run: `npm install -D @vitejs/plugin-basic-ssl`

`vite.config.ts`: importeer `import basicSsl from '@vitejs/plugin-basic-ssl';` en wijzig de export naar een functie:
```ts
export default defineConfig(({ mode }) => ({
  plugins: [svelte(), ...(process.env.VITEST ? [pwaStub] : [pwa]), ...(mode === 'lan' ? [basicSsl()] : [])],
  test: {
    include: ['src/**/*.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
}));
```
`package.json` → scripts: `"dev:lan": "vite --host --mode lan"`.

Run: `npm test && npm run check && npm run build`
Expected: PASS.

- [ ] **Step 2: Handleiding**

`docs/testen-op-toestellen.md`:
```markdown
# Testen op een echte iPad, Chromebook of PC

1. Start op de pc: `npm run dev:lan`. De terminal toont een adres zoals `https://192.168.1.20:5173`.
2. Open dat adres op het toestel. De browser waarschuwt voor het certificaat: kies "Toch doorgaan" (op iPad: "Toon details" → "Bezoek deze website").
3. Eerste start: kies een code van 6 cijfers en het toesteltype.

## Controlelijst fase 2

iPad (Safari):
- Profiel aanmaken, collage maken, app helemaal sluiten (veeg weg), opnieuw openen: collage staat bij "Mijn collages".
- Twee profielen: ze zien elkaars collages niet. Verkeerde code: melding, geen toegang.
- Leerkrachtmenu: code van een ander profiel resetten; profiel wissen.
- Voeg de app toe aan het beginscherm, zet vliegtuigmodus aan, open de app: profielen en collages zijn er.
- "Bewaar" → "Om verder te werken": bewaar in Bestanden. (Openen van een bestand gebeurt op iPad niet in fase 2.)

Chromebook (Chrome):
- Collage maken, "Bewaar" → "Om verder te werken": er wordt een `.collage`-bestand gedownload.
- Terug zonder bewaren: de Stoppen-vraag verschijnt. Herladen: de browser vraagt bevestiging.
- Uitloggen en opnieuw inloggen, "Open bestand": de collage komt terug.
- Wacht 10 minuten met een niet-bewaarde wijziging: de herinnering verschijnt.

PC:
- Collage maken, browser sluiten, opnieuw openen: collage staat bij "Mijn collages".
- Leerkrachtmenu: profielen aanzetten, profiel aanmaken.
- Installeer de app ("App installeren" in de adresbalk) en controleer dat hij offline opent.

## Code vergeten

Wis de sitegegevens van de app in de browser (Safari: Instellingen → Safari → Geavanceerd → Websitedata; Chrome: slotje in de adresbalk → Sitegegevens). Alle collages op dat toestel zijn dan weg.
```

- [ ] **Step 3: Handmatig doorlopen en fouten melden**

Doorloop de controlelijst op de toestellen. Voor elke fout: eerst een falende test (unit of e2e), dan de oplossing, commit met `fix: ...`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: https dev server for device testing and phase 2 checklist"
```
