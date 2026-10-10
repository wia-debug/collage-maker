# Collagemaker fase 4 — leerkrachtmodus en extra's — uitvoeringsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kinderen krijgen camera, achtergrond weg, Mijn stickers, geluid/animatie en een vaste verhouding voor foto's; de leerkracht ontvangt collages van de hele klas (rechtstreeks of via een klasmap op de Worker), bekijkt ze in een galerij, downloadt ze als ZIP of PDF en toont ze als diavoorstelling.

**Architecture:** Kleine, losse modules naast de bestaande: `src/feedback/` (geluid en animatie), `src/import/camera.ts` en `src/import/achtergrond.ts` (camera en on-device achtergrond weg, injecteerbaar voor tests), `src/storage/eigen-stickers.ts` en `src/storage/inzendingen.ts` (twee nieuwe Dexie-tabellen in databaseversie 2), `src/share/klas.ts` (klascode, klas-relay-client, versturen naar de leerkracht, klasontvanger met meerdere verbindingen) en `src/export/klas.ts` (ZIP en PDF van alle inzendingen). De Worker krijgt `/class/...`-routes met hetzelfde sleutel-principe als de brievenbus van fase 3. De UI krijgt een CameraDialoog, een tab Mijn stickers, een KlasOntvangScherm, een Galerij met Diavoorstelling en een keuze "Naar een vriend / Naar de leerkracht" in de DeelDialoog.

**Tech Stack:** bestaand (Svelte 5, TypeScript 6, Vite 8, Konva, Dexie, JSZip, jsPDF, PeerJS, Vitest 4 browser mode, Playwright, Cloudflare Worker + R2) + `@imgly/background-removal` en `@imgly/background-removal-data` (beide exact versie `1.4.5`, AGPL-3.0).

**Spec:** `docs/superpowers/specs/2026-10-10-fase4-leerkracht-extras-design.md` (vult `docs/superpowers/specs/2026-10-08-kids-collage-design.md` aan; bij verschil geldt de fase 4-spec).

## Global Constraints

- Alle constraints van fase 1–3 blijven: nooit emoji (alleen Phosphor-symbolen via `Icon`), Nederlandse UI-tekst, knoppen minimaal 56 px, offline voor alles behalve delen en de eerste download van het achtergrondmodel, geen accounts.
- Gebruik nooit `crypto.randomUUID` of `crypto.subtle`; willekeur via `crypto.getRandomValues`.
- Foto's verlaten het toestel nooit voor "Achtergrond weg"; modelbestanden komen van de eigen site (`/modellen/achtergrond/`), nooit van een externe CDN.
- Klascode: 4 symbolen uit dezelfde 12 als delen (`DEEL_SYMBOLEN`). PeerJS-id = `kidsklas-` + code als letters `a`–`l`. Bezet → nieuwe code, maximaal 5 pogingen.
- Wat over de lijn gaat naar de leerkracht: `{ soort: 'klas', naam: string, bestand: ArrayBuffer }` (het `.collage`-zipbestand). Naam: getrimd, 1–40 tekens.
- Toestemmingsregel voor het kind bij geblokkeerd netwerk is dezelfde als bij delen (`nooit` / `kind` / `leerkracht`); voor het leerkrachttoestel zelf geen aparte vraag (de leerkracht zette de instelling).
- Worker-klasmap: zie tabel in spec §9; token 32 hex-tekens; map leeft 2 u, verlengd door elke lijst-GET tot hooguit 8 u na openen; max 60 inzendingen; 25 MB per inzending; `X-Naam` URI-gecodeerd, gedecodeerd 1–40 tekens.
- Inzendingen en eigen stickers: automatisch gewist na 60 dagen (niet op Chromebook: daar wist de browser zelf). Max 100 eigen stickers per profiel.
- `prefers-reduced-motion: reduce` → nooit animatie.
- Nooit deployen of inloggen op Cloudflare; nooit pushen.
- Elk e2e-bestand importeert `test`/`expect` uit `e2e/helpers.ts`.
- Commits: Conventional Commits, trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Nooit `.superpowers/`, `.claude/`, screenshots of testresultaten committen.
- Draai maar één Vitest-proces tegelijk (parallelle runs hangen op deze machine).

## Review Focus

1. **Een oude collage (van vóór fase 4) wordt geopend of ontvangen:** foto's zonder `verhoudingVast`/`uitknipsel` openen gewoon, met vaste verhouding en ongewijzigde afmetingen. Test: Task 1 (unit op `leesCollage` én via `vanBestand`).
2. **Twee kinderen sturen tegelijk naar de leerkracht, of één kind twee keer:** beide inzendingen komen binnen en blijven apart bewaard. Test: Task 8 (unit, twee verbindingen tegelijk) en Task 11 (e2e, twee kindtoestellen).
3. **Een kapot of nieuwer `.collage`-pakket komt binnen bij de leerkracht:** geweigerd, niet bewaard, het ontvangscherm blijft werken. Test: Task 9 (unit) en Task 8 (ongeldig bericht).
4. **Dubbele of rare namen in de ZIP (twee keer "Lies", "a/b", leeg na opschonen):** `Lies.png`, `Lies 2.png`, `a-b.png`, `collage.png`. Test: Task 12.
5. **Het achtergrondmodel kan niet geladen worden (geen internet de eerste keer):** vriendelijke melding, de foto blijft ongewijzigd, geen half element. Test: Task 4 (unit met falende verwijderfunctie) en e2e.

---

## Bestandsstructuur

```
src/document/types.ts, create.ts, validatie.ts   FotoElement.verhoudingVast, FotoElement.uitknipsel
src/editor/canvas.ts                             transformer volgt verhoudingVast; springOp(id)
src/editor/store.ts                              opToevoegen / opWissen-luisteraars
src/feedback/geluid.ts                           speel(soort), zetGeluid(aan)
src/feedback/animatie.ts                         magAnimeren(), zetAnimatie(aan), vier()
src/import/camera.ts                             startCamera, neemFoto, stopCamera, CameraFout
src/import/achtergrond.ts                        verwijderAchtergrond (injecteerbaar), AchtergrondFout
src/storage/db.ts                                versie 2: eigenStickers, inzendingen
src/storage/eigen-stickers.ts                    bewaarEigenSticker, lijstEigenStickers, wisEigenSticker, snijTransparantBij
src/storage/inzendingen.ts                       bewaarInzending, lijstInzendingen, wisInzending, wisAlleInzendingen
src/storage/opruimen.ts                          + stickers en inzendingen na 60 dagen
src/share/klas.ts                                klasPeerId, maakKlasRelay, stuurNaarLeerkracht, startKlasOntvanger
src/export/klas.ts                               zipNamen, renderInzending, maakKlasZip, maakKlasPdf
src/ui/CameraDialoog.svelte                      camera
src/ui/VoortgangDialoog.svelte                   voortgang (achtergrond weg, PDF)
src/ui/KlasOntvangScherm.svelte                  leerkracht ontvangt
src/ui/Galerij.svelte, Diavoorstelling.svelte    leerkracht bekijkt
src/ui/Confetti.svelte                           confetti-overlay
scripts/copy-model.mjs                           kopieert het achtergrondmodel naar public/modellen/achtergrond
worker/src/index.ts, worker/index.test.ts        /class/-routes
e2e/verhouding.spec.ts, camera.spec.ts, achtergrond-weg.spec.ts, mijn-stickers.spec.ts, klas.spec.ts, galerij.spec.ts, feedback.spec.ts
```

---

### Task 1: Verhouding vastzetten (en nieuwe fotovelden)

**Files:**
- Modify: `src/document/types.ts`, `src/document/create.ts`, `src/document/validatie.ts`, `src/editor/canvas.ts:226-232`, `src/ui/ContextBalk.svelte`, `src/assets/icon-names.json`
- Test: `src/document/validatie.test.ts`, `src/document/create.test.ts`, `src/editor/canvas.test.ts`, `src/storage/bestand.test.ts`, create `e2e/verhouding.spec.ts`; update bestaande e2e die een foto vrij uitrekken (zoek in `e2e/` naar `middle-left`, `scaleX: 2, scaleY: 1` of vrij-uitrek-tests en zet daar eerst `#ctx-verhouding`)

**Interfaces:**
- Produces:
  - `FotoElement.verhoudingVast: boolean` en `FotoElement.uitknipsel: boolean` (types).
  - `maakFoto(...)` geeft `verhoudingVast: true, uitknipsel: false`.
  - `leesCollage` aanvaardt foto's zonder deze velden en vult `verhoudingVast: true`, `uitknipsel: false` in; een aanwezig veld dat geen boolean is → `CollageFout('ongeldig')`.
  - Transformer: foto met afbeelding en `verhoudingVast: false` → alle 8 ankers, `keepRatio(false)`; anders hoekankers en `keepRatio(true)` (vormen blijven `keepRatio(false)` met hoekankers, zoals nu).
  - ContextBalk: knop `#ctx-verhouding` voor een foto met afbeelding, `aria-pressed={verhoudingVast}`; bij vast: icoon `lock-simple-open`, tekst "Verhouding los"; bij los: icoon `lock-simple`, tekst "Verhouding vast". Klik → `editor.update(id, { verhoudingVast: !verhoudingVast })`.
  - Iconen toegevoegd aan `icon-names.json` voor heel fase 4 (één keer `npm run assets`): `lock-simple`, `lock-simple-open`, `camera`, `camera-rotate`, `user-circle`, `play`, `pause`, `caret-left`, `caret-right`, `chalkboard-teacher`, `images`, `speaker-high`, `speaker-slash`, `file-zip`, `corners-out`, `paper-plane-tilt`, `student`, `wifi-slash`.

- [ ] **Step 1: Failing tests**

In `src/document/validatie.test.ts` (bestaande imports uitbreiden met `maakFoto`, `nieuweCollage`):
```ts
describe('fotovelden van fase 4', () => {
  const metFoto = (patch: Record<string, unknown>, weg: string[] = []) => {
    const f: Record<string, unknown> = { ...maakFoto({ x: 0, y: 0, breedte: 100, hoogte: 50, assetId: null }), ...patch };
    for (const k of weg) delete f[k];
    return { ...nieuweCollage('vierkant'), elementen: [f] };
  };
  it('oude foto zonder verhoudingVast en uitknipsel krijgt de standaard', () => {
    const c = leesCollage(metFoto({}, ['verhoudingVast', 'uitknipsel']));
    expect(c.elementen[0]).toMatchObject({ verhoudingVast: true, uitknipsel: false, breedte: 100, hoogte: 50 });
  });
  it('bewaarde waarden blijven', () => {
    const c = leesCollage(metFoto({ verhoudingVast: false, uitknipsel: true }));
    expect(c.elementen[0]).toMatchObject({ verhoudingVast: false, uitknipsel: true });
  });
  it('geen boolean is ongeldig', () => {
    expect(() => leesCollage(metFoto({ verhoudingVast: 'ja' }))).toThrow(CollageFout);
    expect(() => leesCollage(metFoto({ uitknipsel: 1 }))).toThrow(CollageFout);
  });
});
```

In `src/storage/bestand.test.ts` (Review Focus 1, via het bestand):
```ts
it('oud .collage-bestand zonder fase 4-velden opent met vaste verhouding', async () => {
  const f = maakFoto({ x: 0, y: 0, breedte: 100, hoogte: 50, assetId: null }) as Record<string, unknown>;
  delete f.verhoudingVast; delete f.uitknipsel;
  const c = { ...nieuweCollage('vierkant'), elementen: [f] } as unknown as Collage;
  const { collage } = await vanBestand(await naarBestand(c, { blob: () => undefined }));
  expect(collage.elementen[0]).toMatchObject({ verhoudingVast: true, uitknipsel: false });
});
```

In `src/document/create.test.ts` bij de bestaande `maakFoto`-test: verwacht ook `verhoudingVast: true, uitknipsel: false`.

In `src/editor/canvas.test.ts`: pas de test "foto met afbeelding: vrij schalen ..." aan zodat hij eerst `ed.update(f.id, { verhoudingVast: false })` doet (na `ed.add(f)`), en voeg toe:
```ts
it('foto met vaste verhouding: alleen hoeken en keepRatio; los: alle ankers', () => {
  const img = document.createElement('canvas');
  img.width = 400; img.height = 300;
  div = document.createElement('div');
  div.style.cssText = 'width:800px;height:600px;position:fixed;left:0;top:0';
  document.body.append(div);
  const ed = createEditor(nieuweCollage('vierkant'));
  const c2 = new CanvasController(div, ed, { image: () => img });
  ctrl = c2;
  const f = maakFoto({ x: 300, y: 300, breedte: 200, hoogte: 150, assetId: 'a' });
  ed.add(f);
  expect(transformer(c2).keepRatio()).toBe(true);
  expect(transformer(c2).enabledAnchors()).toEqual(['top-left', 'top-right', 'bottom-left', 'bottom-right']);
  ed.update(f.id, { verhoudingVast: false });
  expect(transformer(c2).keepRatio()).toBe(false);
  expect(transformer(c2).enabledAnchors()).toHaveLength(8);
  ed.undo();
  expect(transformer(c2).keepRatio()).toBe(true);
});
```

`e2e/verhouding.spec.ts` (draait in beide projecten):
```ts
import { test, expect, openNieuweCollage, elementen, maakPng } from './helpers';

test('verhouding vast en los via de contextbalk', async ({ page }) => {
  await openNieuweCollage(page);
  await page.click('#tool-foto');
  const chooser = page.waitForEvent('filechooser');
  await page.click('#foto-kiezen');
  await (await chooser).setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: await maakPng(page) });
  await page.waitForFunction(() => window.__collage.editor.get().collage.elementen.length === 1);
  const knop = page.locator('#ctx-verhouding');
  await expect(knop).toHaveAttribute('aria-pressed', 'true');
  await expect(knop).toContainText('Verhouding los');
  expect(await page.evaluate(() => window.__collage.controller.stage.findOne('Transformer').keepRatio())).toBe(true);
  await knop.click();
  await expect(knop).toHaveAttribute('aria-pressed', 'false');
  await expect(knop).toContainText('Verhouding vast');
  expect((await elementen(page))[0].verhoudingVast).toBe(false);
  expect(await page.evaluate(() => window.__collage.controller.stage.findOne('Transformer').enabledAnchors().length)).toBe(8);
});
```

- [ ] **Step 2: Run, verify RED**

Run: `npx vitest run src/document src/editor/canvas.test.ts src/storage/bestand.test.ts`
Expected: FAIL (velden ontbreken, transformer is nog vrij).

- [ ] **Step 3: Implement**

`types.ts` in `FotoElement` na `contrast`:
```ts
  verhoudingVast: boolean; // alleen hoekankers, verhouding blijft
  uitknipsel: boolean; // achtergrond weggehaald (toont "Maak sticker")
```

`create.ts` in `maakFoto` het object aanvullen met `verhoudingVast: true, uitknipsel: false`.

`validatie.ts`:
```ts
const isBoolOfAfwezig: Controle = (v) => v === undefined || typeof v === 'boolean';
// in ELEMENT_VELDEN.foto toevoegen:
//   verhoudingVast: isBoolOfAfwezig, uitknipsel: isBoolOfAfwezig
```
en in de `return` van `leesCollage`:
```ts
  const elementen = (c.elementen as Record<string, unknown>[]).map((e) =>
    e.type === 'foto' ? { ...e, verhoudingVast: e.verhoudingVast ?? true, uitknipsel: e.uitknipsel ?? false } : e);
  return {
    ...c,
    elementen,
    profielId: ...  // bestaande regels ongewijzigd
```

`canvas.ts` `updateTransformer`:
```ts
    const vrij = sel?.el.type === 'foto' && !!sel.el.assetId && !sel.el.verhoudingVast;
```
(de rest van de functie blijft).

`ContextBalk.svelte`, na de knop `#ctx-bijsnijden`:
```svelte
    {#if el.type === 'foto' && el.assetId}
      <button id="ctx-verhouding" aria-pressed={el.verhoudingVast} onclick={() => editor.update(el.id, { verhoudingVast: !el.verhoudingVast })}>
        <Icon name={el.verhoudingVast ? 'lock-simple-open' : 'lock-simple'} /><span>{el.verhoudingVast ? 'Verhouding los' : 'Verhouding vast'}</span>
      </button>
    {/if}
```
(`el` is hier als `Element` getypt; binnen `{#if el.type === 'foto'}` vernauwt TypeScript het type.)

Iconen: voeg de lijst uit Interfaces toe aan `src/assets/icon-names.json` en draai `npm run assets`.

Bestaande e2e die een foto vrij uitrekken: zet daar vóór het uitrekken `await page.click('#ctx-verhouding')` (of `editor.update(id, { verhoudingVast: false })` als de test via `evaluate` werkt).

- [ ] **Step 4: Run, verify GREEN**

Run: `npx vitest run` dan `npm run check`, dan `npx playwright test e2e/verhouding.spec.ts e2e/foto.spec.ts e2e/eindfixes.spec.ts e2e/laatste-fixes.spec.ts`
Expected: alles PASS, 0 check-fouten.

- [ ] **Step 5: Commit**

```bash
git add src e2e
git commit -m "feat(editor): lock the aspect ratio of a photo (locked by default)"
```

---

### Task 2: Geluid en animatie

**Files:**
- Create: `src/feedback/geluid.ts`, `src/feedback/animatie.ts`, `src/feedback/feedback.test.ts`, `src/ui/Confetti.svelte`, `e2e/feedback.spec.ts`
- Modify: `src/storage/instellingen.ts`, `src/editor/store.ts`, `src/editor/store.test.ts`, `src/editor/canvas.ts`, `src/ui/EditorScherm.svelte`, `src/ui/ExportDialoog.svelte`, `src/ui/LeerkrachtMenu.svelte`, `src/App.svelte`

**Interfaces:**
- Produces:
  - `Instellingen.geluid: boolean`, `Instellingen.animatie: boolean` (standaard `true`, via `STANDAARD`).
  - `src/feedback/geluid.ts`: `type Geluid = 'plop' | 'zoef' | 'feest'`; `zetGeluid(aan: boolean): void`; `speel(g: Geluid): void` (no-op als uit, als `AudioContext` ontbreekt, of vóór de eerste aanraking); `ontgrendelGeluid(): void` (maakt/hervat de `AudioContext`; wordt aangeroepen bij de eerste `pointerdown`).
  - `src/feedback/animatie.ts`: `zetAnimatie(aan: boolean): void`; `magAnimeren(): boolean` (= aan && !matchMedia('(prefers-reduced-motion: reduce)').matches); `vier(): void` (zet de store `confetti` op een nieuw getal als `magAnimeren()`); `export const confetti: Readable<number>` (0 = niets).
  - Editor-store: `opToevoegen(cb: (el: Element) => void): () => void` en `opWissen(cb: () => void): () => void`. `add` (dus ook `duplicate`) roept de toevoeg-luisteraars aan; `remove` en `removeMany` (alleen als er echt iets weg is) roepen de wis-luisteraars aan. Undo/redo/load roepen niets aan.
  - `CanvasController.springOp(id: string): void`: Konva-tween op de groep, schaal ×0,8 → ×1,05 → ×1 in 250 ms, daarna exact terug op de schaal uit het element (geen editor-update).
  - LeerkrachtMenu: sectie "Geluid en beweging" met `#geluid-aan` en `#animatie-aan` (toggle, `aria-pressed`).
  - `Confetti.svelte`: vaste overlay (`pointer-events: none`, z-index 95), canvas met vallende sterren, harten en cirkels gedurende 1,5 s, start bij elke nieuwe waarde van `confetti`.

- [ ] **Step 1: Failing tests**

`src/feedback/feedback.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { ontgrendelGeluid, speel, zetGeluid } from './geluid';
import { confetti, magAnimeren, vier, zetAnimatie } from './animatie';

afterEach(() => { vi.restoreAllMocks(); zetGeluid(true); zetAnimatie(true); });

describe('geluid', () => {
  it('speelt niets als geluid uit staat', () => {
    const spy = vi.spyOn(AudioContext.prototype, 'createOscillator');
    ontgrendelGeluid();
    zetGeluid(false);
    speel('plop');
    expect(spy).not.toHaveBeenCalled();
  });
  it('speelt een toon als geluid aan staat en ontgrendeld is', () => {
    const spy = vi.spyOn(AudioContext.prototype, 'createOscillator');
    ontgrendelGeluid();
    speel('plop');
    expect(spy).toHaveBeenCalled();
  });
});

describe('animatie', () => {
  it('vier verhoogt de confetti-teller als animatie mag', () => {
    const voor = get(confetti);
    vier();
    expect(get(confetti)).toBe(voor + 1);
  });
  it('niets als animatie uit staat', () => {
    zetAnimatie(false);
    const voor = get(confetti);
    vier();
    expect(get(confetti)).toBe(voor);
    expect(magAnimeren()).toBe(false);
  });
  it('niets bij prefers-reduced-motion', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    expect(magAnimeren()).toBe(false);
  });
});
```

In `src/editor/store.test.ts`:
```ts
it('meldt toevoegen en wissen, niet bij undo', () => {
  const ed = createEditor(nieuweCollage('vierkant'));
  const toe: string[] = []; let weg = 0;
  ed.opToevoegen((el) => toe.push(el.id));
  ed.opWissen(() => weg++);
  const v = maakVorm({ x: 0, y: 0, vorm: 'ster', breedte: 10, hoogte: 10 });
  ed.add(v);
  ed.duplicate(v.id);
  ed.remove(v.id);
  ed.removeMany([]);
  ed.undo(); ed.redo();
  expect(toe).toHaveLength(2);
  expect(weg).toBe(1);
});
```

`e2e/feedback.spec.ts`:
```ts
import { test, expect } from './helpers';

test('leerkracht zet geluid en beweging uit', async ({ page }) => {
  await page.goto('/');
  await page.click('#knop-leerkracht');
  for (const c of '123456') await page.click(`#cijfer-${c}`);
  await expect(page.locator('#geluid-aan')).toHaveAttribute('aria-pressed', 'true');
  await page.click('#geluid-aan');
  await page.click('#animatie-aan');
  await expect(page.locator('#geluid-aan')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#animatie-aan')).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await page.click('#knop-leerkracht');
  for (const c of '123456') await page.click(`#cijfer-${c}`);
  await expect(page.locator('#geluid-aan')).toHaveAttribute('aria-pressed', 'false');
});
```

- [ ] **Step 2: Run, verify RED**

Run: `npx vitest run src/feedback src/editor/store.test.ts`
Expected: FAIL (modules ontbreken).

- [ ] **Step 3: Implement**

`instellingen.ts`: `Instellingen` krijgt `geluid: boolean; animatie: boolean`; `STANDAARD` krijgt `geluid: true, animatie: true`.

`src/feedback/geluid.ts`:
```ts
export type Geluid = 'plop' | 'zoef' | 'feest';

let aan = true;
let ctx: AudioContext | null = null;

export function zetGeluid(v: boolean): void { aan = v; }

// iOS laat geluid pas toe na een aanraking: maak of hervat de context dan.
export function ontgrendelGeluid(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { ctx = null; }
}

function toon(c: AudioContext, start: number, van: number, naar: number, duur: number, type: OscillatorType = 'sine', volume = 0.2): void {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(van, start);
  o.frequency.exponentialRampToValueAtTime(naar, start + duur);
  g.gain.setValueAtTime(volume, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + duur);
  o.connect(g).connect(c.destination);
  o.start(start);
  o.stop(start + duur);
}

export function speel(geluid: Geluid): void {
  if (!aan || !ctx) return;
  try {
    const t = ctx.currentTime;
    if (geluid === 'plop') toon(ctx, t, 600, 180, 0.12);
    else if (geluid === 'zoef') toon(ctx, t, 900, 120, 0.25, 'triangle', 0.12);
    else [523, 659, 784, 1047].forEach((f, i) => toon(ctx!, t + i * 0.09, f, f, 0.16, 'square', 0.08));
  } catch { /* geluid is nooit belangrijk genoeg om iets te breken */ }
}
```

`src/feedback/animatie.ts`:
```ts
import { writable, type Readable } from 'svelte/store';

let aan = true;
const teller = writable(0);
export const confetti: Readable<number> = { subscribe: teller.subscribe };

export function zetAnimatie(v: boolean): void { aan = v; }

export function magAnimeren(): boolean {
  if (!aan) return false;
  try { return !matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return true; }
}

export function vier(): void {
  if (magAnimeren()) teller.update((n) => n + 1);
}
```

`store.ts`: twee `Set`s met luisteraars; in `add` na `commit` `for (const cb of toegevoegd) cb(el)`; in `remove` en `removeMany` na `commit` (alleen als de lijst korter werd) `for (const cb of gewist) cb()`. API:
```ts
    opToevoegen(cb: (el: Element) => void): () => void { toegevoegd.add(cb); return () => toegevoegd.delete(cb); },
    opWissen(cb: () => void): () => void { gewist.add(cb); return () => gewist.delete(cb); },
```

`canvas.ts`:
```ts
  springOp(id: string): void {
    const n = this.nodes.get(id);
    if (!n) return;
    const sx = n.group.scaleX(), sy = n.group.scaleY();
    n.group.scale({ x: sx * 0.8, y: sy * 0.8 });
    new Konva.Tween({
      node: n.group, duration: 0.15, scaleX: sx * 1.05, scaleY: sy * 1.05, easing: Konva.Easings.EaseOut,
      onFinish: () => new Konva.Tween({ node: n.group, duration: 0.1, scaleX: sx, scaleY: sy, onFinish: () => this.transformer.forceUpdate() }).play(),
    }).play();
  }
```

`EditorScherm.svelte` (in de `onMount` na het maken van de controller):
```ts
    const stopToe = editor.opToevoegen((el) => { speel('plop'); if (magAnimeren()) requestAnimationFrame(() => controller?.springOp(el.id)); });
    const stopWeg = editor.opWissen(() => speel('zoef'));
```
en beide stop-functies in `onDestroy` aanroepen (bewaar ze in `let`-variabelen buiten `onMount`).

`ExportDialoog.svelte`: in `bewaar()` na `toon('Bewaard!', ...)`: `speel('feest'); vier();`.

`App.svelte`:
- bij elke nieuwe `inst` (na `opstart` en in `nieuweInstellingen`): `zetGeluid(i.geluid); zetAnimatie(i.animatie);`
- `<svelte:window onpointerdown={ontgrendelGeluid} />`
- `<Confetti />` naast `<Toast />`.

`Confetti.svelte`:
```svelte
<script lang="ts">
  import { confetti } from '../feedback/animatie';
  let canvas = $state<HTMLCanvasElement>();
  let actief = $state(false);
  const KLEUREN = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#C77DFF'];
  type Deel = { x: number; y: number; vx: number; vy: number; r: number; draai: number; vorm: 0 | 1 | 2; kleur: string };

  function tekenVorm(c: CanvasRenderingContext2D, d: Deel) {
    c.save(); c.translate(d.x, d.y); c.rotate(d.draai); c.fillStyle = d.kleur; c.beginPath();
    if (d.vorm === 0) { for (let i = 0; i < 10; i++) { const a = (Math.PI / 5) * i - Math.PI / 2, s = i % 2 ? d.r / 2 : d.r; c.lineTo(Math.cos(a) * s, Math.sin(a) * s); } }
    else if (d.vorm === 1) { c.moveTo(0, d.r / 2); c.bezierCurveTo(-d.r, -d.r / 3, -d.r / 2, -d.r, 0, -d.r / 3); c.bezierCurveTo(d.r / 2, -d.r, d.r, -d.r / 3, 0, d.r / 2); }
    else c.arc(0, 0, d.r / 2, 0, Math.PI * 2);
    c.fill(); c.restore();
  }

  function start() {
    if (!canvas) return;
    const c = canvas.getContext('2d');
    if (!c) return;
    canvas.width = innerWidth; canvas.height = innerHeight;
    const delen: Deel[] = Array.from({ length: 80 }, (_, i) => ({
      x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.3,
      vx: (Math.random() - 0.5) * 4, vy: 3 + Math.random() * 4, r: 10 + Math.random() * 10,
      draai: Math.random() * 6, vorm: (i % 3) as 0 | 1 | 2, kleur: KLEUREN[i % KLEUREN.length],
    }));
    const begin = performance.now();
    actief = true;
    const stap = (t: number) => {
      c.clearRect(0, 0, canvas!.width, canvas!.height);
      for (const d of delen) { d.x += d.vx; d.y += d.vy; d.draai += 0.1; tekenVorm(c, d); }
      if (t - begin < 1500) requestAnimationFrame(stap); else { c.clearRect(0, 0, canvas!.width, canvas!.height); actief = false; }
    };
    requestAnimationFrame(stap);
  }

  $effect(() => { if ($confetti > 0) start(); });
</script>

<canvas bind:this={canvas} class="confetti" class:actief aria-hidden="true"></canvas>

<style>
  .confetti { position: fixed; inset: 0; pointer-events: none; z-index: 95; display: none; }
  .confetti.actief { display: block; }
</style>
```

`LeerkrachtMenu.svelte`, nieuwe sectie na "Delen via de server":
```svelte
      <section>
        <h2>Geluid en beweging</h2>
        <div class="rij">
          <button id="geluid-aan" class:actief={inst.geluid} aria-pressed={inst.geluid} onclick={() => zet({ geluid: !inst.geluid })}>
            <Icon name={inst.geluid ? 'speaker-high' : 'speaker-slash'} /> Geluid {inst.geluid ? 'aan' : 'uit'}
          </button>
          <button id="animatie-aan" class:actief={inst.animatie} aria-pressed={inst.animatie} onclick={() => zet({ animatie: !inst.animatie })}>
            <Icon name="sparkle" /> Beweging {inst.animatie ? 'aan' : 'uit'}
          </button>
        </div>
      </section>
```

- [ ] **Step 4: Run, verify GREEN**

Run: `npx vitest run`, `npm run check`, `npx playwright test e2e/feedback.spec.ts e2e/editor.spec.ts e2e/export.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src e2e
git commit -m "feat: sounds and small animations, switchable in the teacher menu"
```

---

### Task 3: Camera

**Files:**
- Create: `src/import/camera.ts`, `src/import/camera.test.ts`, `src/ui/CameraDialoog.svelte`, `e2e/camera.spec.ts`
- Modify: `src/ui/FotoPaneel.svelte`, `src/ui/EditorScherm.svelte`

**Interfaces:**
- Produces:
  - `class CameraFout extends Error { code: 'geweigerd' | 'geen-camera' }`
  - `startCamera(kant: 'user' | 'environment', md?: Pick<MediaDevices, 'getUserMedia'>): Promise<MediaStream>`; `getUserMedia` ontbreekt → `CameraFout('geen-camera')`; `NotAllowedError`/`SecurityError` → `'geweigerd'`; elke andere fout → `'geen-camera'`.
  - `stopCamera(s: MediaStream | null): void` (stopt alle tracks).
  - `neemFoto(video: HTMLVideoElement): Promise<Blob>` (JPEG 0,9 van `videoWidth × videoHeight`, niet gespiegeld).
  - `aantalCameras(md?): Promise<number>` (via `enumerateDevices`, `videoinput`; 0 bij fout).
  - `CameraDialoog.svelte` props `{ onFoto: (b: Blob) => void; onKiesBestand: () => void; onSluit: () => void }`. Ids: `#camera-video`, `#camera-neem`, `#camera-wissel` (alleen bij > 1 camera), `#camera-gebruik`, `#camera-opnieuw`, `#camera-sluit`, foutmelding `#camera-fout` met knop `#camera-kies-foto`.
  - FotoPaneel: knop `#foto-camera` (icoon `camera`, tekst "Camera") onder `#foto-kiezen`; prop `onCamera: (vakId?: string) => void`.
  - EditorScherm: `toonCamera` state; `onFoto` → `voegFotosToe([blob], undefined, cameraVak)`; `onKiesBestand` → sluit en `kiesFoto(cameraVak)` met `capture="environment"` op een tweede verborgen input `#camera-input` (`accept="image/*" capture="environment"`). `modaalOpen` telt `toonCamera` mee.

- [ ] **Step 1: Failing tests**

`src/import/camera.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { CameraFout, startCamera, stopCamera } from './camera';

const fout = (name: string) => ({ getUserMedia: () => Promise.reject(new DOMException('x', name)) });

describe('camera', () => {
  it('geweigerd geeft CameraFout geweigerd', async () => {
    await expect(startCamera('user', fout('NotAllowedError'))).rejects.toMatchObject({ code: 'geweigerd' });
  });
  it('geen toestel geeft geen-camera', async () => {
    await expect(startCamera('user', fout('NotFoundError'))).rejects.toMatchObject({ code: 'geen-camera' });
    await expect(startCamera('user', {} as MediaDevices)).rejects.toBeInstanceOf(CameraFout);
  });
  it('vraagt de gekozen kant en stopCamera stopt alle tracks', async () => {
    let gevraagd: MediaStreamConstraints | undefined;
    let gestopt = 0;
    const stroom = { getTracks: () => [{ stop: () => gestopt++ }, { stop: () => gestopt++ }] } as unknown as MediaStream;
    const s = await startCamera('environment', { getUserMedia: async (c) => { gevraagd = c; return stroom; } });
    expect(gevraagd).toEqual({ video: { facingMode: 'environment' }, audio: false });
    stopCamera(s);
    expect(gestopt).toBe(2);
    stopCamera(null);
  });
});
```

`e2e/camera.spec.ts`:
```ts
import { test, expect, openNieuweCollage, elementen } from './helpers';

test.describe('camera met nep-camera', () => {
  test.use({ launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } });
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'chromebook', 'nep-camera bestaat alleen in Chromium'));

  test('foto nemen en gebruiken', async ({ page }) => {
    await openNieuweCollage(page);
    await page.click('#tool-foto');
    await page.click('#foto-camera');
    await page.waitForFunction(() => (document.querySelector('#camera-video') as HTMLVideoElement)?.videoWidth > 0);
    await page.click('#camera-neem');
    await page.click('#camera-gebruik');
    await page.waitForFunction(() => window.__collage.editor.get().collage.elementen.length === 1);
    expect((await elementen(page))[0].type).toBe('foto');
  });
});

test('camera geweigerd: melding en bestand kiezen', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new DOMException('nee', 'NotAllowedError')), enumerateDevices: async () => [] } });
  });
  await openNieuweCollage(page);
  await page.click('#tool-foto');
  await page.click('#foto-camera');
  await expect(page.locator('#camera-fout')).toContainText('De camera mag niet aan.');
  const chooser = page.waitForEvent('filechooser');
  await page.click('#camera-kies-foto');
  await chooser;
});
```

- [ ] **Step 2: Run, verify RED**

Run: `npx vitest run src/import/camera.test.ts`
Expected: FAIL (module ontbreekt).

- [ ] **Step 3: Implement**

`src/import/camera.ts`:
```ts
export class CameraFout extends Error {
  constructor(public code: 'geweigerd' | 'geen-camera') { super(code); }
}

type Media = Pick<MediaDevices, 'getUserMedia'>;
const standaard = (): Media | undefined => navigator.mediaDevices;

export async function startCamera(kant: 'user' | 'environment', md: Media | undefined = standaard()): Promise<MediaStream> {
  if (!md?.getUserMedia) throw new CameraFout('geen-camera');
  try {
    return await md.getUserMedia({ video: { facingMode: kant }, audio: false });
  } catch (e) {
    const naam = (e as DOMException)?.name;
    throw new CameraFout(naam === 'NotAllowedError' || naam === 'SecurityError' ? 'geweigerd' : 'geen-camera');
  }
}

export function stopCamera(s: MediaStream | null): void {
  for (const t of s?.getTracks() ?? []) t.stop();
}

export async function aantalCameras(md: Pick<MediaDevices, 'enumerateDevices'> | undefined = navigator.mediaDevices): Promise<number> {
  try { return (await md!.enumerateDevices()).filter((d) => d.kind === 'videoinput').length; } catch { return 0; }
}

export function neemFoto(video: HTMLVideoElement): Promise<Blob> {
  const c = document.createElement('canvas');
  c.width = video.videoWidth;
  c.height = video.videoHeight;
  c.getContext('2d')!.drawImage(video, 0, 0);
  return new Promise((klaar, mis) => c.toBlob((b) => (b ? klaar(b) : mis(new CameraFout('geen-camera'))), 'image/jpeg', 0.9));
}
```

`src/ui/CameraDialoog.svelte`:
```svelte
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Icon from './Icon.svelte';
  import { aantalCameras, CameraFout, neemFoto, startCamera, stopCamera } from '../import/camera';

  let { onFoto, onKiesBestand, onSluit }: { onFoto: (b: Blob) => void; onKiesBestand: () => void; onSluit: () => void } = $props();
  let video = $state<HTMLVideoElement>();
  let stroom: MediaStream | null = null;
  let kant = $state<'user' | 'environment'>('environment');
  let meer = $state(false);
  let fout = $state('');
  let genomen = $state.raw<{ blob: Blob; url: string } | null>(null);
  let weg = false;

  async function zetAan() {
    stopCamera(stroom);
    stroom = null;
    fout = '';
    try {
      const s = await startCamera(kant);
      if (weg) { stopCamera(s); return; }
      stroom = s;
      if (video) { video.srcObject = s; await video.play().catch(() => {}); }
    } catch (e) {
      fout = e instanceof CameraFout && e.code === 'geweigerd'
        ? 'De camera mag niet aan. Vraag je juf of meester, of kies een foto.'
        : 'Ik vind geen camera. Kies een foto.';
    }
  }

  async function neem() {
    if (!video) return;
    const blob = await neemFoto(video);
    genomen = { blob, url: URL.createObjectURL(blob) };
  }
  function opnieuw() { if (genomen) URL.revokeObjectURL(genomen.url); genomen = null; }
  function gebruik() { if (genomen) onFoto(genomen.blob); }
  function wissel() { kant = kant === 'user' ? 'environment' : 'user'; void zetAan(); }

  onMount(async () => { meer = (await aantalCameras()) > 1; await zetAan(); });
  onDestroy(() => { weg = true; stopCamera(stroom); if (genomen) URL.revokeObjectURL(genomen.url); });
</script>

<div class="scherm" role="presentation">
  <div class="dialoog" role="dialog" aria-modal="true" aria-labelledby="camera-titel">
    <h2 id="camera-titel">Camera</h2>
    {#if fout}
      <p id="camera-fout" class="fout" role="alert"><Icon name="warning" /> {fout}</p>
      <button id="camera-kies-foto" class="hoofd" onclick={onKiesBestand}><Icon name="image" /> Kies foto</button>
    {:else if genomen}
      <img src={genomen.url} alt="Genomen foto" />
      <div class="knoppen">
        <button id="camera-gebruik" class="hoofd" onclick={gebruik}><Icon name="check" /> Gebruik</button>
        <button id="camera-opnieuw" onclick={opnieuw}><Icon name="arrow-counter-clockwise" /> Opnieuw</button>
      </div>
    {:else}
      <!-- svelte-ignore a11y_media_has_caption -->
      <video id="camera-video" bind:this={video} playsinline muted class:spiegel={kant === 'user'}></video>
      <div class="knoppen">
        <button id="camera-neem" class="hoofd" onclick={neem}><Icon name="camera" /> Neem foto</button>
        {#if meer}<button id="camera-wissel" onclick={wissel}><Icon name="camera-rotate" /> Wissel camera</button>{/if}
      </div>
    {/if}
    <button id="camera-sluit" onclick={onSluit}>Sluiten</button>
  </div>
</div>

<style>
  .scherm { position: fixed; inset: 0; background: rgba(45, 42, 50, 0.6); display: grid; place-items: center; z-index: 90; padding: 16px; }
  .dialoog { background: var(--paneel); border-radius: 28px; padding: 20px; width: min(720px, 100%); display: grid; gap: 14px; max-height: 100%; overflow-y: auto; }
  video, img { width: 100%; max-height: 60dvh; object-fit: contain; border-radius: 18px; background: #000; }
  .spiegel { transform: scaleX(-1); }
  .knoppen { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  .knoppen button, .dialoog > button { padding: 0 22px; background: var(--creme); }
  .hoofd { background: var(--koraal) !important; color: #fff; }
  .fout { color: #c0392b; font-weight: 700; display: flex; gap: 8px; align-items: center; margin: 0; }
</style>
```
(Omdat `video` pas na de eerste render bestaat: `zetAan` zet `srcObject` als `video` er is; voeg ook een `$effect(() => { if (video && stroom && !video.srcObject) { video.srcObject = stroom; void video.play().catch(() => {}); } })` toe zodat het werkt na "Opnieuw".)

`FotoPaneel.svelte`: nieuwe prop `onCamera: (vakId?: string) => void` en onder `#foto-kiezen`:
```svelte
<button id="foto-camera" class="breed" onclick={() => onCamera(foto && !foto.assetId ? foto.id : undefined)}><Icon name="camera" /> Camera</button>
```

`EditorScherm.svelte`:
```ts
  let toonCamera = $state(false);
  let cameraVak: string | undefined;
  let cameraInput: HTMLInputElement;
  function openCamera(vakId?: string) { cameraVak = vakId; toonCamera = true; }
```
- `modaalOpen` uitbreiden met `|| toonCamera`.
- `<FotoPaneel ... onCamera={openCamera} />`
- markup:
```svelte
{#if toonCamera}
  <CameraDialoog
    onFoto={(b) => { toonCamera = false; void voegFotosToe([b], undefined, cameraVak); }}
    onKiesBestand={() => { toonCamera = false; cameraInput.value = ''; cameraInput.click(); }}
    onSluit={() => (toonCamera = false)}
  />
{/if}
<input id="camera-input" class="visueel-verborgen" type="file" accept="image/*" capture="environment" bind:this={cameraInput}
  onchange={() => voegFotosToe([...(cameraInput.files ?? [])], undefined, cameraVak)} />
```

- [ ] **Step 4: Run, verify GREEN**

Run: `npx vitest run src/import`, `npm run check`, `npx playwright test e2e/camera.spec.ts`
Expected: PASS (de nep-cameratest alleen in het chromebook-project).

- [ ] **Step 5: Commit**

```bash
git add src e2e
git commit -m "feat(photo): take a photo with the camera, with a file fallback"
```

---

### Task 4: Achtergrond weg

**Files:**
- Create: `scripts/copy-model.mjs`, `src/import/achtergrond.ts`, `src/import/achtergrond.test.ts`, `src/ui/VoortgangDialoog.svelte`, `e2e/achtergrond-weg.spec.ts`
- Modify: `package.json` (dependencies + scripts), `vite.config.ts`, `.gitignore`, `src/ui/ContextBalk.svelte`, `src/ui/FotoPaneel.svelte`, `src/ui/EditorScherm.svelte`, `src/vite-env.d.ts` (alleen als nodig voor types)

**Interfaces:**
- Consumes: `FotoElement.uitknipsel` (Task 1), `AssetStore.addBlob`.
- Produces:
  - `class AchtergrondFout extends Error { code: 'download' | 'vol' | 'mislukt' }`; `ACHTERGRONDTEKST: Record<code, string>` = `download`: "Dit lukt nu niet. Probeer opnieuw met internet.", `vol`: "Je toestel is vol. Wis een paar oude collages.", `mislukt`: "Dit lukt niet met deze foto."
  - `type Verwijderaar = (blob: Blob, voortgang: (deel: number) => void) => Promise<Blob>`.
  - `verwijderAchtergrond(blob: Blob, voortgang: (deel: number) => void, verwijder?: Verwijderaar): Promise<Blob>`: gebruikt `verwijder` als gegeven; anders in `MODE === 'e2e'` `window.__achtergrondWeg` als die bestaat; anders de echte imgly-functie (dynamische `import('@imgly/background-removal')`). Vertaalt fouten: `QuotaExceededError` → `vol`; netwerk-/fetch-fout (`TypeError`, of message bevat `fetch`/`network`/`Failed to`) → `download`; rest → `mislukt`. Het resultaat moet `image/png` zijn; geen blob → `mislukt`.
  - `voortgang(deel)`: getal 0..1 (alleen tijdens het downloaden van het model; daarna roept de UI "Bezig…").
  - EditorScherm `achtergrondWeg(id: string)`: toont `VoortgangDialoog`, roept `verwijderAchtergrond(assets.blob(assetId)!, ...)`, `assets.addBlob(resultaat)`, dan `editor.update(id, { assetId: nieuw, uitsnede: null, masker: 'rechthoek', uitknipsel: true })`. Bij fout: `toon(ACHTERGRONDTEKST[code], 'warning')`, geen update.
  - Knoppen: `#ctx-achtergrond-weg` in ContextBalk (foto met afbeelding, niet vergrendeld; icoon `magic-wand`, tekst "Weg"), en `#foto-achtergrond-weg` in FotoPaneel ("Achtergrond weg"). Props: ContextBalk `onAchtergrondWeg?: () => void`, FotoPaneel `onAchtergrondWeg: (id: string) => void`.
  - `VoortgangDialoog.svelte` props `{ titel: string; deel: number | null }` (null = onbepaald, "Bezig…"); id `#voortgang`, `role="progressbar"` met `aria-valuenow`.
  - Model: `/modellen/achtergrond/` met `resources.json` en de chunks van het model `isnet_quint8` plus de `onnxruntime-web`-bestanden; config `{ publicPath: new URL('/modellen/achtergrond/', location.href).href, model: 'isnet_quint8', output: { format: 'image/png' }, progress }`.

- [ ] **Step 1: Pakketten en modelkopie**

```bash
npm install --save-exact @imgly/background-removal@1.4.5 @imgly/background-removal-data@1.4.5
```
Controleer `node_modules/@imgly/background-removal-data/dist/resources.json`. Het is een object met sleutels zoals `/models/isnet_quint8`, `/onnxruntime-web/ort-wasm-simd-threaded.wasm`; elke waarde heeft `chunks: [{ name, hash, offsets }]` (de bestandsnaam van een chunk is `name` of `hash`; open het bestand en gebruik wat er staat). Schrijf `scripts/copy-model.mjs`:
```js
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bron = join(root, 'node_modules/@imgly/background-removal-data/dist');
const doel = join(root, 'public/modellen/achtergrond');
const MODEL = '/models/isnet_quint8';

if (!existsSync(join(bron, 'resources.json'))) {
  console.error('Achtergrondmodel niet gevonden in node_modules/@imgly/background-removal-data.');
  process.exit(1);
}
const alles = JSON.parse(readFileSync(join(bron, 'resources.json'), 'utf8'));
const nodig = Object.fromEntries(Object.entries(alles).filter(([k]) => k === MODEL || k.startsWith('/onnxruntime-web/')));
mkdirSync(doel, { recursive: true });
let n = 0;
for (const r of Object.values(nodig)) {
  for (const c of r.chunks) {
    const naam = c.name ?? c.hash;
    copyFileSync(join(bron, naam), join(doel, naam));
    n++;
  }
}
writeFileSync(join(doel, 'resources.json'), JSON.stringify(nodig));
console.log(`Achtergrondmodel gekopieerd: ${n} bestanden.`);
```
`package.json`: `"postinstall": "node scripts/copy-assets.mjs && node scripts/copy-model.mjs"`, `"assets": "node scripts/copy-assets.mjs && node scripts/copy-model.mjs"`. `.gitignore`: `public/modellen/`. Draai `npm run assets` en controleer dat `public/modellen/achtergrond/resources.json` bestaat.

Als de structuur van `resources.json` anders blijkt (andere sleutels of veldnamen), pas het script minimaal aan zodat precies het model `isnet_quint8` en de onnxruntime-bestanden gekopieerd worden, en meld dit als concern.

`vite.config.ts` in `workbox`:
```ts
    globIgnores: ['modellen/**'],
    runtimeCaching: [{
      urlPattern: ({ url }) => url.pathname.includes('/modellen/'),
      handler: 'CacheFirst',
      options: { cacheName: 'modellen', expiration: { maxEntries: 60 } },
    }],
```

- [ ] **Step 2: Failing tests**

`src/import/achtergrond.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { AchtergrondFout, verwijderAchtergrond } from './achtergrond';

const png = new Blob([new Uint8Array([1])], { type: 'image/png' });

describe('achtergrond weg', () => {
  it('geeft het resultaat en meldt voortgang', async () => {
    const delen: number[] = [];
    const uit = await verwijderAchtergrond(png, (d) => delen.push(d), async (_b, v) => { v(0.5); v(1); return png; });
    expect(uit.type).toBe('image/png');
    expect(delen).toEqual([0.5, 1]);
  });
  it('downloadfout wordt download', async () => {
    await expect(verwijderAchtergrond(png, () => {}, async () => { throw new TypeError('Failed to fetch'); })).rejects.toMatchObject({ code: 'download' });
  });
  it('volle opslag wordt vol', async () => {
    await expect(verwijderAchtergrond(png, () => {}, async () => { throw new DOMException('x', 'QuotaExceededError'); })).rejects.toMatchObject({ code: 'vol' });
  });
  it('andere fout of geen png wordt mislukt', async () => {
    await expect(verwijderAchtergrond(png, () => {}, async () => { throw new Error('kapot'); })).rejects.toBeInstanceOf(AchtergrondFout);
    await expect(verwijderAchtergrond(png, () => {}, async () => new Blob(['x'], { type: 'text/plain' }))).rejects.toMatchObject({ code: 'mislukt' });
  });
});
```

`e2e/achtergrond-weg.spec.ts`:
```ts
import { test, expect, openNieuweCollage, elementen, maakPng } from './helpers';

async function voegFotoToe(page: import('@playwright/test').Page) {
  await page.click('#tool-foto');
  const chooser = page.waitForEvent('filechooser');
  await page.click('#foto-kiezen');
  await (await chooser).setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: await maakPng(page) });
  await page.waitForFunction(() => window.__collage.editor.get().collage.elementen.length === 1);
}

test('achtergrond weg maakt een uitknipsel; ongedaan maken zet het terug', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__achtergrondWeg = async (blob: Blob, voortgang: (d: number) => void) => {
      voortgang(1);
      const bmp = await createImageBitmap(blob);
      const c = new OffscreenCanvas(bmp.width, bmp.height);
      const x = c.getContext('2d')!;
      x.drawImage(bmp, 0, 0);
      x.clearRect(0, 0, bmp.width / 2, bmp.height);
      return c.convertToBlob({ type: 'image/png' });
    };
  });
  await openNieuweCollage(page);
  await voegFotoToe(page);
  const voor = (await elementen(page))[0].assetId;
  await page.click('#ctx-achtergrond-weg');
  await page.waitForFunction((id) => window.__collage.editor.get().collage.elementen[0].assetId !== id, voor);
  const [f] = await elementen(page);
  expect(f.uitknipsel).toBe(true);
  expect(f.masker).toBe('rechthoek');
  await page.click('#knop-ongedaan');
  expect((await elementen(page))[0].assetId).toBe(voor);
});

test('model niet bereikbaar: melding, foto ongewijzigd', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__achtergrondWeg = async () => { throw new TypeError('Failed to fetch'); }; });
  await openNieuweCollage(page);
  await voegFotoToe(page);
  const voor = await elementen(page);
  await page.click('#ctx-achtergrond-weg');
  await expect(page.getByText('Dit lukt nu niet. Probeer opnieuw met internet.')).toBeVisible();
  expect(await elementen(page)).toEqual(voor);
});
```

- [ ] **Step 3: Run, verify RED**

Run: `npx vitest run src/import/achtergrond.test.ts`
Expected: FAIL (module ontbreekt).

- [ ] **Step 4: Implement**

`src/import/achtergrond.ts`:
```ts
export class AchtergrondFout extends Error {
  constructor(public code: 'download' | 'vol' | 'mislukt') { super(code); }
}

export const ACHTERGRONDTEKST: Record<AchtergrondFout['code'], string> = {
  download: 'Dit lukt nu niet. Probeer opnieuw met internet.',
  vol: 'Je toestel is vol. Wis een paar oude collages.',
  mislukt: 'Dit lukt niet met deze foto.',
};

export type Verwijderaar = (blob: Blob, voortgang: (deel: number) => void) => Promise<Blob>;

const echte: Verwijderaar = async (blob, voortgang) => {
  const { removeBackground } = await import('@imgly/background-removal');
  return removeBackground(blob, {
    publicPath: new URL('/modellen/achtergrond/', location.href).href,
    model: 'isnet_quint8',
    output: { format: 'image/png' },
    progress: (sleutel: string, nu: number, totaal: number) => { if (sleutel.startsWith('fetch') && totaal > 0) voortgang(nu / totaal); },
  });
};

function kies(): Verwijderaar {
  if (import.meta.env.MODE === 'e2e') {
    const nep = (window as unknown as { __achtergrondWeg?: Verwijderaar }).__achtergrondWeg;
    if (nep) return nep;
  }
  return echte;
}

function vertaal(e: unknown): AchtergrondFout {
  if (e instanceof AchtergrondFout) return e;
  const naam = (e as { name?: string })?.name ?? '';
  const tekst = String((e as { message?: string })?.message ?? '');
  if (naam === 'QuotaExceededError') return new AchtergrondFout('vol');
  if (e instanceof TypeError || /fetch|network|Failed to/i.test(tekst)) return new AchtergrondFout('download');
  return new AchtergrondFout('mislukt');
}

export async function verwijderAchtergrond(blob: Blob, voortgang: (deel: number) => void, verwijder: Verwijderaar = kies()): Promise<Blob> {
  let uit: Blob;
  try { uit = await verwijder(blob, voortgang); } catch (e) { throw vertaal(e); }
  if (!(uit instanceof Blob) || uit.type !== 'image/png') throw new AchtergrondFout('mislukt');
  return uit;
}
```
Controleer de echte `progress`-sleutels van imgly 1.4.5 in `node_modules/@imgly/background-removal/dist/index.d.ts` (de downloadfase heet daar `fetch:...`); pas de `startsWith` aan als het anders heet.

`src/ui/VoortgangDialoog.svelte`:
```svelte
<script lang="ts">
  let { titel, deel }: { titel: string; deel: number | null } = $props();
</script>

<div class="scherm" role="presentation">
  <div class="dialoog" role="dialog" aria-modal="true" aria-labelledby="voortgang-titel">
    <h2 id="voortgang-titel">{titel}</h2>
    <div id="voortgang" class="balk" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={deel === null ? undefined : Math.round(deel * 100)}>
      <span class:onbepaald={deel === null} style:width={deel === null ? '40%' : `${Math.round(deel * 100)}%`}></span>
    </div>
  </div>
</div>

<style>
  .scherm { position: fixed; inset: 0; background: rgba(45, 42, 50, 0.45); display: grid; place-items: center; z-index: 92; padding: 16px; }
  .dialoog { background: var(--paneel); border-radius: 28px; padding: 28px; width: min(460px, 100%); display: grid; gap: 16px; text-align: center; }
  h2 { margin: 0; }
  .balk { height: 22px; border-radius: 11px; background: var(--creme); overflow: hidden; }
  .balk span { display: block; height: 100%; background: var(--koraal); border-radius: 11px; transition: width 0.2s; }
  .onbepaald { animation: heen 1.2s ease-in-out infinite alternate; }
  @keyframes heen { from { margin-left: 0; } to { margin-left: 60%; } }
  @media (prefers-reduced-motion: reduce) { .onbepaald { animation: none; } }
</style>
```

`EditorScherm.svelte`:
```ts
  let achtergrondBezig = $state<{ deel: number | null; download: boolean } | null>(null);
  async function achtergrondWeg(id: string) {
    const f = editor.get().collage.elementen.find((e) => e.id === id);
    if (f?.type !== 'foto' || !f.assetId || achtergrondBezig) return;
    const bron = assets.blob(f.assetId);
    if (!bron) return;
    achtergrondBezig = { deel: null, download: false };
    try {
      const uit = await verwijderAchtergrond(bron, (d) => { achtergrondBezig = { deel: d < 1 ? d : null, download: d < 1 }; });
      const nieuw = await assets.addBlob(uit);
      editor.update(id, { assetId: nieuw, uitsnede: null, masker: 'rechthoek', uitknipsel: true });
    } catch (e) {
      toon(e instanceof AchtergrondFout ? ACHTERGRONDTEKST[e.code] : ACHTERGRONDTEKST.mislukt, 'warning');
    } finally {
      achtergrondBezig = null;
    }
  }
```
- `modaalOpen` uitbreiden met `|| !!achtergrondBezig`.
- Markup: `{#if achtergrondBezig}<VoortgangDialoog titel={achtergrondBezig.download ? 'Even het hulpmiddel ophalen...' : 'Bezig...'} deel={achtergrondBezig.deel} />{/if}`
- `<ContextBalk ... onAchtergrondWeg={() => void achtergrondWeg(geselecteerd!.id)} />` en `<FotoPaneel ... onAchtergrondWeg={(id) => void achtergrondWeg(id)} />`.

`ContextBalk.svelte` prop `onAchtergrondWeg?: () => void` en na `#ctx-verhouding`:
```svelte
    {#if el.type === 'foto' && el.assetId && onAchtergrondWeg}
      <button id="ctx-achtergrond-weg" onclick={onAchtergrondWeg}><Icon name="magic-wand" /><span>Weg</span></button>
    {/if}
```

`FotoPaneel.svelte` prop `onAchtergrondWeg: (id: string) => void` en onder `#foto-bijsnijden`:
```svelte
  <button id="foto-achtergrond-weg" class="breed" onclick={() => onAchtergrondWeg(foto.id)}><Icon name="magic-wand" /> Achtergrond weg</button>
```

- [ ] **Step 5: Run, verify GREEN**

Run: `npx vitest run src/import`, `npm run check`, `npm run build` (controleer dat `dist/modellen/achtergrond/resources.json` bestaat en dat `dist/sw.js` geen `modellen/` in de precache-lijst heeft: `grep -c modellen dist/sw.js` mag alleen de runtime-regel tonen), `npx playwright test e2e/achtergrond-weg.spec.ts e2e/offline.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json scripts vite.config.ts .gitignore src e2e
git commit -m "feat(photo): remove the background on the device (self-hosted model)"
```

---

### Task 5: Databaseversie 2 en eigen stickers (opslag)

**Files:**
- Modify: `src/storage/db.ts`, `src/storage/opruimen.ts`, `src/storage/profielen.ts`
- Create: `src/storage/eigen-stickers.ts`, `src/storage/eigen-stickers.test.ts`
- Test: `src/storage/opruimen.test.ts`, `src/storage/profielen.test.ts`

**Interfaces:**
- Produces:
  - `db.ts`: `EigenStickerRij { id: string; profielId: string /* '' zonder profiel */; aangemaakt: number; gebruikt: number; blob: Blob }`, `InzendingRij { id: string; naam: string; ontvangen: number; bestand: Blob; voorbeeld: Blob | null }`; `this.version(2).stores({ ...de vier van versie 1..., eigenStickers: 'id, profielId, gebruikt', inzendingen: 'id, ontvangen' })`.
  - `MAX_EIGEN_STICKERS = 100`.
  - `class StickerFout extends Error { code: 'vol' }`.
  - `bewaarEigenSticker(db, profielId: string | null, blob: Blob, nu = Date.now()): Promise<EigenStickerRij>` → gooit `StickerFout('vol')` bij 100 stickers voor dat profiel.
  - `lijstEigenStickers(db, profielId: string | null): Promise<EigenStickerRij[]>` (nieuwste eerst op `aangemaakt`).
  - `gebruikEigenSticker(db, id: string, nu = Date.now()): Promise<void>` (zet `gebruikt`).
  - `wisEigenSticker(db, id: string): Promise<void>`.
  - `snijTransparantBij(blob: Blob): Promise<Blob>` → PNG bijgesneden tot de kleinste rechthoek met alfa > 8; volledig transparant → de oorspronkelijke blob.
  - `ruimAutomatischOp` wist ook eigen stickers met `gebruikt` ouder dan 60 dagen en inzendingen met `ontvangen` ouder dan 60 dagen.
  - `wisProfiel` wist ook de eigen stickers van dat profiel.

- [ ] **Step 1: Failing tests**

`src/storage/eigen-stickers.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { maakDb, type CollageDb } from './db';
import { ruimTestDbOp } from './testhulp';
import { nieuwId } from '../document/create';
import { bewaarEigenSticker, gebruikEigenSticker, lijstEigenStickers, MAX_EIGEN_STICKERS, snijTransparantBij, StickerFout, wisEigenSticker } from './eigen-stickers';

let db: CollageDb;
beforeEach(() => { db = maakDb(`test-${nieuwId()}`); });
afterEach(() => ruimTestDbOp(db));
const png = () => new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });

describe('eigen stickers', () => {
  it('bewaart per profiel, nieuwste eerst, en wist', async () => {
    const a = await bewaarEigenSticker(db, 'p1', png(), 1000);
    const b = await bewaarEigenSticker(db, 'p1', png(), 2000);
    await bewaarEigenSticker(db, null, png(), 3000);
    expect((await lijstEigenStickers(db, 'p1')).map((s) => s.id)).toEqual([b.id, a.id]);
    expect(await lijstEigenStickers(db, null)).toHaveLength(1);
    await wisEigenSticker(db, a.id);
    expect(await lijstEigenStickers(db, 'p1')).toHaveLength(1);
  });
  it('maximaal 100 per profiel', async () => {
    await db.eigenStickers.bulkPut(Array.from({ length: MAX_EIGEN_STICKERS }, (_, i) => ({ id: `s${i}`, profielId: 'p1', aangemaakt: i, gebruikt: i, blob: png() })));
    await expect(bewaarEigenSticker(db, 'p1', png())).rejects.toBeInstanceOf(StickerFout);
    await expect(bewaarEigenSticker(db, 'p2', png())).resolves.toBeTruthy();
  });
  it('gebruik zet de gebruikstijd', async () => {
    const s = await bewaarEigenSticker(db, 'p1', png(), 1000);
    await gebruikEigenSticker(db, s.id, 5000);
    expect((await db.eigenStickers.get(s.id))!.gebruikt).toBe(5000);
  });
  it('snijdt transparante randen weg', async () => {
    const c = new OffscreenCanvas(100, 80);
    const x = c.getContext('2d')!;
    x.fillStyle = '#f00';
    x.fillRect(20, 10, 30, 40);
    const uit = await snijTransparantBij(await c.convertToBlob({ type: 'image/png' }));
    const bmp = await createImageBitmap(uit);
    expect([bmp.width, bmp.height]).toEqual([30, 40]);
    expect(uit.type).toBe('image/png');
  });
});
```

In `src/storage/opruimen.test.ts` (bestaande opzet met eigen db):
```ts
it('wist eigen stickers en inzendingen ouder dan 60 dagen', async () => {
  const nu = 200 * DAG;
  const b = new Blob(['x']);
  await db.eigenStickers.bulkPut([
    { id: 'oud', profielId: '', aangemaakt: 0, gebruikt: nu - 61 * DAG, blob: b },
    { id: 'nieuw', profielId: '', aangemaakt: 0, gebruikt: nu - 10 * DAG, blob: b },
  ]);
  await db.inzendingen.bulkPut([
    { id: 'i-oud', naam: 'A', ontvangen: nu - 61 * DAG, bestand: b, voorbeeld: null },
    { id: 'i-nieuw', naam: 'B', ontvangen: nu - 1 * DAG, bestand: b, voorbeeld: null },
  ]);
  await ruimAutomatischOp(db, nu);
  expect((await db.eigenStickers.toArray()).map((s) => s.id)).toEqual(['nieuw']);
  expect((await db.inzendingen.toArray()).map((s) => s.id)).toEqual(['i-nieuw']);
});
```

In `src/storage/profielen.test.ts`:
```ts
it('profiel wissen wist ook zijn eigen stickers', async () => {
  const p = await maakProfiel(db, { naam: 'Lies', symbool: 'star', kleur: '#FF6B6B', pin: ['star', 'star', 'star'] });
  await db.eigenStickers.put({ id: 's1', profielId: p.id, aangemaakt: 1, gebruikt: 1, blob: new Blob(['x']) });
  await wisProfiel(db, p.id);
  expect(await db.eigenStickers.count()).toBe(0);
});
```

- [ ] **Step 2: Run, verify RED**

Run: `npx vitest run src/storage`
Expected: FAIL.

- [ ] **Step 3: Implement**

`db.ts`:
```ts
export interface EigenStickerRij { id: string; profielId: string; aangemaakt: number; gebruikt: number; blob: Blob }
export interface InzendingRij { id: string; naam: string; ontvangen: number; bestand: Blob; voorbeeld: Blob | null }
// in de klasse:
  eigenStickers!: Table<EigenStickerRij, string>;
  inzendingen!: Table<InzendingRij, string>;
// in de constructor na version(1):
    this.version(2).stores({
      collages: 'id, profielId, gewijzigd',
      assets: '[collageId+id], collageId',
      profielen: 'id',
      instellingen: 'sleutel',
      eigenStickers: 'id, profielId, gebruikt',
      inzendingen: 'id, ontvangen',
    });
```

`src/storage/eigen-stickers.ts`:
```ts
import type { CollageDb, EigenStickerRij } from './db';
import { nieuwId } from '../document/create';

export const MAX_EIGEN_STICKERS = 100;

export class StickerFout extends Error {
  constructor(public code: 'vol') { super(code); }
}

export async function bewaarEigenSticker(db: CollageDb, profielId: string | null, blob: Blob, nu = Date.now()): Promise<EigenStickerRij> {
  const pid = profielId ?? '';
  return db.transaction('rw', db.eigenStickers, async () => {
    if ((await db.eigenStickers.where('profielId').equals(pid).count()) >= MAX_EIGEN_STICKERS) throw new StickerFout('vol');
    const rij: EigenStickerRij = { id: nieuwId(), profielId: pid, aangemaakt: nu, gebruikt: nu, blob };
    await db.eigenStickers.put(rij);
    return rij;
  });
}

export async function lijstEigenStickers(db: CollageDb, profielId: string | null): Promise<EigenStickerRij[]> {
  const rijen = await db.eigenStickers.where('profielId').equals(profielId ?? '').toArray();
  return rijen.sort((a, b) => b.aangemaakt - a.aangemaakt);
}

export async function gebruikEigenSticker(db: CollageDb, id: string, nu = Date.now()): Promise<void> {
  await db.eigenStickers.update(id, { gebruikt: nu });
}

export async function wisEigenSticker(db: CollageDb, id: string): Promise<void> {
  await db.eigenStickers.delete(id);
}

export async function snijTransparantBij(blob: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(blob);
  const c = new OffscreenCanvas(bmp.width, bmp.height);
  const x = c.getContext('2d')!;
  x.drawImage(bmp, 0, 0);
  const { data, width, height } = x.getImageData(0, 0, bmp.width, bmp.height);
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let px = 0; px < width; px++) {
      if (data[(y * width + px) * 4 + 3] > 8) {
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return blob;
  const b = maxX - minX + 1, h = maxY - minY + 1;
  const uit = new OffscreenCanvas(b, h);
  uit.getContext('2d')!.drawImage(c, minX, minY, b, h, 0, 0, b, h);
  return uit.convertToBlob({ type: 'image/png' });
}
```

`opruimen.ts` `ruimAutomatischOp`, aan het einde:
```ts
  const grens = nu - 60 * DAG;
  await db.eigenStickers.where('gebruikt').below(grens).delete();
  await db.inzendingen.where('ontvangen').below(grens).delete();
```

`profielen.ts` `wisProfiel`: vóór `db.profielen.delete(id)`: `await db.eigenStickers.where('profielId').equals(id).delete();`

- [ ] **Step 4: Run, verify GREEN**

Run: `npx vitest run src/storage`, `npm run check`, `npx playwright test e2e/opslag.spec.ts e2e/opruimen.spec.ts e2e/profielen.spec.ts`
Expected: PASS (bestaande databases upgraden naar versie 2 zonder dataverlies).

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat(storage): database version 2 with own stickers and class submissions"
```

---

### Task 6: Mijn stickers (UI)

**Files:**
- Modify: `src/ui/ContextBalk.svelte`, `src/ui/FotoPaneel.svelte`, `src/ui/StickerPaneel.svelte`, `src/ui/EditorScherm.svelte`, `src/App.svelte`
- Create: `e2e/mijn-stickers.spec.ts`

**Interfaces:**
- Consumes: Task 5 (`bewaarEigenSticker`, `lijstEigenStickers`, `gebruikEigenSticker`, `wisEigenSticker`, `snijTransparantBij`, `StickerFout`), Task 4 (`uitknipsel`), `maakFoto`, `AssetStore.addBlob`, `pasIn`.
- Produces:
  - EditorScherm krijgt prop `profielId: string | null` (App geeft `profiel?.id ?? null`) en functie `maakSticker(id)`: `snijTransparantBij(assets.blob(assetId))` → `bewaarEigenSticker(db, profielId, blob)` → `toon('Bewaard in Mijn stickers', 'check-circle')`; `StickerFout` → `toon('Je hebt al veel stickers. Wis er eerst een paar.', 'warning')`; andere fout → `toon('Bewaren lukte niet. Probeer het nog eens.', 'warning')`.
  - Knoppen "Maak sticker": `#ctx-maak-sticker` (ContextBalk, alleen `el.type === 'foto' && el.uitknipsel`, icoon `sticker`, tekst "Sticker") en `#foto-maak-sticker` (FotoPaneel, idem). Props: ContextBalk `onMaakSticker?: () => void`, FotoPaneel `onMaakSticker: (id: string) => void`.
  - StickerPaneel: props `profielId: string | null`; eerste tab `#pakket-mijn` (icoon `user-circle`, aria-label "Mijn stickers"); in die tab een raster `.eigen-sticker` met knoppen; lege tekst `#mijn-leeg` "Haal de achtergrond van een foto weg en tik op Maak sticker."; knop `#mijn-bewerk` ("Wissen" aan/uit) toont op elke sticker een knop `.eigen-wis` (aria-label "Sticker wissen"); daarna bevestigen met `Dialoog` ("Deze sticker wissen?", knoppen "Niet wissen" / "Wissen"). Lang drukken (600 ms `pointerdown` zonder `pointerup`) zet ook de wis-modus aan.
  - Tik op een eigen sticker → `assets.addBlob(blob)`, `gebruikEigenSticker`, `editor.add({ ...maakFoto({ x: midden, y: midden, ...pasIn(w, h, 300), assetId }), uitknipsel: true, verhoudingVast: true })`.
  - Na `bewaarEigenSticker` in de editor moet de tab vernieuwen: StickerPaneel laadt de lijst bij mount en elke keer als de tab gekozen wordt.

- [ ] **Step 1: Failing e2e**

`e2e/mijn-stickers.spec.ts`:
```ts
import { test, expect, openNieuweCollage, elementen, maakPng } from './helpers';

test('uitknipsel bewaren als sticker en weer gebruiken en wissen', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__achtergrondWeg = async (blob: Blob) => {
      const bmp = await createImageBitmap(blob);
      const c = new OffscreenCanvas(bmp.width, bmp.height);
      const x = c.getContext('2d')!;
      x.drawImage(bmp, 0, 0);
      x.clearRect(0, 0, bmp.width / 2, bmp.height);
      return c.convertToBlob({ type: 'image/png' });
    };
  });
  await openNieuweCollage(page);
  await page.click('#tool-foto');
  const chooser = page.waitForEvent('filechooser');
  await page.click('#foto-kiezen');
  await (await chooser).setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: await maakPng(page) });
  await page.waitForFunction(() => window.__collage.editor.get().collage.elementen.length === 1);
  await expect(page.locator('#ctx-maak-sticker')).toHaveCount(0);
  await page.click('#ctx-achtergrond-weg');
  await page.click('#ctx-maak-sticker');
  await expect(page.getByText('Bewaard in Mijn stickers')).toBeVisible();

  await page.click('#tool-stickers');
  await page.click('#pakket-mijn');
  await expect(page.locator('.eigen-sticker')).toHaveCount(1);
  await page.locator('.eigen-sticker').first().click();
  await page.waitForFunction(() => window.__collage.editor.get().collage.elementen.length === 2);
  const nieuw = (await elementen(page))[1];
  expect(nieuw).toMatchObject({ type: 'foto', uitknipsel: true, verhoudingVast: true });
  // De linkerhelft van de 400x300-PNG is transparant: bijgesneden blijft 200x300.
  expect(nieuw.breedte / nieuw.hoogte).toBeCloseTo(200 / 300, 2);

  await page.click('#mijn-bewerk');
  await page.locator('.eigen-wis').first().click();
  await page.getByRole('button', { name: 'Wissen', exact: true }).click();
  await expect(page.locator('#mijn-leeg')).toBeVisible();
});
```
- [ ] **Step 2: Run, verify RED**

Run: `npx playwright test e2e/mijn-stickers.spec.ts --project=chromebook`
Expected: FAIL (`#ctx-maak-sticker` bestaat niet).

- [ ] **Step 3: Implement**

`ContextBalk.svelte`: prop `onMaakSticker?: () => void` en na `#ctx-achtergrond-weg`:
```svelte
    {#if el.type === 'foto' && el.uitknipsel && onMaakSticker}
      <button id="ctx-maak-sticker" onclick={onMaakSticker}><Icon name="sticker" /><span>Sticker</span></button>
    {/if}
```
`FotoPaneel.svelte`: prop `onMaakSticker: (id: string) => void`; onder `#foto-achtergrond-weg`:
```svelte
  {#if foto.uitknipsel}<button id="foto-maak-sticker" class="breed" onclick={() => onMaakSticker(foto.id)}><Icon name="sticker" /> Maak sticker</button>{/if}
```

`EditorScherm.svelte`: prop `profielId = null` (`profielId?: string | null`), en:
```ts
  async function maakSticker(id: string) {
    const f = editor.get().collage.elementen.find((e) => e.id === id);
    const blob = f?.type === 'foto' && f.assetId ? assets.blob(f.assetId) : undefined;
    if (!blob) return;
    try {
      await bewaarEigenSticker(db, profielId, await snijTransparantBij(blob));
      toon('Bewaard in Mijn stickers', 'check-circle');
    } catch (e) {
      toon(e instanceof StickerFout ? 'Je hebt al veel stickers. Wis er eerst een paar.' : 'Bewaren lukte niet. Probeer het nog eens.', 'warning');
    }
  }
```
Geef `onMaakSticker` door aan ContextBalk (`() => void maakSticker(geselecteerd!.id)`) en FotoPaneel, en `profielId` aan StickerPaneel. `App.svelte`: `<EditorScherm ... profielId={profiel?.id ?? null} />`.

`StickerPaneel.svelte` (aanvullingen; bestaande pakketten blijven):
```ts
  import { db } from '../storage/db';
  import { gebruikEigenSticker, lijstEigenStickers, wisEigenSticker } from '../storage/eigen-stickers';
  import type { EigenStickerRij } from '../storage/db';
  import { maakFoto } from '../document/create';
  import { pasIn } from '../import/afbeelding';
  import Dialoog from './Dialoog.svelte';
  // prop erbij: profielId = null
  let eigen = $state.raw<{ rij: EigenStickerRij; url: string }[]>([]);
  let bewerk = $state(false);
  let teWissen = $state<string | null>(null);
  let drukTimer: ReturnType<typeof setTimeout> | undefined;

  async function laadEigen() {
    for (const e of eigen) URL.revokeObjectURL(e.url);
    eigen = (await lijstEigenStickers(db, profielId)).map((rij) => ({ rij, url: URL.createObjectURL(rij.blob) }));
  }
  function kiesMijn() { pakket = 'mijn'; bewerk = false; void laadEigen(); }

  async function voegEigenToe(rij: EigenStickerRij) {
    if (bewerk) return;
    const id = await assets.addBlob(rij.blob);
    const img = assets.image(id)!;
    const maat = pasIn(img.naturalWidth, img.naturalHeight, 300);
    const f = FORMATEN[editor.get().collage.formaat];
    editor.add({ ...maakFoto({ x: f.breedte / 2, y: f.hoogte / 2, ...maat, assetId: id }), uitknipsel: true, verhoudingVast: true });
    void gebruikEigenSticker(db, rij.id);
  }
  async function wisBevestigd() {
    const id = teWissen;
    teWissen = null;
    if (!id) return;
    await wisEigenSticker(db, id);
    await laadEigen();
  }
  function drukStart() { drukTimer = setTimeout(() => (bewerk = true), 600); }
  function drukStop() { clearTimeout(drukTimer); }
  onDestroy(() => { drukStop(); for (const e of eigen) URL.revokeObjectURL(e.url); });
```
`pakket` mag nu ook `'mijn'` zijn; `huidig` alleen afleiden als `pakket !== 'mijn'`. Als `startPakket === 'mijn'` → bij mount `laadEigen()`. Markup: vóór de bestaande pakketknoppen:
```svelte
  <button id="pakket-mijn" role="tab" aria-selected={pakket === 'mijn'} class:actief={pakket === 'mijn'} aria-label="Mijn stickers" onclick={kiesMijn}>
    <Icon name="user-circle" size={30} />
  </button>
```
en de inhoud:
```svelte
{#if pakket === 'mijn'}
  <h3>Mijn stickers</h3>
  {#if !eigen.length}
    <p id="mijn-leeg" class="tip">Haal de achtergrond van een foto weg en tik op Maak sticker.</p>
  {:else}
    <button id="mijn-bewerk" class:actief={bewerk} aria-pressed={bewerk} onclick={() => (bewerk = !bewerk)}><Icon name="trash" /> Wissen</button>
    <div class="stickers">
      {#each eigen as e (e.rij.id)}
        <div class="eigen-vak">
          <button class="sticker-knop eigen-sticker" aria-label="Mijn sticker" onclick={() => void voegEigenToe(e.rij)} onpointerdown={drukStart} onpointerup={drukStop} onpointerleave={drukStop}>
            <img src={e.url} alt="" draggable="false" />
          </button>
          {#if bewerk}<button class="eigen-wis" aria-label="Sticker wissen" onclick={() => (teWissen = e.rij.id)}><Icon name="x" size={20} /></button>{/if}
        </div>
      {/each}
    </div>
  {/if}
{:else}
  <!-- bestaande h3 + .stickers van het gekozen pakket -->
{/if}
{#if teWissen}
  <Dialoog titel="Deze sticker wissen?" tekst="Je kan hem daarna niet meer gebruiken." knoppen={[
    { label: 'Niet wissen', hoofd: true, actie: () => (teWissen = null) },
    { label: 'Wissen', gevaar: true, actie: () => void wisBevestigd() },
  ]} />
{/if}
```
CSS: `.eigen-vak { position: relative; }`, `.eigen-wis { position: absolute; top: -6px; right: -6px; min-width: 56px; min-height: 56px; border-radius: 50%; background: #fde2e1; }`, `.tip { color: #6b6470; }`.

- [ ] **Step 4: Run, verify GREEN**

Run: `npm run check`, `npx vitest run`, `npx playwright test e2e/mijn-stickers.spec.ts e2e/vormen-stickers.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src e2e
git commit -m "feat(stickers): save cut-outs as own stickers (My stickers tab)"
```

---

### Task 7: Worker-klasmap

**Files:**
- Modify: `worker/src/index.ts`, `worker/index.test.ts`, `docs/delen-instellen.md`

**Interfaces:**
- Produces (HTTP, exact):
  - `POST /class/:code` → `201 {"token": "<32 hex>"}` of `409`.
  - `PUT /class/:code/:id` (header `X-Naam`) → `201` / `400` (naam) / `404` (geen map) / `409` (id bestaat of 60 bereikt) / `413`.
  - `GET /class/:code` + `X-Sleutel` → `200 [{"id","naam"}]` / `403` / `404`; verlengt de map.
  - `GET /class/:code/:id` + `X-Sleutel` → `200` (body = pakket, header `X-Naam` URI-gecodeerd) en daarna gewist / `403` / `404`.
  - CORS: `Access-Control-Allow-Headers: Content-Type, X-Sleutel, X-Naam`, `Access-Control-Expose-Headers: X-Naam`, methods `GET, PUT, POST, OPTIONS`.
  - `R2BucketLike` krijgt `list(o: { prefix: string; include?: ('customMetadata')[] }): Promise<{ objects: { key: string; customMetadata?: Record<string, string> }[] }>` (geen paginering nodig: max 61 objecten per map).
- Opslag: `class/<code>/map` (leeg, metadata `token`, `geopend`, `verloopt`, `aantal`), `class/<code>/<id>` (pakket, metadata `naam` = URI-gecodeerde naam).

- [ ] **Step 1: Failing tests**

Breid `nepBak()` in `worker/index.test.ts` uit:
```ts
    async list({ prefix }) {
      return { objects: [...data].filter(([k]) => k.startsWith(prefix)).map(([key, d]) => ({ key, customMetadata: d.meta })) };
    },
```
en voeg toe:
```ts
async function openKlas(e: Env, nu?: number): Promise<string> {
  const r = await verwerk(req('POST', '/class/abcd'), e, nu);
  expect(r.status).toBe(201);
  return ((await r.json()) as { token: string }).token;
}
const stuur = (e: Env, id: string, naam = 'Lies', nu?: number, body: BodyInit = 'pakket') =>
  verwerk(req('PUT', `/class/abcd/${id}`, body, { 'X-Naam': encodeURIComponent(naam) }), e, nu);
const ID = (n: number) => n.toString(16).padStart(16, '0');

describe('klasmap', () => {
  it('open geeft een token; tweede open is 409', async () => {
    const e = env();
    expect(await openKlas(e)).toMatch(/^[0-9a-f]{32}$/);
    expect((await verwerk(req('POST', '/class/abcd'), e)).status).toBe(409);
  });
  it('upload zonder map is 404; met map 201; zelfde id 409', async () => {
    const e = env();
    expect((await stuur(e, ID(1))).status).toBe(404);
    await openKlas(e);
    expect((await stuur(e, ID(1))).status).toBe(201);
    expect((await stuur(e, ID(1))).status).toBe(409);
  });
  it('naam moet 1 tot 40 tekens zijn; id moet 16 hex zijn', async () => {
    const e = env();
    await openKlas(e);
    expect((await stuur(e, ID(1), '')).status).toBe(400);
    expect((await stuur(e, ID(2), 'x'.repeat(41))).status).toBe(400);
    expect((await verwerk(req('PUT', '/class/abcd/niet-hex', 'p', { 'X-Naam': 'A' }), e)).status).toBe(404);
  });
  it('lijst en ophalen vragen het token; ophalen wist', async () => {
    const e = env();
    const token = await openKlas(e);
    await stuur(e, ID(1), 'Lies Één');
    expect((await verwerk(req('GET', '/class/abcd'), e)).status).toBe(403);
    const lijst = await verwerk(req('GET', '/class/abcd', undefined, { 'X-Sleutel': token }), e);
    expect(await lijst.json()).toEqual([{ id: ID(1), naam: 'Lies Één' }]);
    expect((await verwerk(req('GET', `/class/abcd/${ID(1)}`, undefined, { 'X-Sleutel': 'fout'.padEnd(32, '0') }), e)).status).toBe(403);
    const r = await verwerk(req('GET', `/class/abcd/${ID(1)}`, undefined, { 'X-Sleutel': token }), e);
    expect(r.status).toBe(200);
    expect(decodeURIComponent(r.headers.get('X-Naam')!)).toBe('Lies Één');
    expect(await r.text()).toBe('pakket');
    expect((await verwerk(req('GET', `/class/abcd/${ID(1)}`, undefined, { 'X-Sleutel': token }), e)).status).toBe(404);
  });
  it('maximaal 60 inzendingen', async () => {
    const e = env();
    await openKlas(e);
    for (let i = 0; i < 60; i++) expect((await stuur(e, ID(i))).status).toBe(201);
    expect((await stuur(e, ID(60))).status).toBe(409);
  });
  it('vervalt na 2 uur; lijst verlengt tot hooguit 8 uur', async () => {
    const e = env();
    const U = 3_600_000;
    const token = await openKlas(e, 0);
    expect((await stuur(e, ID(1), 'A', 2 * U + 1)).status).toBe(404);
    const e2 = env();
    const t2 = await openKlas(e2, 0);
    for (let u = 1.5; u < 8; u += 1.5) {
      expect((await verwerk(req('GET', '/class/abcd', undefined, { 'X-Sleutel': t2 }), e2, u * U)).status).toBe(200);
    }
    expect((await stuur(e2, ID(1), 'A', 8 * U + 1)).status).toBe(404);
    expect((await verwerk(req('POST', '/class/abcd'), e2, 8 * U + 1)).status).toBe(201);
    void token;
  });
  it('te groot is 413; CORS staat X-Naam toe en toont het', async () => {
    const e = env();
    await openKlas(e);
    expect((await verwerk(req('PUT', `/class/abcd/${ID(1)}`, 'x', { 'X-Naam': 'A', 'Content-Length': String(26 * 1024 * 1024) }), e)).status).toBe(413);
    const o = await verwerk(req('OPTIONS', '/class/abcd'), e);
    expect(o.headers.get('Access-Control-Allow-Headers')).toContain('X-Naam');
    expect(o.headers.get('Access-Control-Expose-Headers')).toBe('X-Naam');
  });
  it('relay-routes werken nog', async () => {
    const e = env();
    expect((await verwerk(req('POST', '/relay/abcd'), e)).status).toBe(201);
  });
});
```

- [ ] **Step 2: Run, verify RED**

Run: `npm run test:worker`
Expected: FAIL (klasroutes geven 404).

- [ ] **Step 3: Implement**

In `worker/src/index.ts`:
- `R2BucketLike` uitbreiden met `list` (zie Interfaces).
- CORS-headers uitbreiden: `'Access-Control-Allow-Headers': 'Content-Type, X-Sleutel, X-Naam'`, `'Access-Control-Expose-Headers': 'X-Naam'`.
- Constanten: `const UUR = 3_600_000; const KLAS_GELDIG = 2 * UUR; const KLAS_MAX_DUUR = 8 * UUR; const KLAS_MAX = 60; const KLAS_ID = /^[0-9a-f]{16}$/;`
- Routering: eerst `/relay/` zoals nu; daarna `const k = pad.match(/^\/class\/([^/]+)(?:\/([^/]+))?$/)`; `!k || !SLEUTEL.test(k[1]) || (k[2] !== undefined && !KLAS_ID.test(k[2]))` → 404. Rate limit blijft vóór beide routes gelden.
- Hulpfuncties:
```ts
interface KlasMap { token: string; geopend: number; verloopt: number; aantal: number }

async function leesMap(env: Env, basis: string, nu: number): Promise<KlasMap | null> {
  const obj = await env.BAK.get(`${basis}/map`);
  if (!obj) return null;
  const m = obj.customMetadata ?? {};
  const kaart = { token: m.token ?? '', geopend: Number(m.geopend), verloopt: Number(m.verloopt), aantal: Number(m.aantal) };
  if (!kaart.token || !Number.isFinite(kaart.verloopt) || nu > kaart.verloopt) { await ruimKlasOp(env, basis); return null; }
  return kaart;
}
async function schrijfMap(env: Env, basis: string, k: KlasMap): Promise<void> {
  await env.BAK.put(`${basis}/map`, new ArrayBuffer(0), { customMetadata: { token: k.token, geopend: String(k.geopend), verloopt: String(k.verloopt), aantal: String(k.aantal) } });
}
async function ruimKlasOp(env: Env, basis: string): Promise<void> {
  const { objects } = await env.BAK.list({ prefix: `${basis}/` });
  for (const o of objects) await env.BAK.delete(o.key);
}
function leesNaam(kop: string | null): string | null {
  if (kop === null) return null;
  try {
    const n = decodeURIComponent(kop).trim();
    return n.length >= 1 && n.length <= 40 ? n : null;
  } catch { return null; }
}
```
- Gedrag:
```ts
  const basis = `class/${k[1]}`;
  const id = k[2];
  if (req.method === 'POST' && !id) {
    if (await leesMap(env, basis, nu)) return antwoord(409);
    await ruimKlasOp(env, basis);
    const token = nieuwToken();
    await schrijfMap(env, basis, { token, geopend: nu, verloopt: nu + KLAS_GELDIG, aantal: 0 });
    return antwoord(201, JSON.stringify({ token }), { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  }
  if (req.method === 'PUT' && id) {
    const naam = leesNaam(req.headers.get('X-Naam'));
    if (!naam) return antwoord(400);
    if (Number(req.headers.get('Content-Length') ?? '0') > MAX) return antwoord(413);
    const kaart = await leesMap(env, basis, nu);
    if (!kaart) return antwoord(404);
    if (kaart.aantal >= KLAS_MAX || (await env.BAK.get(`${basis}/${id}`))) return antwoord(409);
    const body = await req.arrayBuffer();
    if (body.byteLength > MAX) return antwoord(413);
    await env.BAK.put(`${basis}/${id}`, body, { customMetadata: { naam: encodeURIComponent(naam) } });
    await schrijfMap(env, basis, { ...kaart, aantal: kaart.aantal + 1 });
    return antwoord(201);
  }
  if (req.method === 'GET') {
    const kaart = await leesMap(env, basis, nu);
    if (kaart && req.headers.get('X-Sleutel') !== kaart.token) return antwoord(403);
    if (!kaart) return antwoord(404);
    if (!id) {
      await schrijfMap(env, basis, { ...kaart, verloopt: Math.min(nu + KLAS_GELDIG, kaart.geopend + KLAS_MAX_DUUR) });
      const { objects } = await env.BAK.list({ prefix: `${basis}/`, include: ['customMetadata'] });
      const lijst = objects.filter((o) => o.key !== `${basis}/map`).map((o) => ({ id: o.key.slice(basis.length + 1), naam: decodeURIComponent(o.customMetadata?.naam ?? '') }));
      return antwoord(200, JSON.stringify(lijst), { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    }
    const obj = await env.BAK.get(`${basis}/${id}`);
    if (!obj) return antwoord(404);
    const data = await obj.arrayBuffer();
    await env.BAK.delete(`${basis}/${id}`);
    return antwoord(200, data, { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Naam': obj.customMetadata?.naam ?? '' });
  }
  return antwoord(405);
```
(Let op: het teller-veld `aantal` telt alle uploads, ook al opgehaalde; zo blijft het maximum 60 per map. `ruimKlasOp` wordt ook aangeroepen bij een verlopen map.)

`docs/delen-instellen.md`: korte alinea "Klas ontvangen": dezelfde Worker en bucket, geen extra instelling; de klasmap leeft 2 uur (verlengd zolang de leerkracht ontvangt, hooguit 8 uur), maximaal 60 collages; alleen het leerkrachttoestel met de geheime sleutel kan ze ophalen; na ophalen worden ze van de server gewist; de R2-regel wist alles na 1 dag. Na `wrangler deploy` opnieuw deployen is nodig om de nieuwe routes te krijgen (`npm run relay:deploy`; stap voor de gebruiker).

- [ ] **Step 4: Run, verify GREEN**

Run: `npm run test:worker`, `npm run check:worker`
Expected: PASS, 0 fouten.

- [ ] **Step 5: Commit**

```bash
git add worker docs/delen-instellen.md
git commit -m "feat(worker): class folder for teacher mode (token, max 60, 2-8 hours)"
```

---

### Task 8: Klas-client (code, relay, versturen, ontvanger)

**Files:**
- Create: `src/share/klas.ts`, `src/share/klas.test.ts`
- Modify: `src/share/fouten.ts`, `src/share/peer.ts` (alleen `isNetwerkFout` exporteren)

**Interfaces:**
- Consumes: `codeNaarSleutel`, `DEEL_SYMBOLEN` (code.ts), `PeerFabriek`, `standaardFabriek`, `deelTimeout`, `OVERDRACHT_MS` (peer.ts), `relayAdres` (relay.ts), `DeelFout`, `Toestemming` (delen.ts), `MAX_PAKKET` (pakket.ts).
- Produces:
  - `DeelFout`-codes erbij: `'geen-leerkracht'`, `'klas-vol'`; `DEELTEKST['geen-leerkracht'] = 'Ik vind de leerkracht niet. Klopt de code?'`, `DEELTEKST['klas-vol'] = 'De leerkracht kan nu niets meer ontvangen.'`.
  - `klasPeerId(code: string[]): string` = `'kidsklas-' + codeNaarSleutel(code)`.
  - `nieuwKlasId(): string` (16 hex via `getRandomValues`).
  - `schoneNaam(naam: string): string | null` (trim, 1–40 tekens, anders null).
  - `maakKlasRelay(adres: string | null, slaap?)` → `{ ingesteld: boolean; open(sleutel, f?): Promise<string | 'bezet' | null>; upload(sleutel, id, naam, pakket, f?): Promise<void>; lijst(sleutel, token, f?): Promise<{ id: string; naam: string }[] | null>; haal(sleutel, id, token, f?): Promise<{ naam: string; pakket: Blob } | null> }`. `upload`: 404 → `DeelFout('geen-leerkracht')`, 409 → `DeelFout('klas-vol')`, 413 → `te-groot`, 400 → `relay`, 429 → opnieuw na 1 s en 3 s, netwerkfout → `relay`. `haal` controleert de zip-handtekening zoals `relay.download`. `klasRelay()` = `maakKlasRelay(relayAdres())`.
  - `stuurNaarLeerkracht(o: { code: string[]; naam: string; pakket: Blob; instelling: CloudDelen; vraag: Toestemming; direct?: (doelId: string, naam: string, pakket: Blob) => Promise<void>; relay?: ReturnType<typeof maakKlasRelay> }): Promise<'direct' | 'server'>` — zelfde volgorde als `deel()`; rechtstreeks `niet-gevonden` wordt altijd `geen-leerkracht` (geen omweg via de server); alleen `geen-verbinding` leidt naar toestemming en server, waar `404` ook `geen-leerkracht` geeft.
  - `verstuurKlasDirect(doelId: string, naam: string, pakket: Blob, o?: { timeoutMs?: number; fabriek?: PeerFabriek }): Promise<void>` — als `verstuurDirect`, maar stuurt `{ soort: 'klas', naam, bestand }`.
  - `startKlasOntvanger(code: string[], o: { onInzending(naam: string, pakket: Blob): void; onFout?(f: DeelFout): void; fabriek?: PeerFabriek }): { klaar: Promise<void>; stop(): void }` — één peer, meerdere verbindingen tegelijk; per bericht controle `soort === 'klas'`, `schoneNaam(naam)`, `bestand` ArrayBuffer/view, grootte ≤ `MAX_PAKKET`; bij ongeldig: niets bewaren, verbinding sluiten; bij geldig: eerst `{ soort: 'ontvangen' }` sturen, dan `onInzending`, dan na 1 s de verbinding sluiten. `unavailable-id` vóór open → `klaar` verwerpt met `DeelFout('code-bezet')`.

- [ ] **Step 1: Failing tests**

`src/share/klas.test.ts` (nep-PeerJS in dezelfde stijl als `src/share/peer.test.ts`: lees dat bestand eerst en hergebruik de nep-klassen daar als ze exporteerbaar zijn; anders kopieer de minimale nep hieronder):
```ts
import { describe, it, expect } from 'vitest';
import { DeelFout } from './fouten';
import { klasPeerId, maakKlasRelay, nieuwKlasId, schoneNaam, startKlasOntvanger, stuurNaarLeerkracht } from './klas';
import type { ConnLike, PeerFabriek, PeerLike } from './peer';

type Luisteraars = Record<string, ((...a: any[]) => void)[]>;
function nepConn(): ConnLike & { verstuurd: unknown[]; gesloten: boolean; geef(d: unknown): void } {
  const l: Luisteraars = {};
  return {
    verstuurd: [], gesloten: false,
    on(e: string, cb: any) { (l[e] ??= []).push(cb); },
    send(d) { this.verstuurd.push(d); },
    close() { this.gesloten = true; },
    geef(d) { for (const cb of l.data ?? []) cb(d); },
  } as any;
}
function nepPeer(): PeerLike & { verbind(c: ConnLike): void; open(): void; fout(type: string): void } {
  const l: Luisteraars = {};
  return {
    on(e: string, cb: any) { (l[e] ??= []).push(cb); },
    connect() { throw new Error('niet nodig'); },
    destroy() {},
    verbind(c) { for (const cb of l.connection ?? []) cb(c); },
    open() { for (const cb of l.open ?? []) cb('id'); },
    fout(type) { for (const cb of l.error ?? []) cb({ type }); },
  } as any;
}
const zip = () => new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2]).buffer;

describe('klas', () => {
  it('peer-id, id en naam', () => {
    expect(klasPeerId(['star', 'heart', 'cloud', 'drop'])).toBe('kidsklas-abcd');
    expect(nieuwKlasId()).toMatch(/^[0-9a-f]{16}$/);
    expect(schoneNaam('  Lies ')).toBe('Lies');
    expect(schoneNaam('   ')).toBeNull();
    expect(schoneNaam('x'.repeat(41))).toBeNull();
  });

  it('ontvanger aanvaardt twee verbindingen tegelijk en weigert ongeldige berichten', async () => {
    const peer = nepPeer();
    const fabriek: PeerFabriek = () => peer;
    const binnen: string[] = [];
    const o = startKlasOntvanger(['star', 'heart', 'cloud', 'drop'], { fabriek, onInzending: (naam) => binnen.push(naam) });
    peer.open();
    await o.klaar;
    const a = nepConn(), b = nepConn(), kapot = nepConn();
    peer.verbind(a); peer.verbind(b); peer.verbind(kapot);
    a.geef({ soort: 'klas', naam: 'Lies', bestand: zip() });
    b.geef({ soort: 'klas', naam: 'Lies', bestand: zip() });
    kapot.geef({ soort: 'klas', naam: '', bestand: zip() });
    expect(binnen).toEqual(['Lies', 'Lies']);
    expect(a.verstuurd).toEqual([{ soort: 'ontvangen' }]);
    expect(kapot.verstuurd).toEqual([]);
    expect(kapot.gesloten).toBe(true);
    o.stop();
  });

  it('bezette code geeft code-bezet', async () => {
    const peer = nepPeer();
    const o = startKlasOntvanger(['star', 'star', 'star', 'star'], { fabriek: () => peer, onInzending: () => {} });
    peer.fout('unavailable-id');
    await expect(o.klaar).rejects.toMatchObject({ code: 'code-bezet' });
  });

  it('versturen: direct lukt', async () => {
    const r = await stuurNaarLeerkracht({ code: ['star', 'heart', 'cloud', 'drop'], naam: 'Lies', pakket: new Blob(['x']), instelling: 'leerkracht', vraag: async () => true, direct: async (id, naam) => { expect(id).toBe('kidsklas-abcd'); expect(naam).toBe('Lies'); } });
    expect(r).toBe('direct');
  });

  it('versturen: niet gevonden = geen-leerkracht, zonder toestemmingsvraag of server', async () => {
    let gevraagd = false;
    const relay = maakKlasRelay('https://r.test');
    await expect(stuurNaarLeerkracht({ code: ['star', 'star', 'star', 'star'], naam: 'Lies', pakket: new Blob(['x']), instelling: 'kind', vraag: async () => (gevraagd = true), relay, direct: async () => { throw new DeelFout('niet-gevonden'); } })).rejects.toMatchObject({ code: 'geen-leerkracht' });
    expect(gevraagd).toBe(false);
  });

  it('versturen: geblokkeerd → toestemming → server; 404 = geen-leerkracht; 409 = klas-vol', async () => {
    const statussen = [201, 404, 409];
    const relay = maakKlasRelay('https://r.test', async () => {});
    const f = (async () => new Response(null, { status: statussen.shift()! })) as typeof fetch;
    const rel = { ...relay, upload: (s: string, i: string, n: string, p: Blob) => relay.upload(s, i, n, p, f) };
    const basis = { code: ['star', 'star', 'star', 'star'], naam: 'Lies', pakket: new Blob(['x']), instelling: 'kind' as const, vraag: async () => true, relay: rel, direct: async () => { throw new DeelFout('geen-verbinding'); } };
    expect(await stuurNaarLeerkracht(basis)).toBe('server');
    await expect(stuurNaarLeerkracht(basis)).rejects.toMatchObject({ code: 'geen-leerkracht' });
    await expect(stuurNaarLeerkracht(basis)).rejects.toMatchObject({ code: 'klas-vol' });
  });

  it('relay: upload stuurt X-Naam gecodeerd; lijst en haal sturen het token; haal controleert zip', async () => {
    const gezien: { url: string; init?: RequestInit }[] = [];
    const antwoorden = [
      new Response(null, { status: 201 }),
      new Response(JSON.stringify([{ id: 'a'.repeat(16), naam: 'Lies' }]), { status: 200 }),
      new Response(zip(), { status: 200, headers: { 'X-Naam': encodeURIComponent('Lies') } }),
      new Response('<html>', { status: 200 }),
    ];
    const f = (async (url: string, init?: RequestInit) => { gezien.push({ url, init }); return antwoorden.shift()!; }) as unknown as typeof fetch;
    const r = maakKlasRelay('https://r.test/');
    await r.upload('abcd', 'a'.repeat(16), 'Lies Één', new Blob(['x']), f);
    expect(gezien[0].url).toBe(`https://r.test/class/abcd/${'a'.repeat(16)}`);
    expect((gezien[0].init!.headers as Record<string, string>)['X-Naam']).toBe(encodeURIComponent('Lies Één'));
    expect(await r.lijst('abcd', 'tok', f)).toEqual([{ id: 'a'.repeat(16), naam: 'Lies' }]);
    expect((gezien[1].init!.headers as Record<string, string>)['X-Sleutel']).toBe('tok');
    expect((await r.haal('abcd', 'a'.repeat(16), 'tok', f))?.naam).toBe('Lies');
    expect(await r.haal('abcd', 'a'.repeat(16), 'tok', f)).toBeNull();
  });
});
```

- [ ] **Step 2: Run, verify RED**

Run: `npx vitest run src/share/klas.test.ts`
Expected: FAIL (module ontbreekt).

- [ ] **Step 3: Implement**

`fouten.ts`: codes en teksten toevoegen (zie Interfaces).
`peer.ts`: `export const isNetwerkFout = ...` (alleen `export` ervoor).

`src/share/klas.ts`:
```ts
import type { CloudDelen } from '../storage/instellingen';
import { codeNaarSleutel } from './code';
import { DeelFout } from './fouten';
import { MAX_PAKKET } from './pakket';
import { deelTimeout, isNetwerkFout, OVERDRACHT_MS, standaardFabriek, type PeerFabriek } from './peer';
import { relayAdres } from './relay';
import type { Toestemming } from './delen';

export const klasPeerId = (code: string[]): string => `kidsklas-${codeNaarSleutel(code)}`;

export function nieuwKlasId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (x) => x.toString(16).padStart(2, '0')).join('');
}

export function schoneNaam(naam: string): string | null {
  const n = naam.trim();
  return n.length >= 1 && n.length <= 40 ? n : null;
}

const ZIP_BEGIN = [0x50, 0x4b, 0x03, 0x04];
const OPNIEUW_NA_MS = [1000, 3000];
const wacht = (ms: number) => new Promise<void>((klaar) => setTimeout(klaar, ms));
const isZip = async (b: Blob) => {
  const begin = new Uint8Array(await b.slice(0, 4).arrayBuffer());
  return begin.length === 4 && ZIP_BEGIN.every((x, i) => begin[i] === x);
};

export function maakKlasRelay(adres: string | null, slaap: (ms: number) => Promise<void> = wacht) {
  const basis = adres ? adres.replace(/\/+$/, '') : null;
  return {
    ingesteld: basis !== null,
    async open(sleutel: string, f: typeof fetch = fetch): Promise<string | 'bezet' | null> {
      if (!basis) return null;
      try {
        const r = await f(`${basis}/class/${sleutel}`, { method: 'POST' });
        if (r.status === 409) return 'bezet';
        if (r.status !== 201) return null;
        const { token } = (await r.json()) as { token?: unknown };
        return typeof token === 'string' && token ? token : null;
      } catch { return null; }
    },
    async upload(sleutel: string, id: string, naam: string, pakket: Blob, f: typeof fetch = fetch): Promise<void> {
      if (!basis) throw new DeelFout('geen-verbinding');
      for (let poging = 0; ; poging++) {
        let r: Response;
        try {
          r = await f(`${basis}/class/${sleutel}/${id}`, { method: 'PUT', body: pakket, headers: { 'X-Naam': encodeURIComponent(naam) } });
        } catch { throw new DeelFout('relay'); }
        if (r.status === 429 && poging < OPNIEUW_NA_MS.length) { await slaap(OPNIEUW_NA_MS[poging]); continue; }
        if (r.status === 404) throw new DeelFout('geen-leerkracht');
        if (r.status === 409) throw new DeelFout('klas-vol');
        if (r.status === 413) throw new DeelFout('te-groot');
        if (!r.ok) throw new DeelFout('relay');
        return;
      }
    },
    async lijst(sleutel: string, token: string, f: typeof fetch = fetch): Promise<{ id: string; naam: string }[] | null> {
      if (!basis) return null;
      try {
        const r = await f(`${basis}/class/${sleutel}`, { method: 'GET', headers: { 'X-Sleutel': token } });
        if (!r.ok) return null;
        const d = (await r.json()) as unknown;
        return Array.isArray(d) ? d.filter((x): x is { id: string; naam: string } => typeof x?.id === 'string' && typeof x?.naam === 'string') : null;
      } catch { return null; }
    },
    async haal(sleutel: string, id: string, token: string, f: typeof fetch = fetch): Promise<{ naam: string; pakket: Blob } | null> {
      if (!basis) return null;
      try {
        const r = await f(`${basis}/class/${sleutel}/${id}`, { method: 'GET', headers: { 'X-Sleutel': token } });
        if (!r.ok) return null;
        const pakket = await r.blob();
        if (!(await isZip(pakket))) return null;
        let naam = '';
        try { naam = decodeURIComponent(r.headers.get('X-Naam') ?? ''); } catch { /* blijft leeg */ }
        return { naam: schoneNaam(naam) ?? 'Zonder naam', pakket };
      } catch { return null; }
    },
  };
}

export const klasRelay = () => maakKlasRelay(relayAdres());

export function verstuurKlasDirect(doelId: string, naam: string, pakket: Blob, o: { timeoutMs?: number; fabriek?: PeerFabriek } = {}): Promise<void> {
  // Zelfde verloop als verstuurDirect in peer.ts, met een klasbericht.
  const fabriek = o.fabriek ?? standaardFabriek;
  return new Promise<void>((resolve, reject) => {
    let klaar = false;
    const peer = fabriek();
    const einde = (f?: DeelFout) => {
      if (klaar) return;
      klaar = true;
      clearTimeout(timer);
      try { peer.destroy(); } catch { /* al weg */ }
      if (f) reject(f); else resolve();
    };
    let timer = setTimeout(() => einde(new DeelFout('geen-verbinding')), o.timeoutMs ?? deelTimeout());
    peer.on('error', (err) => {
      if (err?.type === 'peer-unavailable') einde(new DeelFout('niet-gevonden'));
      else if (isNetwerkFout(err?.type)) einde(new DeelFout('geen-verbinding'));
    });
    peer.on('open', async () => {
      try {
        const bestand = await pakket.arrayBuffer();
        if (klaar) return;
        const conn = peer.connect(doelId, { reliable: true, serialization: 'binary' });
        conn.on('open', () => {
          if (klaar) return;
          clearTimeout(timer);
          timer = setTimeout(() => einde(new DeelFout('geen-verbinding')), OVERDRACHT_MS);
          try { conn.send({ soort: 'klas', naam, bestand }); } catch { einde(new DeelFout('geen-verbinding')); }
        });
        conn.on('data', (d) => { if ((d as { soort?: string })?.soort === 'ontvangen') einde(); });
        conn.on('close', () => einde(new DeelFout('geen-verbinding')));
        conn.on('error', () => einde(new DeelFout('geen-verbinding')));
      } catch { einde(new DeelFout('geen-verbinding')); }
    });
  });
}

export async function stuurNaarLeerkracht(o: {
  code: string[]; naam: string; pakket: Blob; instelling: CloudDelen; vraag: Toestemming;
  direct?: (doelId: string, naam: string, pakket: Blob) => Promise<void>; relay?: ReturnType<typeof maakKlasRelay>;
}): Promise<'direct' | 'server'> {
  const naam = schoneNaam(o.naam);
  if (!naam) throw new Error('Lege naam');
  const direct = o.direct ?? ((id: string, n: string, p: Blob) => verstuurKlasDirect(id, n, p));
  const relay = o.relay ?? klasRelay();
  const serverMag = o.instelling !== 'nooit' && relay.ingesteld;
  try {
    await direct(klasPeerId(o.code), naam, o.pakket);
    return 'direct';
  } catch (e) {
    if (!(e instanceof DeelFout)) throw e;
    // Zoals bij delen (fase 3): de PeerServer zegt dat niemand die code heeft → geen omweg via de server.
    if (e.code === 'niet-gevonden') throw new DeelFout('geen-leerkracht');
    if (e.code !== 'geen-verbinding') throw e;
  }
  if (!serverMag) throw new DeelFout('geen-verbinding');
  if (!(await o.vraag(o.instelling as 'kind' | 'leerkracht'))) throw new DeelFout('geweigerd');
  await relay.upload(codeNaarSleutel(o.code), nieuwKlasId(), naam, o.pakket);
  return 'server';
}

export function startKlasOntvanger(code: string[], o: { onInzending(naam: string, pakket: Blob): void; onFout?(f: DeelFout): void; fabriek?: PeerFabriek }): { klaar: Promise<void>; stop(): void } {
  const peer = (o.fabriek ?? standaardFabriek)(klasPeerId(code));
  let geopend = false;
  const klaar = new Promise<void>((resolve, reject) => {
    peer.on('open', () => { geopend = true; resolve(); });
    peer.on('error', (err) => {
      const f = err?.type === 'unavailable-id' ? new DeelFout('code-bezet') : isNetwerkFout(err?.type) ? new DeelFout('geen-verbinding') : null;
      if (!f) return;
      if (!geopend) { reject(f); try { peer.destroy(); } catch { /* al weg */ } }
      else o.onFout?.(f);
    });
  });
  peer.on('connection', (conn) => {
    conn.on('data', (d) => {
      const b = d as { soort?: string; naam?: unknown; bestand?: ArrayBuffer | Uint8Array };
      const naam = typeof b?.naam === 'string' ? schoneNaam(b.naam) : null;
      const bestand = b?.bestand;
      const geldig = b?.soort === 'klas' && naam && (bestand instanceof ArrayBuffer || ArrayBuffer.isView(bestand)) && bestand.byteLength <= MAX_PAKKET;
      if (!geldig) { try { conn.close(); } catch { /* al weg */ } return; }
      try { conn.send({ soort: 'ontvangen' }); } catch { /* verbinding weg */ }
      try { o.onInzending(naam, new Blob([bestand as BlobPart])); } catch { /* een falende handler breekt de ontvanger niet */ }
      setTimeout(() => { try { conn.close(); } catch { /* al weg */ } }, 1000);
    });
  });
  return { klaar, stop: () => { try { peer.destroy(); } catch { /* al weg */ } } };
}
```
(`niet-gevonden` gaat nooit via de server, net als in fase 3: daar kan anders een toestemmingsvraag verschijnen voor een code die niemand heeft.)

- [ ] **Step 4: Run, verify GREEN**

Run: `npx vitest run src/share`, `npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/share
git commit -m "feat(share): class code, class relay client, send to teacher, multi-connection receiver"
```

---

### Task 9: Inzendingen bewaren

**Files:**
- Create: `src/storage/inzendingen.ts`, `src/storage/inzendingen.test.ts`

**Interfaces:**
- Consumes: `InzendingRij` en tabel `inzendingen` (Task 5), `vanBestand` (bestand.ts), `CollageFout`, `nieuwId`.
- Produces:
  - `bewaarInzending(db, naam: string, pakket: Blob, nu = Date.now()): Promise<InzendingRij>` — valideert met `vanBestand` (gooit `CollageFout` door, niets bewaard), haalt `voorbeeld.png` uit de zip als Blob (of `null`), bewaart `{ id: nieuwId(), naam, ontvangen: nu, bestand: pakket, voorbeeld }`.
  - `lijstInzendingen(db): Promise<InzendingRij[]>` (nieuwste eerst).
  - `wisInzending(db, id): Promise<void>`; `wisAlleInzendingen(db): Promise<void>`.

- [ ] **Step 1: Failing tests**

`src/storage/inzendingen.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import JSZip from 'jszip';
import { maakDb, type CollageDb } from './db';
import { ruimTestDbOp } from './testhulp';
import { maakVorm, nieuweCollage, nieuwId } from '../document/create';
import { naarBestand } from './bestand';
import { CollageFout } from '../document/validatie';
import { SCHEMA_VERSIE } from '../document/types';
import { bewaarInzending, lijstInzendingen, wisAlleInzendingen, wisInzending } from './inzendingen';

let db: CollageDb;
beforeEach(() => { db = maakDb(`test-${nieuwId()}`); });
afterEach(() => ruimTestDbOp(db));

const pakket = async () => {
  const c = { ...nieuweCollage('vierkant'), elementen: [maakVorm({ x: 1, y: 1, vorm: 'ster', breedte: 10, hoogte: 10 })] };
  return naarBestand(c, { blob: () => undefined }, new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' }));
};

describe('inzendingen', () => {
  it('bewaart geldige pakketten met voorbeeld, nieuwste eerst', async () => {
    const a = await bewaarInzending(db, 'Lies', await pakket(), 1000);
    const b = await bewaarInzending(db, 'Lies', await pakket(), 2000);
    const lijst = await lijstInzendingen(db);
    expect(lijst.map((r) => r.id)).toEqual([b.id, a.id]);
    expect(lijst[0].voorbeeld).toBeInstanceOf(Blob);
  });
  it('weigert een kapot of nieuwer pakket en bewaart niets', async () => {
    await expect(bewaarInzending(db, 'Lies', new Blob(['geen zip']))).rejects.toBeInstanceOf(CollageFout);
    const zip = new JSZip();
    zip.file('collage.json', JSON.stringify({ ...nieuweCollage('vierkant'), versie: SCHEMA_VERSIE + 1 }));
    await expect(bewaarInzending(db, 'Lies', await zip.generateAsync({ type: 'blob' }))).rejects.toMatchObject({ code: 'nieuwer' });
    expect(await lijstInzendingen(db)).toHaveLength(0);
  });
  it('wist één of alles', async () => {
    const a = await bewaarInzending(db, 'A', await pakket());
    await bewaarInzending(db, 'B', await pakket());
    await wisInzending(db, a.id);
    expect(await lijstInzendingen(db)).toHaveLength(1);
    await wisAlleInzendingen(db);
    expect(await lijstInzendingen(db)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run, verify RED**

Run: `npx vitest run src/storage/inzendingen.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/storage/inzendingen.ts`:
```ts
import JSZip from 'jszip';
import type { CollageDb, InzendingRij } from './db';
import { vanBestand } from './bestand';
import { nieuwId } from '../document/create';

async function voorbeeldUit(pakket: Blob): Promise<Blob | null> {
  try {
    const f = (await JSZip.loadAsync(pakket)).file('voorbeeld.png');
    return f ? new Blob([await f.async('uint8array')], { type: 'image/png' }) : null;
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
```

- [ ] **Step 4: Run, verify GREEN**

Run: `npx vitest run src/storage`, `npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/storage
git commit -m "feat(storage): store validated class submissions"
```

---

### Task 10: Klas ontvangen (leerkrachtscherm)

**Files:**
- Create: `src/ui/KlasOntvangScherm.svelte`
- Modify: `src/ui/LeerkrachtMenu.svelte`, `src/App.svelte`, `src/tour/tour.ts`, `e2e/helpers.ts`

**Interfaces:**
- Consumes: `startKlasOntvanger`, `klasRelay`, `codeNaarSleutel`, `nieuweCode`, `DEEL_SYMBOLEN` (Task 8), `bewaarInzending` (Task 9), `speel` (Task 2), `SYMBOOL_NAMEN`.
- Produces:
  - `KlasOntvangScherm.svelte` props `{ inst: Instellingen; onGalerij: () => void; onSluit: () => void }`. Ids: `#klas-scherm`, `#klas-code` met kinderen `[data-symbool]` (zelfde attribuut als `#ontvang-code` in fase 3), `#klas-teller` ("N collages ontvangen", 1 → "1 collage ontvangen"), `#klas-namen` (lijst, nieuwste bovenaan), `#klas-galerij`, `#klas-stop`, `#klas-chromebook` (waarschuwing, alleen bij `inst.toestel === 'chromebook'`), `#klas-netwerk` (zachte melding "Even geen verbinding. Ik blijf proberen.").
  - Gedrag: code kiezen met maximaal 5 pogingen (`code-bezet` of relay `'bezet'` → nieuwe code); als `relay.ingesteld && inst.cloudDelen !== 'nooit'` ook `relay.open(sleutel)`; polling `lijst` om de 5 s, om de 10 s als er 10 minuten niets binnenkwam; elke nieuwe id `haal` → `bewaarInzending` → teller/namen bijwerken + `speel('plop')`; ook bij rechtstreeks ontvangen. Een ongeldig pakket wordt stil overgeslagen (geen teller). Wakelock aanvragen bij mount, vrijgeven bij destroy. Bij `onFout` of netwerkfout tijdens polling: `#klas-netwerk` tonen; na de volgende geslaagde lijst verbergen. De peer opnieuw starten bij `geen-verbinding` na open (zelfde code, na 3 s).
  - LeerkrachtMenu: knoppen `#klas-ontvangen` (icoon `chalkboard-teacher`, "Klas ontvangen") en `#galerij-open` (icoon `images`, "Galerij") in een sectie "Klas"; props erbij `onKlas: () => void; onGalerij: () => void`.
  - App: state `scherm: 'klas' | 'galerij' | null`; LeerkrachtMenu sluit en opent het gekozen scherm. `#knop-leerkracht` blijft de enige weg (achter de code).
  - Tour `leerkracht` krijgt een stap `#klas-ontvangen` ("Klas ontvangen", "Toon een code op het bord. Kinderen sturen hun collage naar jou.").
  - `e2e/helpers.ts`: `leesKlasCode(p: Page): Promise<string[]>` (zoals `leesCode`, maar op `#klas-code [data-symbool]`), en `openLeerkrachtMenu(p: Page, code = '123456')`.

- [ ] **Step 1: Implement**

(Deze taak wordt end-to-end getest in Task 11, waar het kind-deel bestaat. Schrijf hier de component en de koppeling; de e2e-test volgt in Task 11.)

`src/ui/KlasOntvangScherm.svelte`:
```svelte
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Icon from './Icon.svelte';
  import { SYMBOOL_NAMEN } from '../storage/profielen';
  import type { Instellingen } from '../storage/instellingen';
  import { codeNaarSleutel, nieuweCode } from '../share/code';
  import { klasRelay, startKlasOntvanger } from '../share/klas';
  import { DeelFout } from '../share/fouten';
  import { bewaarInzending } from '../storage/inzendingen';
  import { db } from '../storage/db';
  import { speel } from '../feedback/geluid';

  let { inst, onGalerij, onSluit }: { inst: Instellingen; onGalerij: () => void; onSluit: () => void } = $props();

  const MAX_POGINGEN = 5;
  let code = $state<string[]>([]);
  let namen = $state<string[]>([]);
  let netwerk = $state(false);
  let mislukt = $state(false);
  const relay = klasRelay();
  const viaServer = relay.ingesteld && inst.cloudDelen !== 'nooit';
  let ontvanger: { stop(): void } | null = null;
  let pollTimer: ReturnType<typeof setTimeout> | undefined;
  let herstartTimer: ReturnType<typeof setTimeout> | undefined;
  let laatsteNieuw = Date.now();
  let weg = false;
  const gehaald = new Set<string>();
  let wake: { release(): Promise<void> } | null = null;

  async function nieuw(naam: string, pakket: Blob) {
    try {
      await bewaarInzending(db, naam, pakket);
    } catch { return; /* ongeldig of niet te bewaren: overslaan */ }
    if (weg) return;
    namen = [naam, ...namen];
    laatsteNieuw = Date.now();
    speel('plop');
  }

  function startPeer(c: string[]) {
    const o = startKlasOntvanger(c, {
      onInzending: (naam, pakket) => void nieuw(naam, pakket),
      onFout: (f) => {
        netwerk = true;
        if (f.code === 'geen-verbinding' && !weg) {
          ontvanger?.stop();
          herstartTimer = setTimeout(() => { if (!weg) { const n = startPeer(c); n.klaar.then(() => (netwerk = false), () => {}); } }, 3000);
        }
      },
    });
    ontvanger = o;
    return o;
  }

  function startPolling(sleutel: string, token: string) {
    const volgende = () => {
      const wachtMs = Date.now() - laatsteNieuw > 10 * 60_000 ? 10_000 : 5000;
      pollTimer = setTimeout(async () => {
        const lijst = await relay.lijst(sleutel, token);
        if (weg) return;
        if (!lijst) netwerk = true;
        else {
          netwerk = false;
          for (const item of lijst) {
            if (gehaald.has(item.id)) continue;
            const r = await relay.haal(sleutel, item.id, token);
            if (weg) return;
            if (r) { gehaald.add(item.id); await nieuw(r.naam, r.pakket); }
          }
        }
        if (!weg) volgende();
      }, wachtMs);
    };
    volgende();
  }

  async function begin() {
    for (let poging = 0; poging < MAX_POGINGEN && !weg; poging++) {
      const c = nieuweCode();
      const o = startPeer(c);
      let peerOk = true;
      try { await o.klaar; } catch (e) {
        o.stop();
        if (e instanceof DeelFout && e.code === 'code-bezet') continue;
        peerOk = false;
      }
      let token: string | null = null;
      if (viaServer) {
        const r = await relay.open(codeNaarSleutel(c));
        if (r === 'bezet') { o.stop(); continue; }
        token = r;
      }
      if (weg) { o.stop(); return; }
      if (!peerOk && !token) { mislukt = true; return; }
      code = c;
      if (!peerOk) netwerk = true;
      if (token) startPolling(codeNaarSleutel(c), token);
      return;
    }
    if (!weg) mislukt = true;
  }

  onMount(async () => {
    try { wake = await (navigator as unknown as { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock?.request('screen') ?? null; } catch { wake = null; }
    void begin();
  });
  onDestroy(() => {
    weg = true;
    ontvanger?.stop();
    clearTimeout(pollTimer);
    clearTimeout(herstartTimer);
    void wake?.release().catch(() => {});
  });
</script>

<div id="klas-scherm" class="scherm" role="dialog" aria-modal="true" aria-labelledby="klas-titel">
  <h1 id="klas-titel">Klas ontvangen</h1>
  {#if mislukt}
    <p class="fout" role="alert"><Icon name="warning" /> Ontvangen lukt niet op dit netwerk.</p>
  {:else if !code.length}
    <p role="status">Even geduld...</p>
  {:else}
    <div id="klas-code" class="code" aria-label="Klascode">
      {#each code as s}<span class="vak" data-symbool={s} aria-label={SYMBOOL_NAMEN[s] ?? s}><Icon name={s} size={96} /></span>{/each}
    </div>
    <p class="uitleg">Kinderen tikken <strong>Delen</strong>, dan <strong>Naar de leerkracht</strong>, en kiezen deze symbolen.</p>
    <p id="klas-teller" class="teller" role="status">{namen.length === 1 ? '1 collage ontvangen' : `${namen.length} collages ontvangen`}</p>
    <ul id="klas-namen">{#each namen as n, i (i)}<li><Icon name="student" /> {n}</li>{/each}</ul>
  {/if}
  {#if netwerk}<p id="klas-netwerk" class="zacht"><Icon name="wifi-slash" /> Even geen verbinding. Ik blijf proberen.</p>{/if}
  {#if inst.toestel === 'chromebook'}<p id="klas-chromebook" class="zacht"><Icon name="warning" /> Inzendingen verdwijnen bij uitloggen. Download ze als ZIP of PDF.</p>{/if}
  <div class="knoppen">
    <button id="klas-galerij" class="hoofd" onclick={onGalerij}><Icon name="images" /> Naar de galerij</button>
    <button id="klas-stop" onclick={onSluit}><Icon name="x" /> Stop</button>
  </div>
</div>

<style>
  .scherm { position: fixed; inset: 0; z-index: 85; background: var(--creme); display: flex; flex-direction: column; align-items: center; gap: 18px; padding: 24px; overflow-y: auto; box-sizing: border-box; }
  h1 { margin: 0; }
  .code { display: flex; gap: 18px; }
  .vak { width: 140px; height: 140px; border-radius: 32px; background: var(--paneel); box-shadow: var(--schaduw); display: grid; place-items: center; }
  .uitleg { font-size: 1.3rem; text-align: center; margin: 0; }
  .teller { font-size: 1.6rem; font-weight: 800; margin: 0; }
  ul { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; max-width: 900px; }
  li { background: var(--paneel); border-radius: 16px; padding: 8px 14px; display: flex; align-items: center; gap: 6px; font-weight: 700; }
  .zacht { color: #6b6470; display: flex; align-items: center; gap: 8px; margin: 0; }
  .fout { color: #c0392b; font-weight: 700; display: flex; gap: 8px; align-items: center; }
  .knoppen { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
  .knoppen button { padding: 0 22px; background: var(--paneel); }
  .hoofd { background: var(--koraal) !important; color: #fff; }
  @media (max-width: 700px) { .vak { width: 72px; height: 72px; border-radius: 20px; } }
</style>
```

`LeerkrachtMenu.svelte`: props `onKlas`, `onGalerij`; sectie vóór "Code wijzigen":
```svelte
      <section>
        <h2>Klas</h2>
        <div class="rij">
          <button id="klas-ontvangen" onclick={onKlas}><Icon name="chalkboard-teacher" /> Klas ontvangen</button>
          <button id="galerij-open" onclick={onGalerij}><Icon name="images" /> Galerij</button>
        </div>
      </section>
```

`App.svelte`:
```ts
  let scherm = $state<'klas' | 'galerij' | null>(null);
```
`<LeerkrachtMenu ... onKlas={() => { toonLeerkracht = false; scherm = 'klas'; }} onGalerij={() => { toonLeerkracht = false; scherm = 'galerij'; }} />` en
```svelte
{#if scherm === 'klas' && inst}
  <KlasOntvangScherm {inst} onGalerij={() => (scherm = 'galerij')} onSluit={() => (scherm = null)} />
{/if}
```
(De galerij-tak voegt Task 13 toe. In deze taak zet `onGalerij` alleen `scherm = 'galerij'`; tot Task 13 toont dat niets.)

`tour.ts` `leerkracht`: stap toevoegen (zie Interfaces).

`e2e/helpers.ts`:
```ts
export async function leesKlasCode(p: Page): Promise<string[]> {
  await expect(p.locator('#klas-code [data-symbool]')).toHaveCount(4, { timeout: 15_000 });
  return p.locator('#klas-code [data-symbool]').evaluateAll((els) => els.map((e) => e.getAttribute('data-symbool')!));
}

export async function openLeerkrachtMenu(p: Page, code = '123456'): Promise<void> {
  await p.click('#knop-leerkracht');
  for (const c of code) await p.click(`#cijfer-${c}`);
}
```

- [ ] **Step 2: Check**

Run: `npm run check`, `npx vitest run src/tour`
Expected: PASS, 0 fouten.

- [ ] **Step 3: Commit**

```bash
git add src e2e/helpers.ts
git commit -m "feat(teacher): class receive screen with code, live names and server folder"
```

---

### Task 11: Kind stuurt naar de leerkracht

**Files:**
- Modify: `src/ui/DeelDialoog.svelte`, `src/ui/EditorScherm.svelte`, `src/App.svelte`, `src/tour/tour.ts`, `e2e/helpers.ts`
- Create: `e2e/klas.spec.ts`

**Interfaces:**
- Consumes: `stuurNaarLeerkracht`, `schoneNaam` (Task 8); KlasOntvangScherm (Task 10); `leesKlasCode`, `openLeerkrachtMenu` (Task 10).
- Produces:
  - DeelDialoog krijgt prop `profielNaam: string | null` (EditorScherm geeft het door; App geeft `profiel?.naam ?? null` aan EditorScherm als `profielNaam`).
  - Nieuwe eerste stap `'keuze'`: knoppen `#deel-vriend` (icoon `users`, "Naar een vriend") en `#deel-leerkracht` (icoon `chalkboard-teacher`, "Naar de leerkracht"). Vriend → de bestaande flow vanaf `'code'`.
  - Leerkracht-flow: stap `'klascode'` (`SymboolCode` titel "Welke code staat op het bord?") → stap `'naam'` met `<input id="deel-naam" maxlength="40">` vooringevuld met `profielNaam ?? ''` en knop `#deel-naam-stuur` ("Stuur", uitgeschakeld als `schoneNaam(naam)` null is) → `'bezig'` → `'klaar'` met `#deel-klaar` "Verstuurd naar de leerkracht!" (direct) of "Verstuurd naar de leerkracht via de server." → fouten: `geen-leerkracht` terug naar `'klascode'` met de melding; andere fouten → `'fout'`.
  - Tour `editor`: stap `#knop-deel` ("Delen", "Stuur je collage naar een vriend of naar je leerkracht.").
  - `e2e/helpers.ts` `nepRelay` krijgt ook de klasmap-semantiek op `**/__relay/class/**` (POST open → token; PUT met `X-Naam` alleen in een open map, 409 bij bestaande id; GET lijst/inzending met token; ophalen wist).

- [ ] **Step 1: Failing e2e**

`e2e/klas.spec.ts`:
```ts
import { test, expect, openNieuweCollage, nieuwToestel, nepRelay, leesKlasCode, openLeerkrachtMenu } from './helpers';
import type { Page } from '@playwright/test';

test.beforeEach(({}, info) => test.skip(info.project.name !== 'chromebook', 'WebRTC tussen contexten testen we in Chromium'));

async function stuur(kind: Page, code: string[], naam: string) {
  await kind.evaluate(() => {
    const { editor, maakVorm } = window.__collage;
    editor.add(maakVorm({ x: 600, y: 600, vorm: 'hart', breedte: 300, hoogte: 300 }));
  });
  await kind.click('#knop-deel');
  await kind.click('#deel-leerkracht');
  for (const s of code) await kind.click(`#symbool-${s}`);
  await kind.fill('#deel-naam', naam);
  await kind.click('#deel-naam-stuur');
}

test('leerkracht ontvangt rechtstreeks van twee kinderen', async ({ page, browser }) => {
  await page.goto('/');
  await openLeerkrachtMenu(page);
  await page.click('#klas-ontvangen');
  const code = await leesKlasCode(page);

  const kind1 = await nieuwToestel(browser);
  const kind2 = await nieuwToestel(browser);
  await openNieuweCollage(kind1);
  await openNieuweCollage(kind2);
  await Promise.all([stuur(kind1, code, 'Lies'), stuur(kind2, code, 'Omar')]);
  await expect(kind1.locator('#deel-klaar')).toContainText('Verstuurd naar de leerkracht!', { timeout: 20_000 });
  await expect(kind2.locator('#deel-klaar')).toContainText('Verstuurd naar de leerkracht!', { timeout: 20_000 });
  await expect(page.locator('#klas-teller')).toHaveText('2 collages ontvangen');
  await expect(page.locator('#klas-namen')).toContainText('Lies');
  await expect(page.locator('#klas-namen')).toContainText('Omar');
});

test('verkeerde klascode: leerkracht niet gevonden', async ({ page }) => {
  await openNieuweCollage(page);
  await stuur(page, ['tree', 'tree', 'tree', 'tree'], 'Lies');
  await expect(page.getByRole('alert')).toContainText('Ik vind de leerkracht niet. Klopt de code?');
});

test('geblokkeerd netwerk: via de klasmap op de server', async ({ page, browser }) => {
  const kind = await nieuwToestel(browser);
  await nepRelay([page, kind]);
  await page.goto('/');
  await openLeerkrachtMenu(page);
  await page.click('#klas-ontvangen');
  const code = await leesKlasCode(page);

  await kind.addInitScript(() => {
    (window as any).__peerOpties = { host: 'localhost', port: 9, path: '/', secure: false, debug: 0 };
    (window as any).__deelTimeoutMs = 1500;
  });
  await kind.goto('/');
  await openLeerkrachtMenu(kind);
  await kind.click('#cloud-kind');
  await kind.click('#leerkracht-sluit');
  await kind.click('#start-nieuw');
  await kind.click('#formaat-vierkant');
  await kind.waitForFunction(() => window.__collage?.controller);
  await stuur(kind, code, 'Lies');
  await kind.click('#toestemming-ja');
  await expect(kind.locator('#deel-klaar')).toContainText('via de server', { timeout: 20_000 });
  await expect(page.locator('#klas-teller')).toHaveText('1 collage ontvangen', { timeout: 20_000 });
});
```

`nepRelay` uitbreiden in `e2e/helpers.ts` (naast de bestaande relay-route, zelfde `pages`-lus):
```ts
  const klasMappen = new Map<string, string>();
  const klasData = new Map<string, Map<string, { naam: string; data: Buffer }>>();
  for (const p of pages) {
    await p.route('**/__relay/class/**', async (route) => {
      const v = route.request();
      const delen = new URL(v.url()).pathname.split('/').filter(Boolean); // ['__relay', 'class', code, id?]
      const [, , code, id] = delen;
      const token = klasMappen.get(code);
      if (v.method() === 'POST' && !id) {
        if (token) { await route.fulfill({ status: 409 }); return; }
        const t = `klas${++teller}`.padEnd(32, '0');
        klasMappen.set(code, t);
        klasData.set(code, new Map());
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ token: t }) });
        return;
      }
      if (v.method() === 'PUT' && id) {
        if (!token) { await route.fulfill({ status: 404 }); return; }
        const map = klasData.get(code)!;
        if (map.has(id)) { await route.fulfill({ status: 409 }); return; }
        map.set(id, { naam: (await v.headerValue('x-naam')) ?? '', data: v.postDataBuffer() ?? Buffer.alloc(0) });
        await route.fulfill({ status: 201 });
        return;
      }
      if (token && (await v.headerValue('x-sleutel')) !== token) { await route.fulfill({ status: 403 }); return; }
      if (!token) { await route.fulfill({ status: 404 }); return; }
      const map = klasData.get(code)!;
      if (!id) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([...map].map(([i, d]) => ({ id: i, naam: decodeURIComponent(d.naam) }))) });
        return;
      }
      const d = map.get(id);
      if (!d) { await route.fulfill({ status: 404 }); return; }
      map.delete(id);
      await route.fulfill({ status: 200, body: d.data, contentType: 'application/octet-stream', headers: { 'X-Naam': d.naam, 'Access-Control-Expose-Headers': 'X-Naam' } });
    });
  }
```
(`teller` is de bestaande teller in `nepRelay`; de lijst verlengt in de nep niet, dat hoeft niet voor e2e.)

- [ ] **Step 2: Run, verify RED**

Run: `npx playwright test e2e/klas.spec.ts --project=chromebook`
Expected: FAIL (`#deel-leerkracht` bestaat niet).

- [ ] **Step 3: Implement**

`DeelDialoog.svelte` (aanvullingen; de vriend-flow blijft ongewijzigd):
```ts
  import { untrack } from 'svelte';
  import { schoneNaam, stuurNaarLeerkracht } from '../share/klas';
  // prop erbij: profielNaam = null
  let stap = $state<'keuze' | 'code' | 'klascode' | 'naam' | 'bezig' | 'toestemming' | 'klaar' | 'fout'>('keuze');
  let naarLeerkracht = $state(false);
  let klascode: string[] = [];
  let naam = $state(untrack(() => profielNaam) ?? '');

  async function verstuurKlas() {
    melding = '';
    stap = 'bezig';
    try {
      const pakket = await pakketBelofte;
      manier = await stuurNaarLeerkracht({ code: klascode, naam, pakket, instelling: inst.cloudDelen, vraag });
      stap = 'klaar';
    } catch (e) {
      if (e instanceof DeelFout) {
        melding = DEELTEKST[e.code];
        stap = e.code === 'geen-leerkracht' ? 'klascode' : 'fout';
      } else {
        melding = 'Er ging iets mis. Probeer het nog eens.';
        stap = 'fout';
      }
    }
  }
```
Markup-takken:
```svelte
    {#if stap === 'keuze'}
      <h2>Naar wie stuur je je collage?</h2>
      <div class="keuze">
        <button id="deel-vriend" class="kaart" onclick={() => { naarLeerkracht = false; stap = 'code'; }}><Icon name="users" size={48} /> Naar een vriend</button>
        <button id="deel-leerkracht" class="kaart" onclick={() => { naarLeerkracht = true; stap = 'klascode'; }}><Icon name="chalkboard-teacher" size={48} /> Naar de leerkracht</button>
      </div>
    {:else if stap === 'klascode'}
      <SymboolCode titel="Welke code staat op het bord?" symbolen={DEEL_SYMBOLEN} lengte={DEEL_LENGTE} fout={melding} onKlaar={(c) => { klascode = c; melding = ''; stap = 'naam'; }} />
    {:else if stap === 'naam'}
      <label class="naam">Je naam
        <input id="deel-naam" bind:value={naam} maxlength="40" autocomplete="off" />
      </label>
      <button id="deel-naam-stuur" class="hoofd" disabled={!schoneNaam(naam)} onclick={() => void verstuurKlas()}><Icon name="paper-plane-tilt" /> Stuur</button>
    {:else if stap === 'code'}
      <!-- bestaande SymboolCode van de vriend-flow -->
```
en in `'klaar'`: `{naarLeerkracht ? (manier === 'direct' ? 'Verstuurd naar de leerkracht!' : 'Verstuurd naar de leerkracht via de server.') : (manier === 'direct' ? 'Verstuurd!' : 'Verstuurd via de server.')}`.
CSS: `.keuze { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; } .kaart { flex-direction: column; min-height: 140px; background: var(--creme); font-size: 1.1rem; } .naam { display: grid; gap: 8px; font-weight: 800; } .naam input { font-size: 1.4rem; min-height: 56px; border-radius: 16px; border: 3px solid var(--rand); padding: 0 14px; } .hoofd { background: var(--koraal); color: #fff; }`.

EditorScherm: prop `profielNaam?: string | null` doorgeven aan DeelDialoog. App: `profielNaam={profiel?.naam ?? null}`.

`tour.ts` `editor`: stap `#knop-deel` toevoegen vóór `#knop-bewaar`.

Bestaande e2e voor delen (`e2e/delen.spec.ts`, `e2e/delen-instelling.spec.ts`, en andere die `#knop-deel` gebruiken): na `#knop-deel` eerst `#deel-vriend` klikken (pas `maakEnDeel` in `delen.spec.ts` aan).

- [ ] **Step 4: Run, verify GREEN**

Run: `npm run check`, `npx vitest run`, `npx playwright test e2e/klas.spec.ts e2e/delen.spec.ts e2e/delen-instelling.spec.ts e2e/tour.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src e2e
git commit -m "feat(share): send a collage to the teacher with a class code and name"
```

---

### Task 12: ZIP en PDF van de klas

**Files:**
- Create: `src/export/klas.ts`, `src/export/klas.test.ts`
- Modify: `src/export/voorbeeld.ts` (alleen als nodig: lege fotovakken verbergen in de render)

**Interfaces:**
- Consumes: `InzendingRij` (Task 5), `vanBestand`, `AssetStore`, `vulAssets`, `maakVoorbeeld`, `FORMATEN`, `dataUrlNaarBlob`.
- Produces:
  - `zipNamen(namen: string[]): string[]` — vervangt `\ / : * ? " < > |` en controletekens door `-`, trimt, leeg → `collage`; dubbele (hoofdletterongevoelig) krijgen ` 2`, ` 3`…; geeft namen met `.png`.
  - `klasBestandsnaam(ext: 'zip' | 'pdf', datum = new Date()): string` → `klas-jjjj-mm-dd.<ext>`.
  - `renderInzending(rij: InzendingRij, schaal = 2): Promise<{ png: string; formaat: Formaat }>` (via `vanBestand` + `AssetStore` + `maakVoorbeeld(c, assets, FORMATEN[c.formaat].breedte * schaal)`).
  - `maakKlasZip(rijen: InzendingRij[], voortgang?: (klaar: number, totaal: number) => void): Promise<Blob>` — één PNG per inzending; een inzending die niet rendert wordt overgeslagen.
  - `maakKlasPdf(rijen: InzendingRij[], voortgang?: ...): Promise<Blob>` — één A4-pagina per inzending (oriëntatie per collage), afbeelding passend met 10 mm marge onderaan voor de naam (Nunito niet nodig: standaardfont `helvetica`, 16 pt, gecentreerd).

- [ ] **Step 1: Failing tests**

`src/export/klas.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { klasBestandsnaam, maakKlasPdf, maakKlasZip, zipNamen } from './klas';
import { maakVorm, nieuweCollage } from '../document/create';
import { naarBestand } from '../storage/bestand';
import type { InzendingRij } from '../storage/db';

const rij = async (naam: string, formaat: 'vierkant' | 'a4-liggend' = 'vierkant'): Promise<InzendingRij> => {
  const c = { ...nieuweCollage(formaat), elementen: [maakVorm({ x: 100, y: 100, vorm: 'ster', breedte: 100, hoogte: 100 })] };
  return { id: naam, naam, ontvangen: 1, bestand: await naarBestand(c, { blob: () => undefined }), voorbeeld: null };
};

describe('klas-export', () => {
  it('maakt unieke, veilige bestandsnamen', () => {
    expect(zipNamen(['Lies', 'lies', 'Lies', 'a/b', '  ', 'Omar'])).toEqual(['Lies.png', 'lies 2.png', 'Lies 3.png', 'a-b.png', 'collage.png', 'Omar.png']);
  });
  it('bestandsnaam met datum', () => {
    expect(klasBestandsnaam('zip', new Date(2026, 9, 10))).toBe('klas-2026-10-10.zip');
  });
  it('ZIP met één PNG per inzending; kapotte inzending overgeslagen', async () => {
    const kapot: InzendingRij = { id: 'x', naam: 'Kapot', ontvangen: 1, bestand: new Blob(['nee']), voorbeeld: null };
    const stappen: number[] = [];
    const zip = await JSZip.loadAsync(await maakKlasZip([await rij('Lies'), kapot, await rij('Lies')], (k) => stappen.push(k)));
    expect(Object.keys(zip.files).sort()).toEqual(['Lies 2.png', 'Lies.png']);
    expect(stappen.at(-1)).toBe(3);
  });
  it('PDF heeft één pagina per inzending', async () => {
    const pdf = await maakKlasPdf([await rij('Lies'), await rij('Omar', 'a4-liggend')]);
    const tekst = await pdf.text();
    expect((tekst.match(/\/Type \/Page\b/g) ?? []).length).toBe(2);
  });
});
```

- [ ] **Step 2: Run, verify RED**

Run: `npx vitest run src/export/klas.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/export/klas.ts`:
```ts
import JSZip from 'jszip';
import type { Formaat } from '../document/types';
import { FORMATEN } from '../document/formats';
import type { InzendingRij } from '../storage/db';
import { vanBestand } from '../storage/bestand';
import { vulAssets } from '../storage/collages';
import { AssetStore } from '../assets/store';
import { maakVoorbeeld } from './voorbeeld';
import { dataUrlNaarBlob } from './bewaar';

export function zipNamen(namen: string[]): string[] {
  const gezien = new Map<string, number>();
  return namen.map((n) => {
    // eslint-disable-next-line no-control-regex
    const schoon = n.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').trim() || 'collage';
    const sleutel = schoon.toLocaleLowerCase('nl');
    const aantal = (gezien.get(sleutel) ?? 0) + 1;
    gezien.set(sleutel, aantal);
    return `${aantal === 1 ? schoon : `${schoon} ${aantal}`}.png`;
  });
}

export function klasBestandsnaam(ext: 'zip' | 'pdf', datum = new Date()): string {
  const d = `${datum.getFullYear()}-${String(datum.getMonth() + 1).padStart(2, '0')}-${String(datum.getDate()).padStart(2, '0')}`;
  return `klas-${d}.${ext}`;
}

export async function renderInzending(rij: InzendingRij, schaal = 2): Promise<{ png: string; formaat: Formaat }> {
  const { collage, blobs } = await vanBestand(rij.bestand);
  const assets = new AssetStore();
  await vulAssets(assets, blobs);
  return { png: await maakVoorbeeld(collage, assets, FORMATEN[collage.formaat].breedte * schaal), formaat: collage.formaat };
}

type Voortgang = (klaar: number, totaal: number) => void;

export async function maakKlasZip(rijen: InzendingRij[], voortgang?: Voortgang): Promise<Blob> {
  const zip = new JSZip();
  const namen = zipNamen(rijen.map((r) => r.naam));
  for (const [i, r] of rijen.entries()) {
    try { zip.file(namen[i], await dataUrlNaarBlob((await renderInzending(r)).png)); } catch { /* kapotte inzending overslaan */ }
    voortgang?.(i + 1, rijen.length);
  }
  return zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
}

export async function maakKlasPdf(rijen: InzendingRij[], voortgang?: Voortgang): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  let pdf: InstanceType<typeof jsPDF> | null = null;
  for (const [i, r] of rijen.entries()) {
    try {
      const { png, formaat } = await renderInzending(r);
      const f = FORMATEN[formaat];
      const orientation = f.breedte > f.hoogte ? 'landscape' : 'portrait';
      if (!pdf) pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
      else pdf.addPage('a4', orientation);
      const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
      const marge = 10, naamVak = 14;
      const s = Math.min((pw - 2 * marge) / f.breedte, (ph - 2 * marge - naamVak) / f.hoogte);
      const w = f.breedte * s, h = f.hoogte * s;
      pdf.addImage(png, 'PNG', (pw - w) / 2, marge, w, h, undefined, 'FAST');
      pdf.setFontSize(16);
      pdf.text(r.naam, pw / 2, marge + h + 9, { align: 'center' });
    } catch { /* kapotte inzending overslaan */ }
    voortgang?.(i + 1, rijen.length);
  }
  return (pdf ?? new jsPDF()).output('blob');
}
```
(Als `maakVoorbeeld` lege fotovakken meetekent: verberg in `maakVoorbeeld` nodes met naam `leeg-vak` vóór `toDataURL`, zoals `exportPng` doet — `laag.find('.leeg-vak').forEach((n) => n.hide())`.)

- [ ] **Step 4: Run, verify GREEN**

Run: `npx vitest run src/export`, `npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/export
git commit -m "feat(export): class ZIP and PDF with names"
```

---

### Task 13: Galerij en diavoorstelling

**Files:**
- Create: `src/ui/Galerij.svelte`, `src/ui/Diavoorstelling.svelte`, `e2e/galerij.spec.ts`
- Modify: `src/App.svelte`, `src/tour/tour.ts`, `e2e/helpers.ts` (`ALLE_TOURS` + `'galerij'`)

**Interfaces:**
- Consumes: `lijstInzendingen`, `wisInzending`, `wisAlleInzendingen` (Task 9); `maakKlasZip`, `maakKlasPdf`, `klasBestandsnaam` (Task 12); `bewaarBestand`; `VoortgangDialoog` (Task 4); `Dialoog`; `startTour`, `tourGezien`.
- Produces:
  - `Galerij.svelte` props `{ inst: Instellingen; onOpenKopie: (pakket: Blob) => void; onSluit: () => void }`. Ids: `#galerij`, `#galerij-sluit`, `#galerij-dia`, `#galerij-zip`, `#galerij-pdf`, `#galerij-alles-wissen`, `#galerij-leeg` ("Nog geen collages ontvangen."), `#galerij-chromebook` (waarschuwing op Chromebook), kaarten `.inzending` met `img` (voorbeeld of een symbool `image`), naam, tijd (`toLocaleTimeString('nl', { hour: '2-digit', minute: '2-digit' })` als vandaag, anders datum), knoppen `.inzending-bekijk`, `.inzending-open`, `.inzending-wis` (bevestigen via Dialoog "Deze collage wissen?").
  - Groot bekijken: overlay `#galerij-groot` met de PNG (via `renderInzending`, schaal 1) en sluitknop `#galerij-groot-sluit`.
  - ZIP/PDF: `VoortgangDialoog` met deel = klaar/totaal, dan `bewaarBestand(blob, klasBestandsnaam(...))`.
  - `Diavoorstelling.svelte` props `{ rijen: InzendingRij[]; onSluit: () => void }`. Ids: `#dia`, `#dia-beeld`, `#dia-naam` (aan/uit), `#dia-vorige`, `#dia-volgende`, `#dia-speel` (aria-pressed; "Pauze"/"Speel"), `#dia-tijd-5`, `#dia-tijd-10`, `#dia-tijd-20` (aria-pressed, standaard 10), `#dia-naam-aan` (aria-pressed, standaard aan), `#dia-sluit`. Toetsen: pijl links/rechts, spatie = pauze/speel, Esc = sluiten. Vegen: `pointerdown`/`pointerup` met |dx| > 60 px. Fullscreen via `requestFullscreen` als die bestaat (fout negeren). Rendert de huidige en de volgende PNG vooraf (`renderInzending(rij, 1)`), cache per id.
  - App: `{#if scherm === 'galerij' && inst}<Galerij {inst} onOpenKopie={(p) => { scherm = null; void openBestand(p); }} onSluit={() => (scherm = null)} />{/if}`.
  - Tour `galerij` (4 stappen): `#galerij-dia` "Diavoorstelling" / "Toon alle collages groot op het bord.", `#galerij-zip` "ZIP" / "Download alle collages als foto's.", `#galerij-pdf` "PDF" / "Eén PDF met alle collages en namen, om te printen.", `#galerij-alles-wissen` "Wissen" / "Wis alles als je klaar bent.". `TourId` krijgt `'galerij'`; `markeerGezien` behandelt `'galerij'` als `'leerkracht'` (gedeelde sleutel, niet per profiel).

- [ ] **Step 1: Failing e2e**

Inzendingen zaaien gaat via het e2e-object `__opslag` (zie Step 3: `bewaarInzending` en `testPakket` erbij, alleen in `MODE === 'e2e'`).

`e2e/galerij.spec.ts`:
```ts
import { test, expect, openLeerkrachtMenu } from './helpers';
import type { Page } from '@playwright/test';

async function zaai(page: Page, namen: string[]) {
  await page.waitForFunction(() => (window as any).__opslag?.db);
  await page.evaluate(async (lijst) => {
    const o = (window as any).__opslag;
    for (const [i, n] of lijst.entries()) await o.bewaarInzending(o.db, n, await o.testPakket(), Date.now() + i);
  }, namen);
}

test('galerij: bekijken, wissen, ZIP en PDF downloaden', async ({ page }) => {
  await page.goto('/');
  await zaai(page, ['Lies', 'Omar', 'Lies']);
  await openLeerkrachtMenu(page);
  await page.click('#galerij-open');
  await expect(page.locator('.inzending')).toHaveCount(3);
  await expect(page.locator('.inzending').first()).toContainText('Lies');

  await page.locator('.inzending-bekijk').first().click();
  await expect(page.locator('#galerij-groot img')).toBeVisible();
  await page.click('#galerij-groot-sluit');

  const zip = page.waitForEvent('download');
  await page.click('#galerij-zip');
  expect((await zip).suggestedFilename()).toMatch(/^klas-\d{4}-\d{2}-\d{2}\.zip$/);
  const pdf = page.waitForEvent('download');
  await page.click('#galerij-pdf');
  expect((await pdf).suggestedFilename()).toMatch(/^klas-\d{4}-\d{2}-\d{2}\.pdf$/);

  await page.locator('.inzending-wis').first().click();
  await page.getByRole('button', { name: 'Wissen', exact: true }).click();
  await expect(page.locator('.inzending')).toHaveCount(2);
  await page.click('#galerij-alles-wissen');
  await page.getByRole('button', { name: 'Alles wissen', exact: true }).click();
  await expect(page.locator('#galerij-leeg')).toBeVisible();
});

test('diavoorstelling: bladeren, naam, pauze en sluiten', async ({ page }) => {
  await page.goto('/');
  await zaai(page, ['Lies', 'Omar']);
  await openLeerkrachtMenu(page);
  await page.click('#galerij-open');
  await page.click('#galerij-dia');
  await expect(page.locator('#dia-naam')).toHaveText('Omar');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#dia-naam')).toHaveText('Lies');
  await page.click('#dia-vorige');
  await expect(page.locator('#dia-naam')).toHaveText('Omar');
  await page.click('#dia-naam-aan');
  await expect(page.locator('#dia-naam')).toHaveCount(0);
  await expect(page.locator('#dia-speel')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Space');
  await expect(page.locator('#dia-speel')).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Escape');
  await expect(page.locator('#dia')).toHaveCount(0);
});

test('diavoorstelling speelt automatisch verder', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await zaai(page, ['Lies', 'Omar']);
  await openLeerkrachtMenu(page);
  await page.click('#galerij-open');
  await page.click('#galerij-dia');
  await page.click('#dia-tijd-5');
  await expect(page.locator('#dia-naam')).toHaveText('Omar');
  await page.clock.runFor(5_100);
  await expect(page.locator('#dia-naam')).toHaveText('Lies');
});
```
(Op het ipad-project gebruikt `bewaarBestand` de deelfunctie alleen bij `navigator.canShare`; in WebKit-emulatie valt het terug op downloaden. Als de download op ipad toch niet komt, skip dan alleen de ZIP/PDF-stappen op ipad met een duidelijke reden.)

- [ ] **Step 2: Run, verify RED**

Run: `npx playwright test e2e/galerij.spec.ts --project=chromebook`
Expected: FAIL.

- [ ] **Step 3: Implement**

`opstart.ts` `zaaiE2e`:
```ts
  (window as unknown as { __opslag: unknown }).__opslag = {
    db, bewaarInzending,
    testPakket: () => naarBestand({ ...nieuweCollage('vierkant'), elementen: [maakVorm({ x: 600, y: 600, vorm: 'ster', breedte: 400, hoogte: 400 })] }, { blob: () => undefined }),
  };
```
(imports: `bewaarInzending` uit `./inzendingen`, `naarBestand` uit `./bestand`, `maakVorm`/`nieuweCollage` uit `../document/create`; let op circulaire imports — `opstart.ts` importeert al uit `./opruimen`; dit is alleen e2e en mag.)

`src/ui/Galerij.svelte`:
```svelte
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Icon from './Icon.svelte';
  import Dialoog from './Dialoog.svelte';
  import VoortgangDialoog from './VoortgangDialoog.svelte';
  import Diavoorstelling from './Diavoorstelling.svelte';
  import { db, type InzendingRij } from '../storage/db';
  import { lijstInzendingen, wisAlleInzendingen, wisInzending } from '../storage/inzendingen';
  import { klasBestandsnaam, maakKlasPdf, maakKlasZip, renderInzending } from '../export/klas';
  import { bewaarBestand } from '../export/bewaar';
  import type { Instellingen } from '../storage/instellingen';
  import { toon } from './toast';
  import { startTour, tourGezien } from '../tour/tour';

  let { inst, onOpenKopie, onSluit }: { inst: Instellingen; onOpenKopie: (pakket: Blob) => void; onSluit: () => void } = $props();
  let rijen = $state.raw<InzendingRij[]>([]);
  let urls = $state.raw<Record<string, string>>({});
  let teWissen = $state.raw<InzendingRij | null>(null);
  let allesWissen = $state(false);
  let groot = $state<string | null>(null);
  let bezig = $state<{ titel: string; deel: number | null } | null>(null);
  let dia = $state(false);
  let tourTimer: ReturnType<typeof setTimeout> | undefined;

  async function laad() {
    for (const u of Object.values(urls)) URL.revokeObjectURL(u);
    rijen = await lijstInzendingen(db);
    urls = Object.fromEntries(rijen.filter((r) => r.voorbeeld).map((r) => [r.id, URL.createObjectURL(r.voorbeeld!)]));
  }

  const tijd = (t: number) => {
    const d = new Date(t);
    return d.toDateString() === new Date().toDateString() ? d.toLocaleTimeString('nl', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('nl');
  };

  async function bekijk(r: InzendingRij) {
    try { groot = (await renderInzending(r, 1)).png; } catch { toon('Deze collage kan ik niet openen.', 'warning'); }
  }

  async function download(soort: 'zip' | 'pdf') {
    if (!rijen.length || bezig) return;
    bezig = { titel: soort === 'zip' ? 'ZIP maken...' : 'PDF maken...', deel: 0 };
    try {
      const v = (k: number, n: number) => { bezig = { titel: bezig!.titel, deel: k / n }; };
      const blob = soort === 'zip' ? await maakKlasZip(rijen, v) : await maakKlasPdf(rijen, v);
      bezig = null;
      await bewaarBestand(blob, klasBestandsnaam(soort));
    } catch {
      toon('Downloaden lukte niet. Probeer het nog eens.', 'warning');
    } finally {
      bezig = null;
    }
  }

  async function wisEen() { const r = teWissen; teWissen = null; if (r) { await wisInzending(db, r.id); await laad(); } }
  async function wisAlles() { allesWissen = false; await wisAlleInzendingen(db); await laad(); }

  onMount(async () => { await laad(); if (!tourGezien('galerij') && rijen.length) tourTimer = setTimeout(() => startTour('galerij'), 300); });
  onDestroy(() => { clearTimeout(tourTimer); for (const u of Object.values(urls)) URL.revokeObjectURL(u); });
</script>

<div id="galerij" class="scherm" role="dialog" aria-modal="true" aria-labelledby="galerij-titel">
  <header>
    <h1 id="galerij-titel">Galerij</h1>
    <button id="galerij-sluit" aria-label="Sluiten" onclick={onSluit}><Icon name="x" /></button>
  </header>
  {#if inst.toestel === 'chromebook'}<p id="galerij-chromebook" class="zacht"><Icon name="warning" /> Inzendingen verdwijnen bij uitloggen. Download ze als ZIP of PDF.</p>{/if}
  <div class="acties">
    <button id="galerij-dia" disabled={!rijen.length} onclick={() => (dia = true)}><Icon name="play" /> Diavoorstelling</button>
    <button id="galerij-zip" disabled={!rijen.length} onclick={() => void download('zip')}><Icon name="file-zip" /> Download ZIP</button>
    <button id="galerij-pdf" disabled={!rijen.length} onclick={() => void download('pdf')}><Icon name="file-pdf" /> Download PDF</button>
    <button id="galerij-alles-wissen" class="gevaar" disabled={!rijen.length} onclick={() => (allesWissen = true)}><Icon name="trash" /> Alles wissen</button>
  </div>
  {#if !rijen.length}
    <p id="galerij-leeg" class="leeg">Nog geen collages ontvangen.</p>
  {:else}
    <ul class="raster">
      {#each rijen as r (r.id)}
        <li class="inzending">
          {#if urls[r.id]}<img src={urls[r.id]} alt="Collage van {r.naam}" />{:else}<span class="geen"><Icon name="image" size={48} /></span>{/if}
          <strong>{r.naam}</strong>
          <span class="tijd">{tijd(r.ontvangen)}</span>
          <div class="knoppen">
            <button class="inzending-bekijk" aria-label="Bekijk" onclick={() => void bekijk(r)}><Icon name="corners-out" /></button>
            <button class="inzending-open" aria-label="Open als kopie" onclick={() => onOpenKopie(r.bestand)}><Icon name="pencil-simple" /></button>
            <button class="inzending-wis gevaar" aria-label="Wis" onclick={() => (teWissen = r)}><Icon name="trash" /></button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

{#if groot}
  <div id="galerij-groot" class="groot" role="dialog" aria-modal="true" aria-label="Collage groot">
    <img src={groot} alt="Collage groot" />
    <button id="galerij-groot-sluit" aria-label="Sluiten" onclick={() => (groot = null)}><Icon name="x" /></button>
  </div>
{/if}
{#if dia}<Diavoorstelling {rijen} onSluit={() => (dia = false)} />{/if}
{#if bezig}<VoortgangDialoog titel={bezig.titel} deel={bezig.deel} />{/if}
{#if teWissen}
  <Dialoog titel="Deze collage wissen?" tekst="De collage van {teWissen.naam} wordt gewist." knoppen={[
    { label: 'Niet wissen', hoofd: true, actie: () => (teWissen = null) },
    { label: 'Wissen', gevaar: true, actie: () => void wisEen() },
  ]} />
{/if}
{#if allesWissen}
  <Dialoog titel="Alles wissen?" tekst="Alle ontvangen collages worden gewist." knoppen={[
    { label: 'Niet wissen', hoofd: true, actie: () => (allesWissen = false) },
    { label: 'Alles wissen', gevaar: true, actie: () => void wisAlles() },
  ]} />
{/if}

<style>
  .scherm { position: fixed; inset: 0; z-index: 86; background: var(--creme); overflow-y: auto; padding: 20px; box-sizing: border-box; display: grid; gap: 16px; align-content: start; }
  header { display: flex; justify-content: space-between; align-items: center; }
  h1 { margin: 0; }
  header button { background: transparent; }
  .acties { display: flex; gap: 10px; flex-wrap: wrap; }
  .acties button { padding: 0 18px; background: var(--paneel); }
  .acties button:disabled { opacity: 0.4; }
  .gevaar { color: #c0392b; }
  .zacht { color: #6b6470; display: flex; align-items: center; gap: 8px; margin: 0; }
  .leeg { font-size: 1.3rem; text-align: center; color: #6b6470; }
  .raster { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
  .inzending { background: var(--paneel); border-radius: 22px; padding: 12px; display: grid; gap: 6px; box-shadow: var(--schaduw); }
  .inzending img, .geen { width: 100%; aspect-ratio: 1; object-fit: contain; border-radius: 14px; background: var(--creme); display: grid; place-items: center; }
  .tijd { color: #6b6470; font-size: 0.9rem; }
  .knoppen { display: flex; gap: 6px; }
  .knoppen button { flex: 1; background: var(--creme); }
  .groot { position: fixed; inset: 0; z-index: 91; background: rgba(20, 18, 24, 0.9); display: grid; place-items: center; padding: 16px; }
  .groot img { max-width: 100%; max-height: 90dvh; border-radius: 12px; }
  .groot button { position: absolute; top: 16px; right: 16px; background: var(--paneel); }
</style>
```

`src/ui/Diavoorstelling.svelte`:
```svelte
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Icon from './Icon.svelte';
  import type { InzendingRij } from '../storage/db';
  import { renderInzending } from '../export/klas';

  let { rijen, onSluit }: { rijen: InzendingRij[]; onSluit: () => void } = $props();
  let i = $state(0);
  let speelt = $state(true);
  let seconden = $state(10);
  let naamAan = $state(true);
  let beelden = $state.raw<Record<string, string>>({});
  let houder: HTMLDivElement;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let vegen: { x: number } | null = null;
  let weg = false;

  const huidig = $derived(rijen[i]);

  async function zorgVoor(index: number) {
    const r = rijen[index];
    if (!r || beelden[r.id]) return;
    try {
      const { png } = await renderInzending(r, 1);
      if (!weg) beelden = { ...beelden, [r.id]: png };
    } catch { /* toont dan de naam zonder beeld */ }
  }
  function ga(stap: number) { i = (i + stap + rijen.length) % rijen.length; }

  $effect(() => {
    void zorgVoor(i);
    void zorgVoor((i + 1) % rijen.length);
  });
  $effect(() => {
    clearTimeout(timer);
    if (speelt && rijen.length > 1) timer = setTimeout(() => ga(1), seconden * 1000);
    void i;
  });

  function toets(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') ga(1);
    else if (e.key === 'ArrowLeft') ga(-1);
    else if (e.key === ' ') speelt = !speelt;
    else if (e.key === 'Escape') onSluit();
    else return;
    e.preventDefault();
  }
  function neer(e: PointerEvent) { vegen = { x: e.clientX }; }
  function op(e: PointerEvent) {
    if (!vegen) return;
    const dx = e.clientX - vegen.x;
    vegen = null;
    if (Math.abs(dx) > 60) ga(dx < 0 ? 1 : -1);
  }

  onMount(() => { void houder.requestFullscreen?.().catch(() => {}); });
  onDestroy(() => {
    weg = true;
    clearTimeout(timer);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  });
</script>

<svelte:window onkeydown={toets} />

<div id="dia" class="dia" bind:this={houder} role="dialog" aria-modal="true" aria-label="Diavoorstelling" onpointerdown={neer} onpointerup={op}>
  {#if huidig}
    {#if beelden[huidig.id]}<img id="dia-beeld" src={beelden[huidig.id]} alt="Collage van {huidig.naam}" />{/if}
    {#if naamAan}<p id="dia-naam" class="naam">{huidig.naam}</p>{/if}
  {/if}
  <button id="dia-vorige" class="pijl links" aria-label="Vorige" onclick={() => ga(-1)}><Icon name="caret-left" size={40} /></button>
  <button id="dia-volgende" class="pijl rechts" aria-label="Volgende" onclick={() => ga(1)}><Icon name="caret-right" size={40} /></button>
  <div class="balk">
    <button id="dia-speel" aria-pressed={speelt} onclick={() => (speelt = !speelt)}><Icon name={speelt ? 'pause' : 'play'} /> {speelt ? 'Pauze' : 'Speel'}</button>
    {#each [5, 10, 20] as s}
      <button id="dia-tijd-{s}" aria-pressed={seconden === s} class:actief={seconden === s} onclick={() => (seconden = s)}>{s} s</button>
    {/each}
    <button id="dia-naam-aan" aria-pressed={naamAan} class:actief={naamAan} onclick={() => (naamAan = !naamAan)}><Icon name="student" /> Naam</button>
    <button id="dia-sluit" aria-label="Sluiten" onclick={onSluit}><Icon name="x" /></button>
  </div>
</div>

<style>
  .dia { position: fixed; inset: 0; z-index: 93; background: #1d1b22; display: grid; place-items: center; touch-action: pan-y; }
  img { max-width: 92vw; max-height: 78dvh; border-radius: 12px; }
  .naam { position: absolute; bottom: 96px; left: 0; right: 0; text-align: center; color: #fff; font-size: 2rem; font-weight: 800; margin: 0; }
  .pijl { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255, 255, 255, 0.15); color: #fff; min-width: 72px; min-height: 72px; border-radius: 50%; }
  .links { left: 16px; } .rechts { right: 16px; }
  .balk { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; background: rgba(255, 255, 255, 0.12); padding: 8px; border-radius: 22px; flex-wrap: wrap; justify-content: center; }
  .balk button { background: transparent; color: #fff; padding: 0 14px; }
  .balk button.actief { background: rgba(255, 255, 255, 0.25); }
</style>
```

`tour.ts`: `TourId` = `'editor' | 'leerkracht' | 'galerij' | Paneel`; tour `galerij` toevoegen; in `markeerGezien`: `const sleutel = id === 'leerkracht' || id === 'galerij' ? SLEUTEL : (profielSleutel ?? SLEUTEL);`.
`e2e/helpers.ts` `ALLE_TOURS` + `'galerij'`.

- [ ] **Step 4: Run, verify GREEN**

Run: `npm run check`, `npx vitest run`, `npx playwright test e2e/galerij.spec.ts e2e/tour.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src e2e
git commit -m "feat(teacher): gallery with view, open as copy, ZIP/PDF download and slideshow"
```

---

### Task 14: Rondleidingen, documentatie en eindcontrole

**Files:**
- Modify: `src/tour/tour.ts`, `src/tour/tour.test.ts` (als die de stappen telt), `docs/testen-op-toestellen.md`, `docs/delen-instellen.md`, `README.md` (maak aan als die niet bestaat)

**Interfaces:**
- Produces:
  - Tour `foto`: stappen `#foto-camera` ("Camera", "Maak meteen een foto met de camera.") en `#foto-achtergrond-weg` ("Achtergrond weg", "Haal de achtergrond weg. Daarna kan je er een sticker van maken.") na `#foto-kiezen`/`#foto-bijsnijden`.
  - Tour `stickers`: stap `#pakket-mijn` ("Mijn stickers", "Hier staan je eigen stickers.") vooraan.
  - Tour `editor`: geen aparte stap voor `#ctx-verhouding` (die knop bestaat pas bij een geselecteerde foto). De beschrijving van de bestaande `#canvas-vlak`-stap wordt: "Tik op iets om het te kiezen. Sleep om het te verplaatsen. Met Verhouding los kan je een foto uitrekken."
  - `docs/testen-op-toestellen.md`: nieuwe secties "Camera en achtergrond weg" (iPad: camera toestaan/weigeren; achtergrond weg eerste keer met internet, daarna in vliegtuigmodus; Maak sticker; Mijn stickers wissen) en "Klas ontvangen" (3 toestellen; digibord-code; één toestel op een geblokkeerd netwerk; galerij, ZIP, PDF, diavoorstelling; Chromebook-waarschuwing) en "Geluid en beweging" (uitzetten in het leerkrachtmenu; iPad met "Beweging beperken").
  - `README.md`: korte sectie "Licentie": de app gebruikt `@imgly/background-removal` (AGPL-3.0); wie de app publiek online zet, moet de broncode ook publiek beschikbaar maken. Dit is een stap voor de gebruiker (repository publiek maken of een licentie kiezen); de agent publiceert niets.

- [ ] **Step 1: Tours en docs aanpassen** (zie Interfaces).

- [ ] **Step 2: Volledige controle**

Run (één voor één):
```bash
npm test
npm run test:worker
npm run check
npm run check:worker
npm run build
npx playwright test
```
Expected: alles groen (bestaande skips blijven skips). Noteer de aantallen in het rapport.

- [ ] **Step 3: Commit**

```bash
git add src docs README.md
git commit -m "docs: phase 4 tours, device checklist and AGPL note"
```
