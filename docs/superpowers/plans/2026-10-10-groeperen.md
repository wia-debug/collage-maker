# Meerdere elementen kiezen en groeperen — uitvoeringsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kinderen kiezen meerdere elementen (selectiekader of "Meer kiezen"/Shift+klik), bewerken ze samen en maken er een groep van die bewaard blijft.

**Architecture:** Een optioneel veld `groep` op elk element (platte lijst, oude collages blijven geldig). De editor-store houdt een lijst gekozen ids bij en breidt keuzes uit naar hele groepen; nieuwe acties op meerdere elementen zijn elk één stap voor ongedaan maken. Het canvas geeft de bestaande Konva-transformer meerdere nodes, laat gekozen elementen samen slepen en tekent een selectiekader. Pure hulpfuncties voor draaien/spiegelen van een keuze staan in `src/editor/keuze.ts`; een nieuwe `KeuzeBalk` toont de knoppen voor een keuze.

**Tech Stack:** Svelte 5, TypeScript 6, Konva, Vitest 4 (browser mode), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-10-groeperen-design.md`

## Global Constraints

- Geen emoji, alleen Phosphor-symbolen via `Icon`; Nederlandse UI-tekst; knoppen minimaal 56 px; werkt met vinger en muis.
- `Basis.groep?: string` (16 hex-tekens, via `crypto.getRandomValues`); nooit `crypto.randomUUID`.
- Kiezen breidt altijd uit naar de hele groep. Vastgezette elementen worden niet mee gekozen door het kader en niet verplaatst, gewist of gekopieerd als deel van een keuze.
- Elke actie op een keuze is één stap voor ongedaan maken; een actie zonder verandering maakt geen stap.
- Selectiekader: start op een lege plek met het selectiegereedschap; kiest elementen waarvan het omhullende vak helemaal binnen valt; beweging < 8 schermpixels = gewone tik.
- Meer dan één node in de transformer: alleen hoekankers, `keepRatio(true)`.
- Ids: `#knop-meer` (icoon `selection-plus`, tekst "Meer", `aria-pressed`), `#ctx-groepeer` (icoon `selection-all`, "Groepeer"), `#ctx-groep-los` (icoon `selection-slash`, "Groep los").
- Commits: Conventional Commits, trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Eén Vitest-proces tegelijk. Elk e2e-bestand importeert `test`/`expect` uit `e2e/helpers.ts`.

## Review Focus

1. **Een keuze bevat een vastgezet element (via een groep) en het kind sleept, wist of kopieert:** het vastgezette element blijft staan en blijft bestaan. Test: Task 2 (store via KeuzeBalk-helpers) en Task 4 (e2e wissen).
2. **Ongedaan maken na groeperen of na samen verplaatsen:** één tik op ongedaan maken zet alles in één keer terug, en de keuze bevat geen verdwenen ids. Test: Task 2.
3. **Selectiekader op een vol canvas of buiten het canvas begonnen:** kader werkt ook vanaf de grijze rand rond het blad; een korte tik laat alles los. Test: Task 3.
4. **Een oude of gedeelde collage met een "groep" van één element of een ongeldig groepveld:** groep van één wordt losgemaakt; ongeldig type geeft de gewone foutmelding. Test: Task 1.
5. **Twee vingers knijpen terwijl meerdere elementen gekozen zijn:** niets gebeurt (geen half geschaalde keuze). Test: Task 3.

---

## Bestandsstructuur

```
src/document/types.ts, create.ts, validatie.ts   Basis.groep, nieuwGroepId, validatie + losmaken groep van één
src/editor/vergelijk.ts                          'groep' telt als transformveld (geen nieuwe render)
src/editor/store.ts                              selectedIds + acties op meerdere elementen
src/editor/keuze.ts                              midden, draaiKeuze, spiegelKeuze, isEenGroep, schuifKeuze
src/editor/canvas.ts                             transformer met meerdere nodes, samen slepen, selectiekader, meer-kiezen
src/ui/KeuzeBalk.svelte                          knoppen voor een keuze van meerdere elementen
src/ui/BovenBalk.svelte, EditorScherm.svelte     #knop-meer, koppeling, toetsen, paneel dicht
src/tour/tour.ts                                 stap #knop-meer
e2e/groeperen.spec.ts                            e2e
```

---

### Task 1: Groepveld in het datamodel

**Files:**
- Modify: `src/document/types.ts`, `src/document/create.ts`, `src/document/validatie.ts`, `src/editor/vergelijk.ts`
- Test: `src/document/validatie.test.ts`, `src/document/create.test.ts`, `src/editor/vergelijk.test.ts`

**Interfaces:**
- Produces:
  - `Basis.groep?: string`
  - `nieuwGroepId(): string` in `create.ts` (16 hex-tekens)
  - `leesCollage`: `groep` aanwezig en geen string → `CollageFout('ongeldig')`; een groep die maar bij één element voorkomt wordt verwijderd (veld weg).
  - `alleenTransform` beschouwt `groep` als transformveld (een groepswijziging tekent niets opnieuw).

- [ ] **Step 1: Failing tests**

`src/document/validatie.test.ts` (imports uitbreiden met `maakVorm`):
```ts
describe('groepen', () => {
  const vorm = (groep?: unknown) => {
    const v: Record<string, unknown> = { ...maakVorm({ x: 0, y: 0, vorm: 'ster', breedte: 10, hoogte: 10 }) };
    if (groep !== undefined) v.groep = groep;
    return v;
  };
  it('oude collage zonder groep blijft geldig', () => {
    expect(leesCollage({ ...nieuweCollage('vierkant'), elementen: [vorm()] }).elementen[0].groep).toBeUndefined();
  });
  it('groep met twee leden blijft', () => {
    const c = leesCollage({ ...nieuweCollage('vierkant'), elementen: [vorm('aaaaaaaaaaaaaaaa'), vorm('aaaaaaaaaaaaaaaa')] });
    expect(c.elementen.map((e) => e.groep)).toEqual(['aaaaaaaaaaaaaaaa', 'aaaaaaaaaaaaaaaa']);
  });
  it('groep van één wordt losgemaakt', () => {
    const c = leesCollage({ ...nieuweCollage('vierkant'), elementen: [vorm('bbbbbbbbbbbbbbbb'), vorm()] });
    expect('groep' in c.elementen[0]).toBe(false);
  });
  it('groep die geen tekst is, is ongeldig', () => {
    expect(() => leesCollage({ ...nieuweCollage('vierkant'), elementen: [vorm(5), vorm(5)] })).toThrow(CollageFout);
  });
});
```
`src/document/create.test.ts`:
```ts
it('nieuwGroepId geeft 16 hex-tekens en telkens een andere', () => {
  const a = nieuwGroepId(), b = nieuwGroepId();
  expect(a).toMatch(/^[0-9a-f]{16}$/);
  expect(a).not.toBe(b);
});
```
`src/editor/vergelijk.test.ts`: voeg `{ groep: 'aaaaaaaaaaaaaaaa' }` toe aan de lijst met patches die als transform gelden (zelfde stijl als de bestaande `it`).

- [ ] **Step 2: RED** — `npx vitest run src/document src/editor/vergelijk.test.ts` → FAIL.

- [ ] **Step 3: Implement**

`types.ts`, in `Basis` na `vergrendeld`:
```ts
  groep?: string; // 16 hex-tekens; elementen met dezelfde groep gedragen zich als één
```
`create.ts`:
```ts
export const nieuwGroepId = (): string =>
  Array.from(crypto.getRandomValues(new Uint8Array(8)), (x) => x.toString(16).padStart(2, '0')).join('');
```
`validatie.ts`: in de elementlus de voorwaarde uitbreiden met `(e.groep !== undefined && typeof e.groep !== 'string') ||` (zodat zo'n element `CollageFout('ongeldig')` geeft). In het `return`-deel, waar de fase 4-velden aangevuld worden, ook groepen van één losmaken:
```ts
  const telling = new Map<string, number>();
  for (const e of c.elementen as Record<string, unknown>[]) if (typeof e.groep === 'string') telling.set(e.groep, (telling.get(e.groep) ?? 0) + 1);
  const elementen = (c.elementen as Record<string, unknown>[]).map((e) => {
    let uit: Record<string, unknown> = e.type === 'foto' ? { ...e, verhoudingVast: e.verhoudingVast ?? true, uitknipsel: e.uitknipsel ?? false } : e;
    if (typeof uit.groep === 'string' && telling.get(uit.groep) === 1) { const { groep: _, ...rest } = uit; uit = rest; }
    return uit;
  });
```
(Pas de bestaande `elementen`-mapping aan; behoud het gedrag voor foto's.)
`vergelijk.ts`: `'groep'` toevoegen aan `TRANSFORM`.

- [ ] **Step 4: GREEN** — `npx vitest run src/document src/editor`, `npm run check` → PASS, 0 fouten.

- [ ] **Step 5: Commit**
```bash
git add src
git commit -m "feat(document): optional group id on elements"
```

---

### Task 2: Editor-store met meerdere gekozen elementen en keuze-hulpfuncties

**Files:**
- Modify: `src/editor/store.ts`, `src/storage/autosave.test.ts` (EditorState-literal), `src/editor/canvas.ts` (alleen `selectedId`-gebruik dat breekt; zie Step 3)
- Create: `src/editor/keuze.ts`, `src/editor/keuze.test.ts`
- Test: `src/editor/store.test.ts`

**Interfaces:**
- Consumes: `nieuwGroepId` (Task 1).
- Produces:
  - `EditorState { collage; selectedIds: string[]; selectedId: string | null; canUndo; canRedo }` — `selectedId` is afgeleid: het id als er precies één gekozen is, anders `null` (bestaande code voor één element blijft zo werken).
  - Editor-methoden (bestaande blijven): `select(id: string | null)` (breidt uit naar groep), `selectMany(ids: string[])`, `toggleSelect(id: string)`, `updateMany(patches: Record<string, Partial<Element>>)`, `duplicateMany(ids: string[])`, `moveMany(ids: string[], richting: Richting)`, `groepeer(ids: string[])`, `groepLos(groep: string)`.
  - `add(el)` kiest `[el.id]`; `duplicate(id)` blijft voor één element.
  - `src/editor/keuze.ts`: `midden(els: Element[]): { x: number; y: number }` (midden van min/max van de x/y-middelpunten), `draaiKeuze(els, graden): Record<string, Partial<Element>>`, `spiegelKeuze(els): Record<string, Partial<Element>>`, `schuifKeuze(els, dx, dy): Record<string, Partial<Element>>`, `isEenGroep(keuze: Element[], alle: Element[]): string | null` (de groeps-id als de keuze precies alle leden van één groep is, anders null). Alle helpers slaan vastgezette elementen over (die krijgen geen patch).

- [ ] **Step 1: Failing tests**

`src/editor/store.test.ts` (bovenaan bestaande imports + `maakVorm`):
```ts
describe('meerdere kiezen en groeperen', () => {
  const opzet = () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    const [a, b, c] = [100, 300, 500].map((x) => maakVorm({ x, y: 100, vorm: 'ster', breedte: 50, hoogte: 50 }));
    ed.add(a); ed.add(b); ed.add(c);
    return { ed, a, b, c };
  };

  it('selectedId alleen bij precies één', () => {
    const { ed, a, b } = opzet();
    ed.selectMany([a.id, b.id]);
    expect(ed.get().selectedIds).toEqual([a.id, b.id]);
    expect(ed.get().selectedId).toBeNull();
    ed.select(a.id);
    expect(ed.get().selectedId).toBe(a.id);
  });

  it('groeperen is één stap en kiezen breidt uit naar de groep', () => {
    const { ed, a, b, c } = opzet();
    const stappen = ed.get().canUndo;
    ed.groepeer([a.id, b.id]);
    const g = ed.get().collage.elementen.find((e) => e.id === a.id)!.groep!;
    expect(g).toMatch(/^[0-9a-f]{16}$/);
    ed.select(null);
    ed.select(b.id);
    expect(ed.get().selectedIds.sort()).toEqual([a.id, b.id].sort());
    ed.toggleSelect(c.id);
    expect(ed.get().selectedIds).toHaveLength(3);
    ed.toggleSelect(a.id);
    expect(ed.get().selectedIds).toEqual([c.id]);
    ed.undo();
    expect(ed.get().collage.elementen.every((e) => e.groep === undefined)).toBe(true);
    expect(stappen).toBe(true);
  });

  it('groep los verwijdert het veld bij alle leden in één stap', () => {
    const { ed, a, b } = opzet();
    ed.groepeer([a.id, b.id]);
    const g = ed.get().collage.elementen[0].groep!;
    ed.groepLos(g);
    expect(ed.get().collage.elementen.some((e) => 'groep' in e)).toBe(false);
    ed.undo();
    expect(ed.get().collage.elementen.filter((e) => e.groep === g)).toHaveLength(2);
  });

  it('updateMany is één stap; zonder verandering geen stap', () => {
    const { ed, a, b } = opzet();
    ed.updateMany({ [a.id]: { x: 1 }, [b.id]: { x: 2 } });
    expect(ed.get().collage.elementen.map((e) => e.x).slice(0, 2)).toEqual([1, 2]);
    ed.undo();
    expect(ed.get().collage.elementen[0].x).toBe(100);
    ed.redo();
    const voor = ed.get().collage;
    ed.updateMany({ [a.id]: { x: 1 } });
    expect(ed.get().collage).toBe(voor);
  });

  it('duplicateMany: kopieën verschoven, nieuwe groep, worden de keuze, vastgezette niet', () => {
    const { ed, a, b, c } = opzet();
    ed.groepeer([a.id, b.id]);
    ed.update(c.id, { vergrendeld: true });
    const oud = ed.get().collage.elementen[0].groep;
    ed.duplicateMany([a.id, b.id, c.id]);
    const els = ed.get().collage.elementen;
    expect(els).toHaveLength(5);
    const kopie = els.slice(3);
    expect(kopie.map((e) => e.x)).toEqual([130, 330]);
    expect(kopie[0].groep).toBe(kopie[1].groep);
    expect(kopie[0].groep).not.toBe(oud);
    expect(ed.get().selectedIds).toEqual(kopie.map((e) => e.id));
  });

  it('moveMany houdt de onderlinge volgorde', () => {
    const { ed, a, b, c } = opzet();
    ed.moveMany([a.id, b.id], 'voorste');
    expect(ed.get().collage.elementen.map((e) => e.id)).toEqual([c.id, a.id, b.id]);
    ed.moveMany([a.id, b.id], 'achter');
    expect(ed.get().collage.elementen.map((e) => e.id)).toEqual([a.id, b.id, c.id]);
    const voor = ed.get().collage;
    ed.moveMany([a.id, b.id], 'achter');
    expect(ed.get().collage).toBe(voor);
  });

  it('keuze wordt opgeschoond na wissen en ongedaan maken', () => {
    const { ed, a, b } = opzet();
    ed.selectMany([a.id, b.id]);
    ed.removeMany([a.id]);
    expect(ed.get().selectedIds).toEqual([b.id]);
    const d = maakVorm({ x: 0, y: 0, vorm: 'hart', breedte: 10, hoogte: 10 });
    ed.add(d);
    ed.undo();
    expect(ed.get().selectedIds).toEqual([]);
  });
});
```

`src/editor/keuze.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { maakVorm } from '../document/create';
import { draaiKeuze, isEenGroep, midden, schuifKeuze, spiegelKeuze } from './keuze';

const v = (x: number, y: number, extra = {}) => ({ ...maakVorm({ x, y, vorm: 'ster', breedte: 10, hoogte: 10 }), ...extra });

describe('keuze', () => {
  it('midden en draaien rond het midden', () => {
    const a = v(0, 0), b = v(200, 0);
    expect(midden([a, b])).toEqual({ x: 100, y: 0 });
    const p = draaiKeuze([a, b], 90);
    expect(p[a.id].x).toBeCloseTo(100);
    expect(p[a.id].y).toBeCloseTo(-100);
    expect(p[a.id].rotatie).toBe(90);
  });
  it('spiegelen rond het midden', () => {
    const a = v(0, 0, { rotatie: 30 }), b = v(200, 0);
    const p = spiegelKeuze([a, b]);
    expect(p[a.id]).toMatchObject({ x: 200, gespiegeld: true, rotatie: 330 });
    expect(p[b.id]).toMatchObject({ x: 0, gespiegeld: true, rotatie: 0 });
  });
  it('vastgezette elementen krijgen geen patch', () => {
    const a = v(0, 0, { vergrendeld: true }), b = v(10, 10);
    expect(Object.keys(schuifKeuze([a, b], 5, 5))).toEqual([b.id]);
    expect(schuifKeuze([a, b], 5, 5)[b.id]).toEqual({ x: 15, y: 15 });
  });
  it('isEenGroep', () => {
    const a = v(0, 0, { groep: 'g' }), b = v(0, 0, { groep: 'g' }), c = v(0, 0);
    expect(isEenGroep([a, b], [a, b, c])).toBe('g');
    expect(isEenGroep([a, b, c], [a, b, c])).toBeNull();
    expect(isEenGroep([a], [a, b, c])).toBeNull();
  });
});
```

- [ ] **Step 2: RED** — `npx vitest run src/editor/store.test.ts src/editor/keuze.test.ts` → FAIL.

- [ ] **Step 3: Implement**

`store.ts` — vervang de enkele keuze door een lijst (alle bestaande methoden blijven):
```ts
export interface EditorState { collage: Collage; selectedIds: string[]; selectedId: string | null; canUndo: boolean; canRedo: boolean }
// ...
  let selectedIds: string[] = [];
  const snapshot = (): EditorState => ({
    collage: history.present, selectedIds, selectedId: selectedIds.length === 1 ? selectedIds[0] : null,
    canUndo: history.canUndo, canRedo: history.canRedo,
  });
  function emit(): void {
    const bestaat = new Set(els().map((e) => e.id));
    if (selectedIds.some((id) => !bestaat.has(id))) selectedIds = selectedIds.filter((id) => bestaat.has(id));
    store.set(snapshot());
  }
  // Alle ids plus de andere leden van hun groepen, in lijstvolgorde.
  function metGroep(ids: string[]): string[] {
    const set = new Set(ids);
    const groepen = new Set(els().filter((e) => set.has(e.id) && e.groep).map((e) => e.groep!));
    return els().filter((e) => set.has(e.id) || (e.groep !== undefined && groepen.has(e.groep))).map((e) => e.id);
  }
  function verandert(e: Element, patch: Partial<Element>): boolean {
    const r = e as unknown as Record<string, unknown>;
    return Object.entries(patch).some(([k, w]) => r[k] !== w);
  }
```
(`emit` moet `els` kunnen gebruiken: definieer `const els = () => history.present.elementen;` vóór `emit`.)
- `add(el)`: `selectedIds = [el.id];` i.p.v. `selectedId = el.id`.
- `load`: `selectedIds = []`.
- Nieuwe/aangepaste methoden:
```ts
    select(id: string | null): void { selectedIds = id ? metGroep([id]) : []; emit(); },
    selectMany(ids: string[]): void { selectedIds = metGroep(ids); emit(); },
    toggleSelect(id: string): void {
      const deel = metGroep([id]);
      const alGekozen = deel.every((x) => selectedIds.includes(x));
      selectedIds = alGekozen ? selectedIds.filter((x) => !deel.includes(x)) : metGroep([...selectedIds, ...deel]);
      emit();
    },
    updateMany(patches: Record<string, Partial<Element>>): void {
      if (!els().some((e) => patches[e.id] && verandert(e, patches[e.id]))) return;
      commit({ elementen: els().map((e) => (patches[e.id] ? ({ ...e, ...patches[e.id] } as Element) : e)) });
    },
    duplicateMany(ids: string[]): void {
      const set = new Set(ids);
      const bron = els().filter((e) => set.has(e.id) && !e.vergrendeld);
      if (!bron.length) return;
      const nieuweGroep = new Map<string, string>();
      const kopie = bron.map((e) => {
        const k = { ...structuredClone(e), id: nieuwId(), x: e.x + 30, y: e.y + 30 } as Element;
        if (e.groep) { if (!nieuweGroep.has(e.groep)) nieuweGroep.set(e.groep, nieuwGroepId()); k.groep = nieuweGroep.get(e.groep); }
        return k;
      });
      selectedIds = kopie.map((e) => e.id);
      commit({ elementen: [...els(), ...kopie] });
      for (const el of kopie) for (const cb of toegevoegd) cb(el);
    },
    moveMany(ids: string[], richting: Richting): void {
      const set = new Set(ids);
      let lijst = [...els()];
      if (richting === 'voorste') lijst = [...lijst.filter((e) => !set.has(e.id)), ...lijst.filter((e) => set.has(e.id))];
      else if (richting === 'achterste') lijst = [...lijst.filter((e) => set.has(e.id)), ...lijst.filter((e) => !set.has(e.id))];
      else if (richting === 'voor') {
        for (let i = lijst.length - 2; i >= 0; i--) if (set.has(lijst[i].id) && !set.has(lijst[i + 1].id)) [lijst[i], lijst[i + 1]] = [lijst[i + 1], lijst[i]];
      } else {
        for (let i = 1; i < lijst.length; i++) if (set.has(lijst[i].id) && !set.has(lijst[i - 1].id)) [lijst[i], lijst[i - 1]] = [lijst[i - 1], lijst[i]];
      }
      if (lijst.every((e, k) => e === els()[k])) return;
      commit({ elementen: lijst });
    },
    groepeer(ids: string[]): void {
      const set = new Set(ids);
      if (set.size < 2) return;
      const g = nieuwGroepId();
      selectedIds = els().filter((e) => set.has(e.id)).map((e) => e.id);
      commit({ elementen: els().map((e) => (set.has(e.id) ? ({ ...e, groep: g } as Element) : e)) });
    },
    groepLos(groep: string): void {
      if (!els().some((e) => e.groep === groep)) return;
      commit({ elementen: els().map((e) => { if (e.groep !== groep) return e; const { groep: _, ...rest } = e; return rest as Element; }) });
    },
```
Opmerking: `toggleSelect` en `select` roepen `emit()` aan, niet `commit` (keuze is geen stap). `metGroep` op een lege lijst geeft `[]`.

`src/editor/keuze.ts`:
```ts
import type { Element } from '../document/types';

type Patches = Record<string, Partial<Element>>;
const vrij = (els: Element[]) => els.filter((e) => !e.vergrendeld);

export function midden(els: Element[]): { x: number; y: number } {
  const xs = els.map((e) => e.x), ys = els.map((e) => e.y);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

export function draaiKeuze(els: Element[], graden: number): Patches {
  const m = midden(els), r = (graden * Math.PI) / 180, cos = Math.cos(r), sin = Math.sin(r);
  return Object.fromEntries(vrij(els).map((e) => {
    const dx = e.x - m.x, dy = e.y - m.y;
    return [e.id, { x: m.x + dx * cos - dy * sin, y: m.y + dx * sin + dy * cos, rotatie: (((e.rotatie + graden) % 360) + 360) % 360 }];
  }));
}

export function spiegelKeuze(els: Element[]): Patches {
  const m = midden(els);
  return Object.fromEntries(vrij(els).map((e) => [e.id, { x: 2 * m.x - e.x, gespiegeld: !e.gespiegeld, rotatie: (360 - e.rotatie) % 360 }]));
}

export function schuifKeuze(els: Element[], dx: number, dy: number): Patches {
  return Object.fromEntries(vrij(els).map((e) => [e.id, { x: e.x + dx, y: e.y + dy }]));
}

export function isEenGroep(keuze: Element[], alle: Element[]): string | null {
  const g = keuze[0]?.groep;
  if (!g || keuze.length < 2 || keuze.some((e) => e.groep !== g)) return null;
  return alle.filter((e) => e.groep === g).length === keuze.length ? g : null;
}
```
(Let op de test: `draaiKeuze` met y-as naar beneden; met de formule hierboven gaat a van (0,0) bij midden (100,0) en 90° naar (100,-100) — dat is wat de test verwacht.)

`autosave.test.ts`: `toestand` krijgt `selectedIds: []` erbij. `canvas.ts` hoeft in deze taak niet te veranderen: `selectedId` bestaat nog (afgeleid). Draai `npm run check` om dat te bevestigen.

- [ ] **Step 4: GREEN** — `npx vitest run src/editor src/storage`, `npm run check` → PASS.

- [ ] **Step 5: Commit**
```bash
git add src
git commit -m "feat(editor): select several elements, group and ungroup in the store"
```

---

### Task 3: Canvas — meerdere nodes, samen slepen, selectiekader, meer kiezen

**Files:**
- Modify: `src/editor/canvas.ts`
- Test: `src/editor/canvas.test.ts`

**Interfaces:**
- Consumes: `selectedIds`, `select`, `selectMany`, `toggleSelect`, `updateMany` (Task 2).
- Produces:
  - `CanvasController.zetMeerKiezen(aan: boolean): void` — als aan: een tik op een element roept `toggleSelect` aan i.p.v. `select`; een tik op een lege plek doet niets.
  - Shift+klik doet hetzelfde als meer kiezen.
  - Transformer: alle gekozen, niet-vastgezette nodes; bij > 1 node hoekankers + `keepRatio(true)`.
  - `transformend` met > 1 node: één `updateMany` met per node de patch van `transformPatch(el, group)` (dezelfde berekening als nu voor één node; voor foto's met afbeelding breedte/hoogte en `herUitsnede`).
  - Slepen van een gekozen element met > 1 in de keuze: de andere (niet-vastgezette) gekozen nodes volgen; bij loslaten één `updateMany`; geen magneetlijnen tijdens samen slepen.
  - Selectiekader: `pointerdown` op het lege stage (target is de stage zelf) in selectiegereedschap start een `Konva.Rect` (name `selectiekader`) in de UI-laag; bij `pointerup` met beweging ≥ 8 schermpixels: kies (`selectMany`, of bij meer kiezen/Shift: huidige keuze + nieuwe) alle niet-vastgezette elementen waarvan `group.getClientRect({ relativeTo: this.content })` helemaal binnen het kader valt; de volgende `click` wordt genegeerd. Bij < 8 px: geen kader-actie (de gewone tik laat alles los).
  - Knijpen met twee vingers alleen bij precies één gekozen element (bestaand gedrag via `selectedId`).

- [ ] **Step 1: Failing tests** (in `src/editor/canvas.test.ts`, met de bestaande `opzet()`/`transformer()`-helpers)

```ts
describe('meerdere elementen', () => {
  it('transformer krijgt alle gekozen nodes met hoekankers en vaste verhouding', () => {
    const { editor, ctrl } = opzet();
    const a = maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    const b = maakVorm({ x: 300, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    editor.add(a); editor.add(b);
    editor.selectMany([a.id, b.id]);
    expect(transformer(ctrl).nodes()).toHaveLength(2);
    expect(transformer(ctrl).keepRatio()).toBe(true);
    expect(transformer(ctrl).enabledAnchors()).toHaveLength(4);
  });

  it('transformend met meerdere nodes is één stap met waarden per element', () => {
    const { editor, ctrl } = opzet();
    const a = maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    const b = maakVorm({ x: 300, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    editor.add(a); editor.add(b);
    editor.selectMany([a.id, b.id]);
    ctrl.group(a.id)!.setAttrs({ x: 90, scaleX: 2, scaleY: 2, rotation: 10 });
    ctrl.group(b.id)!.setAttrs({ x: 310, scaleX: 2, scaleY: 2, rotation: 10 });
    transformer(ctrl).fire('transformend');
    const [ea, eb] = editor.get().collage.elementen;
    expect(ea).toMatchObject({ x: 90, schaalX: 2, schaalY: 2, rotatie: 10 });
    expect(eb).toMatchObject({ x: 310, schaalX: 2, schaalY: 2, rotatie: 10 });
    editor.undo();
    expect(editor.get().collage.elementen.map((e) => e.x)).toEqual([100, 300]);
  });

  it('samen slepen: andere gekozen nodes volgen, één stap', () => {
    const { editor, ctrl } = opzet();
    const a = maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    const b = maakVorm({ x: 300, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    editor.add(a); editor.add(b);
    editor.selectMany([a.id, b.id]);
    const ga = ctrl.group(a.id)!;
    ga.fire('dragstart', { target: ga }, true);
    ga.x(150);
    ga.fire('dragmove', { target: ga }, true);
    expect(ctrl.group(b.id)!.x()).toBe(350);
    ga.fire('dragend', { target: ga }, true);
    expect(editor.get().collage.elementen.map((e) => e.x)).toEqual([150, 350]);
    editor.undo();
    expect(editor.get().collage.elementen.map((e) => e.x)).toEqual([100, 300]);
  });

  it('selectiekader kiest alleen wat helemaal binnen valt, met de hele groep', () => {
    const { editor, ctrl } = opzet();
    const a = maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    const b = maakVorm({ x: 200, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    const c = maakVorm({ x: 900, y: 900, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    const d = maakVorm({ x: 600, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    [a, b, c, d].forEach((e) => editor.add(e));
    editor.groepeer([a.id, c.id]);
    editor.select(null);
    ctrl.kiesInKader({ x: 50, y: 50, width: 250, height: 100 });
    expect(editor.get().selectedIds.sort()).toEqual([a.id, b.id, c.id].sort());
  });

  it('meer kiezen: tikken voegt toe en haalt weg', () => {
    const { editor, ctrl } = opzet();
    const a = maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    const b = maakVorm({ x: 300, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    editor.add(a); editor.add(b);
    editor.select(a.id);
    ctrl.zetMeerKiezen(true);
    const vorm = ctrl.group(b.id)!.getChildren()[0];
    ctrl.stage.fire('click', { target: vorm, evt: new MouseEvent('click') }, true);
    expect(editor.get().selectedIds).toEqual([a.id, b.id]);
    ctrl.stage.fire('click', { target: vorm, evt: new MouseEvent('click') }, true);
    expect(editor.get().selectedIds).toEqual([a.id]);
  });

  it('knijpen doet niets bij meerdere gekozen', () => {
    const { editor, ctrl } = opzet();
    const a = maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    const b = maakVorm({ x: 300, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    editor.add(a); editor.add(b);
    editor.selectMany([a.id, b.id]);
    expect(editor.get().selectedId).toBeNull();
  });
});
```
`kiesInKader(rect: { x: number; y: number; width: number; height: number }, erbij = false): void` is de publieke methode die de pointerup-handler gebruikt (in inhoudscoördinaten); de test roept hem rechtstreeks aan. Het slepen zelf (8 px-drempel) wordt in de e2e van Task 4 getest. Kijk in de bestaande tests hoe `stage.fire('click', ...)` met een target al gebruikt wordt en volg die vorm; pas de aanroep minimaal aan als Konva een andere event-vorm nodig heeft.

- [ ] **Step 2: RED** — `npx vitest run src/editor/canvas.test.ts` → FAIL.

- [ ] **Step 3: Implement** in `canvas.ts`:

```ts
  private meerKiezen = false;
  private kader: { rect: Konva.Rect; start: { x: number; y: number }; scherm: { x: number; y: number }; erbij: boolean } | null = null;
  private negeerKlik = false;
  private samen: { id: string; start: { x: number; y: number }; anderen: { g: Konva.Group; x: number; y: number }[] } | null = null;

  zetMeerKiezen(aan: boolean): void { this.meerKiezen = aan; }

  kiesInKader(r: { x: number; y: number; width: number; height: number }, erbij = false): void {
    const binnen = [...this.nodes.values()].filter((n) => {
      if (n.el.vergrendeld) return false;
      const b = n.group.getClientRect({ relativeTo: this.content });
      return b.x >= r.x && b.y >= r.y && b.x + b.width <= r.x + r.width && b.y + b.height <= r.y + r.height;
    }).map((n) => n.el.id);
    this.editor.selectMany(erbij ? [...this.editor.get().selectedIds, ...binnen] : binnen);
  }

  private transformPatch(el: Element, g: Konva.Group): Partial<Element> {
    const img = el.type === 'foto' && el.assetId ? this.assets.image(el.assetId) : undefined;
    if (el.type === 'foto' && img) {
      const bRuw = Math.max(MIN_MAAT, el.breedte * Math.abs(g.scaleX())), hRuw = Math.max(MIN_MAAT, el.hoogte * Math.abs(g.scaleY()));
      const i = img as HTMLImageElement;
      const bron = { breedte: i.naturalWidth || i.width, hoogte: i.naturalHeight || i.height };
      return { x: g.x(), y: g.y(), rotatie: g.rotation(), breedte: Math.round(bRuw), hoogte: Math.round(hRuw), schaalX: 1, schaalY: 1, uitsnede: herUitsnede(el.uitsnede, bron, bRuw, hRuw) };
    }
    return { x: g.x(), y: g.y(), rotatie: g.rotation(), schaalX: Math.abs(g.scaleX()), schaalY: g.scaleY() };
  }
```
- `sync(s)` roept `this.updateTransformer(s.selectedIds)` aan; `updateTransformer(ids: string[])`:
```ts
    const gekozen = ids.map((id) => this.nodes.get(id)).filter((n): n is NodeInfo => !!n && !n.el.vergrendeld);
    this.transformer.nodes(gekozen.map((n) => n.group));
    if (gekozen.length > 1) { this.transformer.keepRatio(true); this.transformer.enabledAnchors(HOEK_ANKERS); return; }
    const sel = gekozen[0];
    const vrij = sel?.el.type === 'foto' && !!sel.el.assetId && !sel.el.verhoudingVast;
    this.transformer.keepRatio(sel?.el.type !== 'vorm' && !vrij);
    this.transformer.enabledAnchors(vrij ? VRIJE_ANKERS : HOEK_ANKERS);
```
- `transformend`: 
```ts
      const groepen = this.transformer.nodes() as Konva.Group[];
      if (!groepen.length) return;
      const patches: Record<string, Partial<Element>> = {};
      for (const g of groepen) { const el = this.nodes.get(g.id())?.el; if (el) patches[g.id()] = this.transformPatch(el, g); }
      if (groepen.length === 1) this.editor.update(groepen[0].id(), patches[groepen[0].id()]);
      else this.editor.updateMany(patches);
```
- `click tap`: bovenaan `if (this.negeerKlik) { this.negeerKlik = false; return; }`; daarna:
```ts
      const n = this.elementVan(e.target);
      const meer = this.meerKiezen || (e.evt as MouseEvent).shiftKey;
      if (!n) { if (!meer) this.editor.select(null); return; }
      if (meer) { this.editor.toggleSelect(n.el.id); return; }
      this.editor.select(n.el.id);
      if (n.el.type === 'foto' && !n.el.assetId) this.opties.onVakTik?.(n.el.id);
```
- `setGereedschap`: `if (tekenen && this.editor.get().selectedIds.length) this.editor.select(null);`
- Selectiekader: in de bestaande `pointerdown`-handler, vóór `if (this.gereedschap === 'selecteer') return;`:
```ts
      if (this.gereedschap === 'selecteer') {
        if (e.target !== this.stage) return;
        const p = this.content.getRelativePointerPosition();
        const s = this.stage.getPointerPosition();
        if (!p || !s) return;
        const rect = new Konva.Rect({ name: 'selectiekader', x: p.x, y: p.y, width: 0, height: 0, stroke: '#5AA9F2', strokeWidth: 2 / this.stage.scaleX(), dash: [8 / this.stage.scaleX(), 6 / this.stage.scaleX()], fill: 'rgba(90,169,242,0.12)', listening: false });
        this.ui.add(rect);
        this.kader = { rect, start: p, scherm: s, erbij: this.meerKiezen || (e.evt as PointerEvent).shiftKey };
        return;
      }
```
  In `pointermove` (bovenaan): als `this.kader` → werk `x/y/width/height` bij uit `start` en de huidige `content.getRelativePointerPosition()` (min/abs), `this.ui.batchDraw()`, return.
  In `pointerup pointercancel` (bovenaan): als `this.kader`:
```ts
        const k = this.kader; this.kader = null;
        const s = this.stage.getPointerPosition();
        const r = { x: k.rect.x(), y: k.rect.y(), width: k.rect.width(), height: k.rect.height() };
        k.rect.destroy(); this.ui.batchDraw();
        if (e.type === 'pointerup' && s && Math.hypot(s.x - k.scherm.x, s.y - k.scherm.y) >= 8) { this.negeerKlik = true; this.kiesInKader(r, k.erbij); }
        return;
```
  Zorg dat ook `opVensterLos` (pointerup buiten het canvas) een lopend kader afrondt: roep in `opVensterLos` dezelfde afronding aan (extraheer een `rondKaderAf(commit: boolean)`).
- Samen slepen: vervang de `dragstart`-handler:
```ts
    this.content.on('dragstart', (e) => {
      if (e.target.name() !== 'element') return;
      const id = e.target.id();
      if (!this.editor.get().selectedIds.includes(id)) this.editor.select(id);
      const ids = this.editor.get().selectedIds;
      this.samen = ids.length > 1 ? {
        id, start: { x: e.target.x(), y: e.target.y() },
        anderen: ids.filter((x) => x !== id).map((x) => this.nodes.get(x)).filter((n): n is NodeInfo => !!n && !n.el.vergrendeld).map((n) => ({ g: n.group, x: n.group.x(), y: n.group.y() })),
      } : null;
    });
```
  In de `dragmove`-handler: als `this.samen` → `dx = g.x() - start.x`, `dy = g.y() - start.y`, zet elke andere op `x + dx`, `y + dy`, `this.transformer.forceUpdate()`, `this.content.batchDraw()` en return (geen snap). In de `dragend`-handler (de eerste, met `update`): als `this.samen` → `updateMany` met `{x,y}` voor de gesleepte node en alle anderen, `this.samen = null`, return.

- [ ] **Step 4: GREEN** — `npx vitest run src/editor`, `npm run check` → PASS (bestaande canvas-tests blijven groen).

- [ ] **Step 5: Commit**
```bash
git add src/editor
git commit -m "feat(canvas): multi-node transform, drag together, selection box and multi-select mode"
```

---

### Task 4: UI — Meer kiezen, KeuzeBalk, toetsen, rondleiding, e2e

**Files:**
- Create: `src/ui/KeuzeBalk.svelte`, `e2e/groeperen.spec.ts`
- Modify: `src/ui/BovenBalk.svelte`, `src/ui/EditorScherm.svelte`, `src/tour/tour.ts`, `src/tour/tour.test.ts` (aantal stappen als die getest worden), `src/assets/icon-names.json` (+ `selection-plus`, `selection-all`, `selection-slash`; `npm run assets`)

**Interfaces:**
- Consumes: Task 2 (store, keuze.ts), Task 3 (`zetMeerKiezen`).
- Produces:
  - BovenBalk props `meer?: boolean; onMeer?: () => void` → `<button id="knop-meer" aria-pressed={meer} class:actief={meer}>` met `Icon selection-plus` en tekst "Meer", vóór `#knop-help`.
  - `KeuzeBalk.svelte` props `{ editor: Editor; keuze: Element[]; alle: Element[] }`. Ids: `#ctx-groepeer` (als `isEenGroep(keuze, alle) === null`), `#ctx-groep-los` (als het wel één groep is), `#ctx-voor` (moveMany 'voor'), `#ctx-achter` (moveMany 'achter'), `#ctx-kopie` (duplicateMany), `#ctx-draai` (updateMany(draaiKeuze(keuze, 15))), `#ctx-spiegel` (updateMany(spiegelKeuze(keuze))), `#ctx-slot` (als alle vergrendeld: "Los" → alle los; anders "Vast" → alle vast), `#ctx-wissen` (removeMany van de niet-vergrendelde). Zelfde stijl als ContextBalk (zelfde CSS-klasse en positie).
  - EditorScherm:
    - `keuze = $derived(selectedIds → elementen)`; bij `keuze.length > 1`: `<KeuzeBalk>` i.p.v. `<ContextBalk>`, en `paneel = null`.
    - `meerKiezen` state; `onMeer` wisselt het en roept `controller.zetMeerKiezen`; gaat vanzelf uit (en `zetMeerKiezen(false)`) wanneer de keuze van niet-leeg naar leeg gaat.
    - Toetsen: bij > 1 gekozen: wissen → `removeMany` van niet-vergrendelde; kopie → `duplicateMany`; schuif → `updateMany(schuifKeuze(keuze, dx, dy))`; deselecteer blijft `select(null)`.
    - `openBewaren` en `sluitExport` bewaren/herstellen `selectedIds` (via `selectMany`).
  - Tour `editor`: stap `#knop-meer` met titel "Meer kiezen" en tekst "Tik hier en dan op meerdere dingen. Of sleep een kader rond wat je samen wil verplaatsen.", vóór `#knop-ongedaan`.

- [ ] **Step 1: Failing e2e**

`e2e/groeperen.spec.ts`:
```ts
import { test, expect, openNieuweCollage, elementen, tikOpCanvas } from './helpers';
import type { Page } from '@playwright/test';

async function tweeVormen(page: Page) {
  await page.evaluate(() => {
    const { editor, maakVorm } = window.__collage;
    editor.add(maakVorm({ x: 300, y: 300, vorm: 'ster', breedte: 100, hoogte: 100 }));
    editor.add(maakVorm({ x: 500, y: 300, vorm: 'hart', breedte: 100, hoogte: 100 }));
    editor.select(null);
  });
}

async function sleepKader(page: Page, van: [number, number], naar: [number, number]) {
  await page.evaluate(() => new Promise<void>((k) => requestAnimationFrame(() => requestAnimationFrame(() => k()))));
  const a = await page.evaluate(([x, y]) => window.__collage.controller.naarScherm(x, y), van);
  const b = await page.evaluate(([x, y]) => window.__collage.controller.naarScherm(x, y), naar);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2);
  await page.mouse.move(b.x, b.y);
  await page.mouse.up();
}

test('kader slepen, groeperen, samen verplaatsen, bewaard na opnieuw openen', async ({ page }) => {
  await openNieuweCollage(page);
  await tweeVormen(page);
  // Begint buiten het blad, op de grijze rand (Review Focus 3).
  await sleepKader(page, [-20, -20], [650, 450]);
  await expect.poll(() => page.evaluate(() => window.__collage.editor.get().selectedIds.length)).toBe(2);
  await page.click('#ctx-groepeer');
  const [a, b] = await elementen(page);
  expect(a.groep).toBeTruthy();
  expect(a.groep).toBe(b.groep);
  await page.keyboard.press('ArrowRight');
  expect((await elementen(page)).map((e: any) => e.x)).toEqual([305, 505]);
  await page.click('#knop-terug');
  await page.getByRole('button', { name: 'Mijn collage', exact: true }).click();
  await page.waitForFunction(() => window.__collage?.controller);
  const na = await elementen(page);
  expect(na[0].groep).toBe(na[1].groep);
  await tikOpCanvas(page, 305, 300);
  await expect.poll(() => page.evaluate(() => window.__collage.editor.get().selectedIds.length)).toBe(2);
  await expect(page.locator('#ctx-groep-los')).toBeVisible();
});

test('meer kiezen met tikken, dan alles weg', async ({ page }) => {
  await openNieuweCollage(page);
  await tweeVormen(page);
  await page.click('#knop-meer');
  await expect(page.locator('#knop-meer')).toHaveAttribute('aria-pressed', 'true');
  await tikOpCanvas(page, 300, 300);
  await tikOpCanvas(page, 500, 300);
  await expect.poll(() => page.evaluate(() => window.__collage.editor.get().selectedIds.length)).toBe(2);
  await page.click('#ctx-wissen');
  expect(await elementen(page)).toHaveLength(0);
  await expect(page.locator('#knop-meer')).toHaveAttribute('aria-pressed', 'false');
});

test('groep los, daarna één element apart', async ({ page }) => {
  await openNieuweCollage(page);
  await tweeVormen(page);
  await page.evaluate(() => {
    const { editor } = window.__collage;
    editor.groepeer(editor.get().collage.elementen.map((e: any) => e.id));
  });
  await tikOpCanvas(page, 300, 300);
  await page.click('#ctx-groep-los');
  expect((await elementen(page)).every((e: any) => !e.groep)).toBe(true);
  await page.keyboard.press('Escape');
  await tikOpCanvas(page, 300, 300);
  await expect.poll(() => page.evaluate(() => window.__collage.editor.get().selectedIds.length)).toBe(1);
});

test('vastgezet element in een groep blijft staan bij wissen', async ({ page }) => {
  await openNieuweCollage(page);
  await tweeVormen(page);
  await page.evaluate(() => {
    const { editor } = window.__collage;
    const [a, b] = editor.get().collage.elementen;
    editor.update(a.id, { vergrendeld: true });
    editor.groepeer([a.id, b.id]);
    editor.selectMany([a.id, b.id]);
  });
  await page.click('#ctx-wissen');
  expect(await elementen(page)).toHaveLength(1);
});
```
(In de laatste test toont de KeuzeBalk `#ctx-wissen` omdat niet alle elementen vergrendeld zijn.)

- [ ] **Step 2: RED** — `npx playwright test e2e/groeperen.spec.ts --project=chromebook` → FAIL.

- [ ] **Step 3: Implement**

`KeuzeBalk.svelte`:
```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  import type { Element } from '../document/types';
  import type { Editor } from '../editor/store';
  import { draaiKeuze, isEenGroep, spiegelKeuze } from '../editor/keuze';
  let { editor, keuze, alle }: { editor: Editor; keuze: Element[]; alle: Element[] } = $props();
  const ids = $derived(keuze.map((e) => e.id));
  const groep = $derived(isEenGroep(keuze, alle));
  const allesVast = $derived(keuze.every((e) => e.vergrendeld));
  const zetVast = (v: boolean) => editor.updateMany(Object.fromEntries(keuze.map((e) => [e.id, { vergrendeld: v }])));
</script>

<div class="context-balk" role="toolbar" aria-label="Bewerk keuze">
  {#if groep}
    <button id="ctx-groep-los" onclick={() => editor.groepLos(groep)}><Icon name="selection-slash" /><span>Groep los</span></button>
  {:else}
    <button id="ctx-groepeer" onclick={() => editor.groepeer(ids)}><Icon name="selection-all" /><span>Groepeer</span></button>
  {/if}
  {#if allesVast}
    <button id="ctx-slot" onclick={() => zetVast(false)}><Icon name="lock" /><span>Los</span></button>
  {:else}
    <button id="ctx-voor" onclick={() => editor.moveMany(ids, 'voor')}><Icon name="arrow-line-up" /><span>Voor</span></button>
    <button id="ctx-achter" onclick={() => editor.moveMany(ids, 'achter')}><Icon name="arrow-line-down" /><span>Achter</span></button>
    <button id="ctx-kopie" onclick={() => editor.duplicateMany(ids)}><Icon name="copy" /><span>Kopie</span></button>
    <button id="ctx-draai" onclick={() => editor.updateMany(draaiKeuze(keuze, 15))}><Icon name="arrow-clockwise" /><span>Draai</span></button>
    <button id="ctx-spiegel" onclick={() => editor.updateMany(spiegelKeuze(keuze))}><Icon name="flip-horizontal" /><span>Spiegel</span></button>
    <button id="ctx-slot" onclick={() => zetVast(true)}><Icon name="lock-open" /><span>Vast</span></button>
    <button id="ctx-wissen" class="gevaar" onclick={() => editor.removeMany(keuze.filter((e) => !e.vergrendeld).map((e) => e.id))}><Icon name="trash" /><span>Weg</span></button>
  {/if}
</div>

<style>
  .context-balk { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 4px; padding: 6px; background: var(--paneel); border-radius: 22px; box-shadow: var(--schaduw); max-width: calc(100% - 20px); overflow-x: auto; z-index: 5; }
  button { flex-direction: column; gap: 0; font-size: 0.72rem; min-width: 60px; background: transparent; }
</style>
```

`BovenBalk.svelte`: props `meer = false`, `onMeer` en vóór `#knop-help`:
```svelte
  {#if onMeer}<button id="knop-meer" aria-pressed={meer} class:actief={meer} onclick={onMeer}><Icon name="selection-plus" /><span>Meer</span></button>{/if}
```
CSS: `button.actief { background: var(--zon); }`.

`EditorScherm.svelte` (aanvullingen):
```ts
  import KeuzeBalk from './KeuzeBalk.svelte';
  import { schuifKeuze } from '../editor/keuze';
  const keuze = $derived($editorState.selectedIds.map((id) => $editorState.collage.elementen.find((e) => e.id === id)).filter((e): e is Element => !!e));
  let meerKiezen = $state(false);
  let vorigeLengte = 0;
  function zetMeer(v: boolean) { meerKiezen = v; controller?.zetMeerKiezen(v); }
  $effect(() => {
    const n = $editorState.selectedIds.length;
    untrack(() => {
      if (n > 1) paneel = null;
      if (vorigeLengte > 0 && n === 0 && meerKiezen) zetMeer(false);
      vorigeLengte = n;
    });
  });
```
- `<BovenBalk ... meer={meerKiezen} onMeer={() => zetMeer(!meerKiezen)} />`
- In de canvas-markup: `{#if keuze.length > 1}<KeuzeBalk {editor} {keuze} alle={$editorState.collage.elementen} />{:else if geselecteerd}<ContextBalk ... />{/if}`
- `opToets`: na `const el = geselecteerd;`:
```ts
    if (keuze.length > 1 && (actie.soort === 'wissen' || actie.soort === 'kopie' || actie.soort === 'schuif')) {
      if (actie.soort === 'wissen') editor.removeMany(keuze.filter((e) => !e.vergrendeld).map((e) => e.id));
      else if (actie.soort === 'kopie') editor.duplicateMany(keuze.map((e) => e.id));
      else editor.updateMany(schuifKeuze(keuze, actie.dx, actie.dy));
      e.preventDefault();
      return;
    }
```
- `openBewaren`: `selectieVoorExport = [...editor.get().selectedIds]`; `sluitExport`: `if (ids.length) editor.selectMany(ids.filter(...bestaat))` (type `string[]`).

`tour.ts`: stap toevoegen (zie Interfaces); `tour.test.ts` aanpassen als die het aantal editor-stappen telt.

Iconen: voeg `selection-plus`, `selection-all`, `selection-slash` toe aan `src/assets/icon-names.json` en draai `npm run assets`.

- [ ] **Step 4: GREEN** — `npm run check`, `npx vitest run`, `npx playwright test e2e/groeperen.spec.ts e2e/editor.spec.ts e2e/tour.spec.ts e2e/export.spec.ts`, daarna de volledige `npx playwright test` → alles groen.

- [ ] **Step 5: Commit**
```bash
git add src e2e
git commit -m "feat(ui): multi-select button, selection toolbar with group/ungroup, keys and tour"
```
