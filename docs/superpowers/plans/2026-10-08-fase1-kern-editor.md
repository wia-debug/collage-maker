# Collagemaker fase 1 — kern-editor (offline) — uitvoeringsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een offline werkende collage-editor voor kinderen (6–12 jaar) met foto's (bijsnijden, vormmasker, kaders, filters), tekst en WordArt, stickers, vormen, tekenen, achtergronden, templates, uitdagingen, export naar PNG en PDF, en een rondleiding met Driver.js.

**Architecture:** Svelte 5 levert de schermen en panelen. Een `CanvasController` tekent het collage-document met Konva.js. De collage is één onveranderlijk JSON-document in een editor-store met undo-geschiedenis; elke wijziging maakt een nieuw document, en de controller vervangt alleen de Konva-nodes van gewijzigde elementen. Afbeeldingen zitten in een `AssetStore` (in fase 1 alleen in geheugen) en worden via `assetId` verwezen.

**Tech Stack:** Vite, Svelte 5, TypeScript, Konva.js, jsPDF, Driver.js, vite-plugin-pwa (Workbox), @fontsource-lettertypes, @phosphor-icons/core, Vitest 4 (browsermodus met Playwright/Chromium), Playwright Test.

**Spec:** `docs/superpowers/specs/2026-10-08-kids-collage-design.md` (fase 1 = sectie 12 punt 1).

## Global Constraints

- Nooit emoji in de interface of in getoonde teksten. Alle symbolen zijn SVG-iconen (Phosphor, MIT).
- Interface-taal: Nederlands. Datamodelvelden zijn Nederlands zoals in de spec (`breedte`, `hoogte`, `rotatie`, ...). Functie- en klassenamen in code mogen Engels of Nederlands zijn, maar volg de namen in dit plan exact.
- Knoppen minimaal 56 px (`--knop: 56px`).
- Doelplatformen: iPadOS 16+ Safari, ChromeOS Chrome 110+, recente desktop-Chrome, Edge en Firefox.
- Werkt volledig offline na de eerste keer laden. Geen CDN, geen externe lettertypes, geen netwerkverzoeken behalve het ophalen van een gesleepte afbeeldings-URL.
- Foto's worden bij import verkleind tot maximaal 2048 px aan de lange zijde.
- Ongedaan maken: maximaal 50 stappen. Eén gebaar (slepen, knijpen, transformeren) is één stap.
- `prefers-reduced-motion` schakelt animaties uit.
- Lettertypes zijn OFL, iconen MIT. Geen andere assets met een onduidelijke licentie.
- In fase 1 is er geen blijvende opslag. Persistentie, profielen en `.collage`-bestanden komen in fase 2. Delen komt in fase 3.
- Elk e2e-bestand importeert `test` en `expect` uit `e2e/helpers.ts`, nooit direct uit `@playwright/test` (behalve de tour-test in Task 22).

## Review Focus

1. **Enorme foto uit de iPad-galerij (12+ MP, ook HEIC):** wordt verkleind tot 2048 px, app crasht niet; als `createImageBitmap` faalt wordt via `<img>` gedecodeerd. Test: Task 10 (`verkleinAfbeelding` met 4000×3000 en met een SVG-blob die `createImageBitmap` weigert).
2. **Iets slepen of plakken dat geen bruikbare afbeelding is (tekstbestand, URL van site die kopiëren blokkeert):** vriendelijke melding, geen element toegevoegd. Test: Task 10.
3. **Eén sleep- of knijpgebaar levert precies één undo-stap op, niet één per beweging.** Test: Task 7.
4. **Exporteren terwijl een element geselecteerd is of terwijl er lege fotovakken zijn:** geen selectiehoeken, hulplijnen of lege vakken in de PNG; na export is de selectie terug. Test: Task 20.
5. **Tekst helemaal leegmaken:** het tekstelement verdwijnt, er blijft geen onzichtbaar element achter. Test: Task 14.

---

## Bestandsstructuur

```
package.json, tsconfig.json, svelte.config.js, vite.config.ts, playwright.config.ts, pwa-assets.config.ts, index.html, .gitignore
scripts/copy-assets.mjs            kopieert Phosphor-SVG's (UI-iconen en stickers)
public/logo.svg                     app-icoon (bron voor PWA-iconen)
public/stickers/<pakket>/*.svg      gegenereerd door copy-assets (niet in git)
src/main.ts, src/App.svelte, src/app.css, src/vite-env.d.ts
src/document/types.ts               datamodel (Collage, Element-varianten)
src/document/formats.ts             canvasformaten
src/document/create.ts              fabrieksfuncties voor collage en elementen
src/editor/history.ts               generieke undo/redo
src/editor/store.ts                 editor-store (document + selectie + geschiedenis)
src/editor/canvas.ts                CanvasController (Konva-stage, sync, selectie, gebaren, tekenen, export)
src/editor/snap.ts                  uitlijnhulp (pure functie)
src/editor/pinch.ts                 knijpgebaar (pure functie)
src/editor/toetsen.ts               sneltoetsen (pure functie)
src/editor/uitsnede.ts              bijsnijden: rekenfuncties
src/editor/tekenen.ts               streken normaliseren, penstijlen
src/editor/foto-acties.ts           foto toevoegen of vak vullen
src/editor/tekst-acties.ts          tekst maken, wijzigen, breedte berekenen
src/elements/base.ts                RenderCtx en baseGroup
src/elements/paths.ts               vormpaden (masker en vormen)
src/elements/vorm.ts, sticker.ts, foto.ts, kaders.ts, filters.ts, tekst.ts, wordart.ts, wordart-layout.ts, tekening.ts, achtergrond.ts, patronen.ts
src/elements/index.ts               renderElement (dispatch per type)
src/assets/icon-names.json          lijst UI-iconen
src/assets/sticker-packs.json       stickerpakketten
src/assets/stickers.ts              pakketten, URL, recolorSvg
src/assets/store.ts                 AssetStore
src/assets/fonts.ts                 lettertypes laden en meten
src/assets/wordart-presets.ts       12 WordArt-voorinstellingen
src/assets/templates.ts             12 templates
src/assets/uitdagingen.ts           20 uitdagingen
src/import/afbeelding.ts            decoderen, verkleinen, slepen/plakken
src/export/png.ts, pdf.ts, bewaar.ts, voorbeeld.ts
src/tour/tour.ts                    Driver.js-rondleidingen
src/ui/*.svelte                     schermen, balken, panelen, dialogen
src/ui/icons.ts, kleuren.ts, toast.ts, types.ts
e2e/*.spec.ts, e2e/helpers.ts
```

Unit-tests staan naast de code als `*.test.ts` en draaien in echte Chromium (Vitest browsermodus), zodat Konva en canvas echt werken.

---

### Task 1: Projectopzet, testinfrastructuur en basisstijl

**Files:**
- Create: `package.json`, `tsconfig.json`, `svelte.config.js`, `vite.config.ts`, `playwright.config.ts`, `index.html`, `.gitignore`, `src/main.ts`, `src/App.svelte`, `src/app.css`, `src/vite-env.d.ts`, `src/smoke.test.ts`, `e2e/helpers.ts`, `e2e/smoke.spec.ts`

**Interfaces:**
- Produces: `npm test` (Vitest, Chromium), `npm run test:e2e` (Playwright, projecten `ipad` en `chromebook`, build met `--mode e2e`), `e2e/helpers.ts` exporteert `test`, `expect`.

- [ ] **Step 1: package.json en afhankelijkheden**

```json
{
  "name": "collagemaker",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-check --tsconfig ./tsconfig.json",
    "test": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

Run:
```bash
npm install -D vite svelte @sveltejs/vite-plugin-svelte typescript svelte-check vitest @vitest/browser-playwright playwright @playwright/test
npm install konva @fontsource/nunito
npx playwright install chromium webkit
```
Controleer: `npx vitest --version` geeft 4.x. (Bij 3.x: `npm install -D vitest@4 @vitest/browser-playwright@4`.)

- [ ] **Step 2: Configuratiebestanden**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*", "e2e/**/*", "*.ts"]
}
```

`svelte.config.js`:
```js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
export default { preprocess: vitePreprocess() };
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  plugins: [svelte()],
  test: {
    include: ['src/**/*.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
});
```

`playwright.config.ts`:
```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:4173' },
  webServer: {
    command: 'npx vite build --mode e2e && npx vite preview --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: 'ipad', use: { ...devices['iPad Pro 11 landscape'] } },
    { name: 'chromebook', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
  ],
});
```

`.gitignore`:
```
node_modules/
dist/
dev-dist/
test-results/
playwright-report/
src/assets/icons/
public/stickers/
.vitest-attachments/
```

`src/vite-env.d.ts`:
```ts
/// <reference types="svelte" />
/// <reference types="vite/client" />
```

- [ ] **Step 3: index.html, basisstijl en app-shell**

`index.html`:
```html
<!doctype html>
<html lang="nl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#FF6B6B" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <title>Collagemaker</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/app.css`:
```css
:root {
  --creme: #fff8ee;
  --inkt: #2d2a32;
  --koraal: #ff6b6b;
  --zon: #ffc94d;
  --mint: #4ecdc4;
  --hemel: #5aa9f2;
  --lavendel: #a78bfa;
  --paneel: #ffffff;
  --rand: #ede3d3;
  --werkvlak: #efe6d8;
  --schaduw: 0 6px 20px rgba(45, 42, 50, 0.12);
  --radius: 20px;
  --knop: 56px;
  font-family: 'Nunito', system-ui, sans-serif;
  color: var(--inkt);
}
html, body { margin: 0; height: 100%; background: var(--creme); overscroll-behavior: none; -webkit-tap-highlight-color: transparent; }
body { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
#app { height: 100dvh; }
h1, h2, h3 { margin: 0 0 12px; font-weight: 800; }
button {
  font: inherit; font-weight: 700; color: inherit;
  min-width: var(--knop); min-height: var(--knop);
  border: 0; border-radius: 16px; background: var(--paneel);
  cursor: pointer; touch-action: manipulation;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
}
button:disabled { opacity: 0.35; cursor: default; }
button:focus-visible { outline: 3px solid var(--hemel); outline-offset: 2px; }
button.hoofd { background: var(--koraal); color: #fff; padding: 0 20px; }
button.gevaar { color: #c0392b; }
@media (hover: hover) { button:not(:disabled):hover { filter: brightness(0.96); } }
input, textarea, select { font: inherit; font-size: max(16px, 1em); }
input[type='range'] { width: 100%; height: 40px; accent-color: var(--koraal); }
.visueel-verborgen { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
```

`src/main.ts`:
```ts
import './app.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import { mount } from 'svelte';
import App from './App.svelte';

document.addEventListener('gesturestart', (e) => e.preventDefault());
mount(App, { target: document.getElementById('app')! });
```

`src/App.svelte`:
```svelte
<main>
  <h1>Collagemaker</h1>
</main>
```

- [ ] **Step 4: Rooktests schrijven**

`src/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import Konva from 'konva';

describe('testomgeving', () => {
  it('draait in een echte browser met canvas', () => {
    const c = document.createElement('canvas');
    expect(c.getContext('2d')).not.toBeNull();
    expect(typeof Konva.Stage).toBe('function');
  });
});
```

`e2e/helpers.ts`:
```ts
import { test as base, expect } from '@playwright/test';

export const test = base;
export { expect };
```

`e2e/smoke.spec.ts`:
```ts
import { test, expect } from './helpers';

test('app laadt', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Collagemaker' })).toBeVisible();
});
```

- [ ] **Step 5: Tests draaien**

Run: `npm test` — Expected: 1 test PASS.
Run: `npm run test:e2e` — Expected: 2 tests PASS (ipad + chromebook).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + Svelte 5 + Konva with Vitest browser mode and Playwright"
```

---

### Task 2: Iconen, stickerpakketten en Icon-component

**Files:**
- Create: `scripts/copy-assets.mjs`, `src/assets/icon-names.json`, `src/assets/sticker-packs.json`, `src/assets/stickers.ts`, `src/ui/icons.ts`, `src/ui/Icon.svelte`, `src/assets/stickers.test.ts`, `src/ui/icons.test.ts`
- Modify: `package.json` (scripts)

**Interfaces:**
- Produces:
  - `STICKER_PACKS: StickerPack[]`, `interface StickerPack { id: string; naam: string; icoon: string; stickers: string[] }`
  - `stickerUrl(sticker: string): string` — `sticker` heeft de vorm `"<pakket>/<naam>"`
  - `recolorSvg(svg: string, kleur: string, px?: number): string`
  - `iconSvg(name: string): string | undefined`, `ICON_NAMES: string[]`
  - `<Icon name size? />`

- [ ] **Step 1: Phosphor installeren**

Run: `npm install -D @phosphor-icons/core`

- [ ] **Step 2: Lijsten aanmaken**

`src/assets/icon-names.json`:
```json
[
  "arrow-left", "arrow-right", "arrow-up", "arrow-down", "arrow-counter-clockwise", "arrow-clockwise",
  "download-simple", "question", "image", "text-t", "sticker", "shapes", "pencil-simple", "pencil",
  "paint-bucket", "trash", "copy", "arrow-line-up", "arrow-line-down", "flip-horizontal", "lock",
  "lock-open", "crop", "x", "check", "plus", "prohibit", "eraser", "highlighter-circle", "paint-brush",
  "pen", "file-pdf", "file-png", "puzzle-piece", "trophy", "sparkle", "square", "circle", "heart", "star",
  "triangle", "line-segment", "cloud", "drop", "text-b", "text-italic", "text-align-left",
  "text-align-center", "text-align-right", "chat-circle", "warning", "info", "check-circle",
  "frame-corners", "magic-wand", "sliders", "paw-print", "rocket", "soccer-ball", "leaf", "cake",
  "tree", "pizza", "car", "palette", "gradient", "dots-nine"
]
```

`src/assets/sticker-packs.json`:
```json
[
  { "id": "dieren", "naam": "Dieren", "icoon": "paw-print", "stickers": ["cat", "dog", "bird", "fish", "fish-simple", "butterfly", "horse", "rabbit", "cow", "shrimp", "spider", "bug", "bug-beetle", "paw-print", "feather", "egg", "bone", "owl"] },
  { "id": "ruimte", "naam": "Ruimte", "icoon": "rocket", "stickers": ["rocket", "rocket-launch", "planet", "moon", "moon-stars", "star", "star-four", "shooting-star", "sun", "alien", "flying-saucer", "globe-hemisphere-west", "binoculars", "sparkle", "lightning", "atom", "compass"] },
  { "id": "sport", "naam": "Sport", "icoon": "soccer-ball", "stickers": ["soccer-ball", "basketball", "football", "baseball", "tennis-ball", "volleyball", "bicycle", "barbell", "trophy", "medal", "sneaker", "sneaker-move", "person-simple-run", "person-simple-bike", "person-simple-swim", "swimming-pool", "golf", "ping-pong", "flag-checkered"] },
  { "id": "seizoenen", "naam": "Seizoenen", "icoon": "leaf", "stickers": ["sun", "snowflake", "leaf", "flower", "flower-tulip", "plant", "tree", "cloud-rain", "cloud-snow", "cloud-sun", "umbrella", "thermometer-hot", "thermometer-cold", "rainbow", "rainbow-cloud", "wind", "drop", "tree-evergreen", "sun-horizon"] },
  { "id": "feest", "naam": "Feest", "icoon": "cake", "stickers": ["cake", "gift", "confetti", "crown", "music-notes", "music-note", "mask-happy", "sparkle", "heart", "star", "ice-cream", "cookie", "guitar", "piano-keys", "camera", "ticket"] },
  { "id": "natuur", "naam": "Natuur", "icoon": "tree", "stickers": ["tree", "tree-evergreen", "tree-palm", "flower", "flower-lotus", "flower-tulip", "leaf", "plant", "cactus", "mountains", "waves", "sun", "cloud", "drop", "campfire", "tent", "butterfly", "bug", "feather"] },
  { "id": "eten", "naam": "Eten", "icoon": "pizza", "stickers": ["pizza", "hamburger", "ice-cream", "cookie", "cake", "carrot", "pepper", "avocado", "egg", "bread", "cheese", "coffee", "popcorn", "orange-slice", "orange", "grains", "cooking-pot", "fork-knife", "bowl-food"] },
  { "id": "voertuigen", "naam": "Voertuigen", "icoon": "car", "stickers": ["car", "car-profile", "bus", "train", "airplane", "airplane-tilt", "boat", "sailboat", "bicycle", "motorcycle", "truck", "tractor", "van", "taxi", "scooter", "jeep", "ambulance", "fire-truck", "police-car", "subway", "rocket"] },
  { "id": "vormen", "naam": "Vormen", "icoon": "star", "stickers": ["arrow-right", "arrow-left", "arrow-up", "arrow-down", "arrow-bend-up-right", "arrows-clockwise", "heart", "star", "circle", "square", "triangle", "hexagon", "diamond", "octagon", "spiral", "lightning", "check-circle", "plus-circle", "question", "exclamation-mark", "sparkle"] },
  { "id": "tekstballonnen", "naam": "Tekstballonnen", "icoon": "chat-circle", "stickers": ["chat", "chat-circle", "chat-centered", "chat-teardrop", "chat-dots", "chat-circle-dots", "chat-teardrop-dots", "chat-centered-dots", "chats", "chats-circle", "chat-text", "chat-circle-text", "megaphone", "lightbulb", "exclamation-mark", "question", "cloud"] }
]
```

Regel bij ontbrekende UI-iconen: vervang de naam door een bestaand Phosphor-icoon met dezelfde betekenis en pas elke plek in de code aan die die naam gebruikt (zoek met `grep -rn '"<naam>"' src`).

Regel bij ontbrekende stickernamen: het script in Step 3 faalt en toont welke namen ontbreken. Vervang elke ontbrekende naam door een bestaand Phosphor-icoon uit hetzelfde thema (zoek in `node_modules/@phosphor-icons/core/assets/duotone/`). Elk pakket houdt minstens 15 stickers. Deze stickers worden later in templates gebruikt en moeten blijven bestaan: `seizoenen/sun`, `voertuigen/sailboat`, `natuur/tree-palm`, `feest/cake`, `feest/gift`, `feest/confetti`, `vormen/star`, `vormen/heart`, `dieren/paw-print`, `dieren/bone`, `tekstballonnen/chat-circle`, `ruimte/star-four`.

- [ ] **Step 3: Kopieerscript**

`scripts/copy-assets.mjs`:
```js
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const core = join(root, 'node_modules/@phosphor-icons/core/assets');
const icons = JSON.parse(readFileSync(join(root, 'src/assets/icon-names.json'), 'utf8'));
const packs = JSON.parse(readFileSync(join(root, 'src/assets/sticker-packs.json'), 'utf8'));
const missing = [];

const uiOut = join(root, 'src/assets/icons');
mkdirSync(uiOut, { recursive: true });
for (const name of icons) {
  const src = join(core, 'bold', `${name}-bold.svg`);
  if (!existsSync(src)) { missing.push(`bold/${name}`); continue; }
  copyFileSync(src, join(uiOut, `${name}.svg`));
}

for (const pack of packs) {
  const out = join(root, 'public/stickers', pack.id);
  mkdirSync(out, { recursive: true });
  for (const name of pack.stickers) {
    const src = join(core, 'duotone', `${name}-duotone.svg`);
    if (!existsSync(src)) { missing.push(`duotone/${name} (pakket ${pack.id})`); continue; }
    copyFileSync(src, join(out, `${name}.svg`));
  }
}

if (missing.length) {
  console.error('Ontbrekende Phosphor-iconen:\n' + missing.join('\n'));
  process.exit(1);
}
console.log(`Gekopieerd: ${icons.length} UI-iconen, ${packs.reduce((n, p) => n + p.stickers.length, 0)} stickers.`);
```

Voeg toe aan `package.json` → `scripts`:
```json
"assets": "node scripts/copy-assets.mjs",
"postinstall": "node scripts/copy-assets.mjs"
```

Run: `npm run assets` — Expected: "Gekopieerd: ..." en exit 0. Bij ontbrekende namen: pas de JSON aan volgens de regel in Step 2 en draai opnieuw.

- [ ] **Step 4: Failing tests schrijven**

`src/assets/stickers.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { STICKER_PACKS, recolorSvg, stickerUrl } from './stickers';

describe('stickers', () => {
  it('heeft 10 pakketten met elk minstens 15 stickers', () => {
    expect(STICKER_PACKS).toHaveLength(10);
    for (const p of STICKER_PACKS) expect(p.stickers.length).toBeGreaterThanOrEqual(15);
  });

  it('elke sticker is als bestand bereikbaar', async () => {
    for (const p of STICKER_PACKS) {
      for (const s of p.stickers) {
        const r = await fetch(stickerUrl(`${p.id}/${s}`));
        expect(r.ok, `${p.id}/${s}`).toBe(true);
      }
    }
  });

  it('recolorSvg vervangt currentColor en zet een vaste grootte', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 256 256" fill="currentColor"><path d="M0 0" opacity="0.2"/></svg>';
    const uit = recolorSvg(svg, '#FF6B6B', 512);
    expect(uit).not.toContain('currentColor');
    expect(uit).toContain('fill="#FF6B6B"');
    expect(uit).toContain('width="512"');
    expect(uit).toContain('height="512"');
    expect(uit).not.toContain('width="32"');
  });
});
```

`src/ui/icons.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import names from '../assets/icon-names.json';
import { iconSvg } from './icons';

describe('iconen', () => {
  it('elk icoon uit de lijst is beschikbaar als SVG', () => {
    for (const n of names) expect(iconSvg(n), n).toMatch(/^<svg/);
  });
});
```

- [ ] **Step 5: Run tests — moeten falen**

Run: `npx vitest run src/assets/stickers.test.ts src/ui/icons.test.ts`
Expected: FAIL — `Failed to resolve import "./stickers"` en `"./icons"`.

- [ ] **Step 6: Implementatie**

`src/assets/stickers.ts`:
```ts
import packs from './sticker-packs.json';

export interface StickerPack { id: string; naam: string; icoon: string; stickers: string[] }

export const STICKER_PACKS: StickerPack[] = packs;

export function stickerUrl(sticker: string): string {
  return `${import.meta.env.BASE_URL}stickers/${sticker}.svg`;
}

export function recolorSvg(svg: string, kleur: string, px = 512): string {
  return svg
    .replace(/currentColor/g, kleur)
    .replace(/<svg\b([^>]*)>/, (_m, attrs: string) => {
      const zonderMaat = attrs.replace(/\s(width|height)="[^"]*"/g, '');
      return `<svg${zonderMaat} width="${px}" height="${px}">`;
    });
}
```

`src/ui/icons.ts`:
```ts
const files = import.meta.glob('../assets/icons/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const map: Record<string, string> = {};
for (const [path, svg] of Object.entries(files)) {
  map[path.split('/').pop()!.replace('.svg', '')] = svg;
}

export const ICON_NAMES = Object.keys(map);

export function iconSvg(name: string): string | undefined {
  return map[name];
}
```

`src/ui/Icon.svelte`:
```svelte
<script lang="ts">
  import { iconSvg } from './icons';
  let { name, size = 28 }: { name: string; size?: number } = $props();
</script>

<span class="icoon" style:width="{size}px" style:height="{size}px" aria-hidden="true">{@html iconSvg(name) ?? ''}</span>

<style>
  .icoon { display: inline-flex; flex: none; }
  .icoon :global(svg) { width: 100%; height: 100%; }
</style>
```

- [ ] **Step 7: Run tests — moeten slagen**

Run: `npx vitest run src/assets/stickers.test.ts src/ui/icons.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: copy Phosphor icons and sticker packs, add Icon component"
```

---

### Task 3: Datamodel en fabrieksfuncties

**Files:**
- Create: `src/document/types.ts`, `src/document/formats.ts`, `src/document/create.ts`, `src/document/create.test.ts`

**Interfaces:**
- Produces (exacte namen, door alle volgende taken gebruikt):
  - Types: `Formaat`, `Pad`, `Masker`, `KaderStijl`, `FilterNaam`, `Patroon`, `Achtergrond`, `Basis`, `Uitsnede`, `FotoElement`, `Omlijning`, `WordArtVorm`, `WordArt`, `TekstElement`, `StickerElement`, `VormElement`, `TekenGereedschap`, `TekeningElement`, `Element`, `ElementType`, `Collage`, `SCHEMA_VERSIE`
  - `FORMATEN: Record<Formaat, { naam: string; breedte: number; hoogte: number }>`
  - `nieuwId(): string`
  - `nieuweCollage(formaat: Formaat, naam?: string): Collage`
  - `maakFoto(p: { x: number; y: number; breedte: number; hoogte: number; assetId: string | null }): FotoElement`
  - `maakTekst(p: { x: number; y: number; tekst: string; breedte?: number; grootte?: number; lettertype?: string; kleur?: string; uitlijning?: TekstElement['uitlijning']; ballon?: string | null }): TekstElement`
  - `maakSticker(p: { x: number; y: number; sticker: string; kleur: string; grootte: number }): StickerElement`
  - `maakVorm(p: { x: number; y: number; vorm: VormElement['vorm']; breedte: number; hoogte: number; vulling?: string | null }): VormElement`

Afspraak: `x` en `y` zijn het **middelpunt** van een element in canvascoördinaten. Spiegelen gebeurt via `gespiegeld`, niet via een negatieve schaal.

- [ ] **Step 1: Failing test schrijven**

`src/document/create.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { FORMATEN } from './formats';
import { maakFoto, maakSticker, maakTekst, maakVorm, nieuweCollage } from './create';
import { SCHEMA_VERSIE } from './types';

describe('nieuweCollage', () => {
  it('maakt een lege collage met witte achtergrond en huidige schemaversie', () => {
    const c = nieuweCollage('a4-liggend');
    expect(c.versie).toBe(SCHEMA_VERSIE);
    expect(c.formaat).toBe('a4-liggend');
    expect(c.elementen).toEqual([]);
    expect(c.achtergrond).toEqual({ soort: 'kleur', kleur: '#FFFFFF' });
    expect(c.naam).toBe('Mijn collage');
    expect(c.profielId).toBeNull();
    expect(c.gewijzigd).toBeGreaterThan(0);
  });

  it('geeft elke collage een uniek id', () => {
    expect(nieuweCollage('vierkant').id).not.toBe(nieuweCollage('vierkant').id);
  });
});

describe('formaten', () => {
  it('A4 heeft de juiste verhouding en oriëntatie', () => {
    const l = FORMATEN['a4-liggend'];
    const s = FORMATEN['a4-staand'];
    expect(l.breedte).toBeGreaterThan(l.hoogte);
    expect(s.hoogte).toBeGreaterThan(s.breedte);
    expect(l.breedte / l.hoogte).toBeCloseTo(297 / 210, 2);
  });
});

describe('elementfabrieken', () => {
  it('maakFoto vult standaardwaarden', () => {
    const f = maakFoto({ x: 10, y: 20, breedte: 300, hoogte: 200, assetId: null });
    expect(f).toMatchObject({ type: 'foto', x: 10, y: 20, breedte: 300, hoogte: 200, assetId: null, uitsnede: null, masker: 'rechthoek', kader: { stijl: 'geen', kleur: '#FFFFFF' }, filter: 'normaal', helderheid: 0, contrast: 0, rotatie: 0, schaalX: 1, schaalY: 1, gespiegeld: false, vergrendeld: false });
  });

  it('maakTekst gebruikt kindvriendelijke standaarden', () => {
    const t = maakTekst({ x: 0, y: 0, tekst: 'Hallo' });
    expect(t).toMatchObject({ type: 'tekst', tekst: 'Hallo', lettertype: 'nunito', grootte: 72, kleur: '#2D2A32', vet: false, schuin: false, uitlijning: 'center', regelafstand: 1.1, omlijning: null, schaduw: false, ballon: null, wordart: null, breedte: 400 });
  });

  it('maakSticker is vierkant', () => {
    const s = maakSticker({ x: 0, y: 0, sticker: 'dieren/cat', kleur: '#FF6B6B', grootte: 200 });
    expect(s).toMatchObject({ type: 'sticker', breedte: 200, hoogte: 200, sticker: 'dieren/cat', kleur: '#FF6B6B' });
  });

  it('maakVorm lijn gebruikt rand in plaats van vulling', () => {
    const l = maakVorm({ x: 0, y: 0, vorm: 'lijn', breedte: 400, hoogte: 40, vulling: '#FF6B6B' });
    expect(l.vulling).toBeNull();
    expect(l.rand).toBe('#FF6B6B');
    const h = maakVorm({ x: 0, y: 0, vorm: 'hart', breedte: 300, hoogte: 300 });
    expect(h.vulling).toBe('#FF6B6B');
    expect(h.rand).toBeNull();
    expect(h.doorzichtigheid).toBe(1);
  });
});
```

- [ ] **Step 2: Run test — moet falen**

Run: `npx vitest run src/document`
Expected: FAIL — `Failed to resolve import "./formats"`.

- [ ] **Step 3: Implementatie**

`src/document/types.ts`:
```ts
export const SCHEMA_VERSIE = 1;

export type Formaat = 'vierkant' | 'a4-liggend' | 'a4-staand' | 'poster';
export type Pad = 'rechthoek' | 'rond' | 'hart' | 'ster' | 'wolk' | 'blob' | 'driehoek' | 'pijl';
export type Masker = 'rechthoek' | 'rond' | 'hart' | 'ster' | 'wolk' | 'blob';
export type KaderStijl = 'geen' | 'effen' | 'polaroid' | 'plakband' | 'gescheurd' | 'stippen' | 'film' | 'goud' | 'krijt' | 'dubbel' | 'schaduw' | 'golf' | 'sterren';
export type FilterNaam = 'normaal' | 'zwartwit' | 'sepia' | 'warm' | 'koel' | 'vrolijk' | 'vervaagd' | 'pixel' | 'strip' | 'negatief';
export type Patroon = 'stippen' | 'strepen' | 'ruitjes' | 'sterren' | 'papier' | 'karton';

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
  kader: { stijl: KaderStijl; kleur: string };
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

export interface StickerElement extends Basis { type: 'sticker'; sticker: string; kleur: string }

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
```

`src/document/formats.ts`:
```ts
import type { Formaat } from './types';

export const FORMATEN: Record<Formaat, { naam: string; breedte: number; hoogte: number }> = {
  vierkant: { naam: 'Vierkant', breedte: 1200, hoogte: 1200 },
  'a4-liggend': { naam: 'Liggend', breedte: 1754, hoogte: 1240 },
  'a4-staand': { naam: 'Staand', breedte: 1240, hoogte: 1754 },
  poster: { naam: 'Poster', breedte: 1200, hoogte: 1800 },
};
```

`src/document/create.ts`:
```ts
import { SCHEMA_VERSIE, type Basis, type Collage, type Formaat, type FotoElement, type StickerElement, type TekstElement, type VormElement } from './types';

export const nieuwId = (): string => crypto.randomUUID();

export function nieuweCollage(formaat: Formaat, naam = 'Mijn collage'): Collage {
  const nu = Date.now();
  return { id: nieuwId(), versie: SCHEMA_VERSIE, naam, profielId: null, formaat, achtergrond: { soort: 'kleur', kleur: '#FFFFFF' }, elementen: [], aangemaakt: nu, gewijzigd: nu };
}

function basis(x: number, y: number, breedte: number, hoogte: number): Basis {
  return { id: nieuwId(), x, y, breedte, hoogte, rotatie: 0, schaalX: 1, schaalY: 1, gespiegeld: false, vergrendeld: false };
}

export function maakFoto(p: { x: number; y: number; breedte: number; hoogte: number; assetId: string | null }): FotoElement {
  return { ...basis(p.x, p.y, p.breedte, p.hoogte), type: 'foto', assetId: p.assetId, uitsnede: null, masker: 'rechthoek', kader: { stijl: 'geen', kleur: '#FFFFFF' }, filter: 'normaal', helderheid: 0, contrast: 0 };
}

export function maakTekst(p: { x: number; y: number; tekst: string; breedte?: number; grootte?: number; lettertype?: string; kleur?: string; uitlijning?: TekstElement['uitlijning']; ballon?: string | null }): TekstElement {
  const grootte = p.grootte ?? 72;
  return {
    ...basis(p.x, p.y, p.breedte ?? 400, grootte * 1.2),
    type: 'tekst', tekst: p.tekst, lettertype: p.lettertype ?? 'nunito', grootte, kleur: p.kleur ?? '#2D2A32',
    vet: false, schuin: false, uitlijning: p.uitlijning ?? 'center', regelafstand: 1.1,
    omlijning: null, schaduw: false, ballon: p.ballon ?? null, wordart: null,
  };
}

export function maakSticker(p: { x: number; y: number; sticker: string; kleur: string; grootte: number }): StickerElement {
  return { ...basis(p.x, p.y, p.grootte, p.grootte), type: 'sticker', sticker: p.sticker, kleur: p.kleur };
}

export function maakVorm(p: { x: number; y: number; vorm: VormElement['vorm']; breedte: number; hoogte: number; vulling?: string | null }): VormElement {
  const kleur = p.vulling === undefined ? '#FF6B6B' : p.vulling;
  const lijn = p.vorm === 'lijn';
  return { ...basis(p.x, p.y, p.breedte, p.hoogte), type: 'vorm', vorm: p.vorm, vulling: lijn ? null : kleur, rand: lijn ? (kleur ?? '#2D2A32') : null, randDikte: lijn ? 12 : 8, doorzichtigheid: 1 };
}
```

- [ ] **Step 4: Run test — moet slagen**

Run: `npx vitest run src/document`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/document
git commit -m "feat: add collage document model and element factories"
```

---

### Task 4: Undo-geschiedenis en editor-store

**Files:**
- Create: `src/editor/history.ts`, `src/editor/store.ts`, `src/editor/history.test.ts`, `src/editor/store.test.ts`

**Interfaces:**
- Consumes: `Collage`, `Element`, `Achtergrond` (Task 3), `nieuwId` (Task 3)
- Produces:
  - `class History<T> { present: T; constructor(present: T, limit?: number); push(next: T): void; undo(): T; redo(): T; reset(present: T): void; readonly canUndo: boolean; readonly canRedo: boolean }`
  - `interface EditorState { collage: Collage; selectedId: string | null; canUndo: boolean; canRedo: boolean }`
  - `createEditor(initial: Collage): Editor` met methodes:
    `state: Readable<EditorState>`, `get(): EditorState`, `load(c: Collage)`, `add(el: Element)`, `update(id: string, patch: Partial<Element>)`, `remove(id: string)`, `duplicate(id: string)`, `move(id: string, richting: 'voor' | 'achter' | 'voorste' | 'achterste')`, `setAchtergrond(a: Achtergrond)`, `rename(naam: string)`, `select(id: string | null)`, `undo()`, `redo()`
  - `type Editor = ReturnType<typeof createEditor>`

- [ ] **Step 1: Failing tests schrijven**

`src/editor/history.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { History } from './history';

describe('History', () => {
  it('undo en redo wandelen door de toestanden', () => {
    const h = new History(1);
    h.push(2); h.push(3);
    expect(h.undo()).toBe(2);
    expect(h.undo()).toBe(1);
    expect(h.canUndo).toBe(false);
    expect(h.redo()).toBe(2);
    expect(h.canRedo).toBe(true);
  });

  it('een nieuwe push wist de redo-toekomst', () => {
    const h = new History('a');
    h.push('b'); h.undo(); h.push('c');
    expect(h.canRedo).toBe(false);
    expect(h.present).toBe('c');
  });

  it('bewaart maximaal limit stappen', () => {
    const h = new History(0, 50);
    for (let i = 1; i <= 60; i++) h.push(i);
    let n = 0;
    while (h.canUndo) { h.undo(); n++; }
    expect(n).toBe(50);
    expect(h.present).toBe(10);
  });

  it('negeert push van dezelfde referentie', () => {
    const o = { a: 1 };
    const h = new History(o);
    h.push(o);
    expect(h.canUndo).toBe(false);
  });

  it('undo zonder geschiedenis laat present ongemoeid', () => {
    const h = new History(5);
    expect(h.undo()).toBe(5);
  });
});
```

`src/editor/store.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { createEditor } from './store';
import { maakVorm, nieuweCollage } from '../document/create';

const vorm = (x = 100) => maakVorm({ x, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });

describe('editor-store', () => {
  it('add voegt toe en selecteert', () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    const v = vorm();
    ed.add(v);
    const s = get(ed.state);
    expect(s.collage.elementen).toHaveLength(1);
    expect(s.selectedId).toBe(v.id);
    expect(s.canUndo).toBe(true);
  });

  it('update is onveranderlijk en zet gewijzigd', () => {
    const c = nieuweCollage('vierkant');
    const ed = createEditor(c);
    const v = vorm();
    ed.add(v);
    const voor = ed.get().collage;
    ed.update(v.id, { x: 500 });
    const na = ed.get().collage;
    expect(na).not.toBe(voor);
    expect(na.elementen[0].x).toBe(500);
    expect(voor.elementen[0].x).toBe(100);
    expect(na.gewijzigd).toBeGreaterThanOrEqual(voor.gewijzigd);
  });

  it('remove wist selectie, undo brengt element terug', () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    const v = vorm();
    ed.add(v);
    ed.remove(v.id);
    expect(ed.get().selectedId).toBeNull();
    expect(ed.get().collage.elementen).toHaveLength(0);
    ed.undo();
    expect(ed.get().collage.elementen[0].id).toBe(v.id);
  });

  it('undo van add wist de selectie van het verdwenen element', () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    ed.add(vorm());
    ed.undo();
    expect(ed.get().selectedId).toBeNull();
  });

  it('duplicate maakt een kopie met nieuw id, iets verschoven, en selecteert die', () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    const v = vorm();
    ed.add(v);
    ed.duplicate(v.id);
    const [a, b] = ed.get().collage.elementen;
    expect(b.id).not.toBe(a.id);
    expect(b.x).toBe(a.x + 30);
    expect(b.y).toBe(a.y + 30);
    expect(ed.get().selectedId).toBe(b.id);
  });

  it('move verandert de laagvolgorde', () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    const a = vorm(1), b = vorm(2), c = vorm(3);
    ed.add(a); ed.add(b); ed.add(c);
    ed.move(a.id, 'voor');
    expect(ed.get().collage.elementen.map((e) => e.id)).toEqual([b.id, a.id, c.id]);
    ed.move(a.id, 'voorste');
    expect(ed.get().collage.elementen.map((e) => e.id)).toEqual([b.id, c.id, a.id]);
    ed.move(a.id, 'achterste');
    expect(ed.get().collage.elementen.map((e) => e.id)).toEqual([a.id, b.id, c.id]);
    ed.move(a.id, 'achter');
    expect(ed.get().collage.elementen.map((e) => e.id)).toEqual([a.id, b.id, c.id]);
  });

  it('setAchtergrond en rename zijn ongedaan te maken', () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    ed.setAchtergrond({ soort: 'kleur', kleur: '#000000' });
    ed.rename('Vakantie');
    expect(ed.get().collage.naam).toBe('Vakantie');
    ed.undo(); ed.undo();
    expect(ed.get().collage.achtergrond).toEqual({ soort: 'kleur', kleur: '#FFFFFF' });
  });

  it('load vervangt de collage en wist de geschiedenis', () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    ed.add(vorm());
    ed.load(nieuweCollage('poster'));
    expect(ed.get().collage.formaat).toBe('poster');
    expect(ed.get().canUndo).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — moeten falen**

Run: `npx vitest run src/editor`
Expected: FAIL — `Failed to resolve import "./history"`.

- [ ] **Step 3: Implementatie**

`src/editor/history.ts`:
```ts
export class History<T> {
  private past: T[] = [];
  private future: T[] = [];

  constructor(public present: T, private limit = 50) {}

  push(next: T): void {
    if (next === this.present) return;
    this.past.push(this.present);
    if (this.past.length > this.limit) this.past.shift();
    this.present = next;
    this.future = [];
  }

  undo(): T {
    const prev = this.past.pop();
    if (prev === undefined) return this.present;
    this.future.push(this.present);
    this.present = prev;
    return prev;
  }

  redo(): T {
    const next = this.future.pop();
    if (next === undefined) return this.present;
    this.past.push(this.present);
    this.present = next;
    return next;
  }

  reset(present: T): void {
    this.past = [];
    this.future = [];
    this.present = present;
  }

  get canUndo(): boolean { return this.past.length > 0; }
  get canRedo(): boolean { return this.future.length > 0; }
}
```

`src/editor/store.ts`:
```ts
import { writable, type Readable } from 'svelte/store';
import type { Achtergrond, Collage, Element } from '../document/types';
import { nieuwId } from '../document/create';
import { History } from './history';

export interface EditorState { collage: Collage; selectedId: string | null; canUndo: boolean; canRedo: boolean }

export type Richting = 'voor' | 'achter' | 'voorste' | 'achterste';

export function createEditor(initial: Collage) {
  const history = new History<Collage>(initial);
  let selectedId: string | null = null;

  const snapshot = (): EditorState => ({ collage: history.present, selectedId, canUndo: history.canUndo, canRedo: history.canRedo });
  const store = writable<EditorState>(snapshot());

  function emit(): void {
    if (selectedId && !history.present.elementen.some((e) => e.id === selectedId)) selectedId = null;
    store.set(snapshot());
  }

  function commit(patch: Partial<Collage>): void {
    history.push({ ...history.present, ...patch, gewijzigd: Date.now() });
    emit();
  }

  const els = () => history.present.elementen;

  function add(el: Element): void {
    selectedId = el.id;
    commit({ elementen: [...els(), el] });
  }

  return {
    state: { subscribe: store.subscribe } as Readable<EditorState>,
    get: snapshot,
    load(c: Collage): void { history.reset(c); selectedId = null; emit(); },
    add,
    update(id: string, patch: Partial<Element>): void {
      commit({ elementen: els().map((e) => (e.id === id ? ({ ...e, ...patch } as Element) : e)) });
    },
    remove(id: string): void { commit({ elementen: els().filter((e) => e.id !== id) }); },
    duplicate(id: string): void {
      const e = els().find((x) => x.id === id);
      if (!e) return;
      add({ ...structuredClone(e), id: nieuwId(), x: e.x + 30, y: e.y + 30 });
    },
    move(id: string, richting: Richting): void {
      const lijst = [...els()];
      const i = lijst.findIndex((e) => e.id === id);
      if (i < 0) return;
      const [el] = lijst.splice(i, 1);
      const doel = richting === 'voor' ? Math.min(i + 1, lijst.length) : richting === 'achter' ? Math.max(i - 1, 0) : richting === 'voorste' ? lijst.length : 0;
      lijst.splice(doel, 0, el);
      if (lijst.every((e, k) => e === els()[k])) return;
      commit({ elementen: lijst });
    },
    setAchtergrond(a: Achtergrond): void { commit({ achtergrond: a }); },
    rename(naam: string): void { commit({ naam }); },
    select(id: string | null): void { selectedId = id; emit(); },
    undo(): void { history.undo(); emit(); },
    redo(): void { history.redo(); emit(); },
  };
}

export type Editor = ReturnType<typeof createEditor>;
```

- [ ] **Step 4: Run tests — moeten slagen**

Run: `npx vitest run src/editor`
Expected: PASS (13 tests).

- [ ] **Step 5: Commit**

```bash
git add src/editor
git commit -m "feat: add undo history and immutable editor store"
```

---

### Task 5: Vormpaden, AssetStore en renderers voor vorm en sticker

**Files:**
- Create: `src/elements/paths.ts`, `src/elements/base.ts`, `src/elements/vorm.ts`, `src/elements/sticker.ts`, `src/elements/index.ts`, `src/assets/store.ts`, `src/elements/paths.test.ts`, `src/elements/render.test.ts`, `src/assets/store.test.ts`

**Interfaces:**
- Consumes: types (Task 3), `stickerUrl`, `recolorSvg` (Task 2)
- Produces:
  - `interface PathCtx { beginPath(): void; moveTo(x: number, y: number): void; lineTo(x: number, y: number): void; bezierCurveTo(a: number, b: number, c: number, d: number, x: number, y: number): void; ellipse(x: number, y: number, rx: number, ry: number, rot: number, start: number, end: number): void; closePath(): void }`
  - `tracePad(ctx: PathCtx, pad: Pad, w: number, h: number): void`
  - `interface RenderCtx { image(key: string): CanvasImageSource | undefined }`
  - `baseGroup(b: Basis): Konva.Group` — `id = b.id`, `name = 'element'`, middelpunt-oorsprong via offset, spiegelen via negatieve `scaleX`, `draggable = !vergrendeld`
  - `renderVorm(el: VormElement): Konva.Group`, `renderSticker(el: StickerElement, ctx: RenderCtx): Konva.Group`
  - `renderElement(el: Element, ctx: RenderCtx): Konva.Group` in `src/elements/index.ts`
  - `stickerKey(sticker: string, kleur: string): string`
  - `loadImage(src: string): Promise<HTMLImageElement>`
  - `class AssetStore implements RenderCtx { image(key); blob(id): Blob | undefined; addBlob(blob: Blob, id?: string): Promise<string>; ensureSticker(sticker: string, kleur: string): Promise<string>; preload(c: Collage): Promise<void> }`

In deze taak verwerkt `renderElement` alleen `vorm` en `sticker`. Voor andere types gooit het `Error('Geen renderer voor <type>')`. Latere taken voegen hun renderer toe aan de `RENDERERS`-tabel.

- [ ] **Step 1: Failing tests schrijven**

`src/elements/paths.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { tracePad, type PathCtx } from './paths';
import type { Pad } from '../document/types';

const PADEN: Pad[] = ['rechthoek', 'rond', 'hart', 'ster', 'wolk', 'blob', 'driehoek', 'pijl'];

function ctx() {
  const c = new OffscreenCanvas(100, 100).getContext('2d')!;
  return c;
}

describe('tracePad', () => {
  it.each(PADEN)('%s bevat het middelpunt', (pad) => {
    const c = ctx();
    tracePad(c as unknown as PathCtx, pad, 100, 100);
    expect(c.isPointInPath(50, 55)).toBe(true);
  });

  it.each(PADEN.filter((p) => p !== 'rechthoek'))('%s bevat de hoek linksboven niet', (pad) => {
    const c = ctx();
    tracePad(c as unknown as PathCtx, pad, 100, 100);
    expect(c.isPointInPath(2, 2)).toBe(false);
  });

  it('schaalt mee met breedte en hoogte', () => {
    const c = new OffscreenCanvas(400, 100).getContext('2d')!;
    tracePad(c as unknown as PathCtx, 'rond', 400, 100);
    expect(c.isPointInPath(390, 50)).toBe(true);
    expect(c.isPointInPath(200, 98)).toBe(true);
    expect(c.isPointInPath(390, 95)).toBe(false);
  });
});
```

`src/elements/render.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import Konva from 'konva';
import { renderElement } from './index';
import { maakFoto, maakSticker, maakVorm } from '../document/create';
import { stickerKey } from '../assets/store';

const leeg = { image: () => undefined };

describe('renderElement', () => {
  it('vorm: groep met id, naam, middelpunt-oorsprong en rotatie', () => {
    const v = { ...maakVorm({ x: 300, y: 200, vorm: 'hart', breedte: 100, hoogte: 80 }), rotatie: 30 };
    const g = renderElement(v, leeg);
    expect(g.id()).toBe(v.id);
    expect(g.name()).toBe('element');
    expect(g.x()).toBe(300);
    expect(g.offsetX()).toBe(50);
    expect(g.offsetY()).toBe(40);
    expect(g.rotation()).toBe(30);
    expect(g.draggable()).toBe(true);
    expect(g.getChildren()[0]).toBeInstanceOf(Konva.Shape);
  });

  it('gespiegeld geeft negatieve scaleX, vergrendeld is niet versleepbaar', () => {
    const v = { ...maakVorm({ x: 0, y: 0, vorm: 'ster', breedte: 10, hoogte: 10 }), gespiegeld: true, schaalX: 2, vergrendeld: true };
    const g = renderElement(v, leeg);
    expect(g.scaleX()).toBe(-2);
    expect(g.draggable()).toBe(false);
  });

  it('lijn wordt een Konva.Line met brede raakzone', () => {
    const l = maakVorm({ x: 0, y: 0, vorm: 'lijn', breedte: 400, hoogte: 40 });
    const line = renderElement(l, leeg).getChildren()[0] as Konva.Line;
    expect(line).toBeInstanceOf(Konva.Line);
    expect(line.hitStrokeWidth()).toBeGreaterThanOrEqual(40);
  });

  it('sticker gebruikt de geladen afbeelding uit de context', () => {
    const s = maakSticker({ x: 0, y: 0, sticker: 'dieren/cat', kleur: '#FF0000', grootte: 200 });
    const img = new Image();
    const ctx = { image: (k: string) => (k === stickerKey('dieren/cat', '#FF0000') ? img : undefined) };
    const kind = renderElement(s, ctx).getChildren()[0] as Konva.Image;
    expect(kind).toBeInstanceOf(Konva.Image);
    expect(kind.image()).toBe(img);
    expect(kind.width()).toBe(200);
  });

  it('onbekend type geeft een duidelijke fout (tot de renderer bestaat)', () => {
    const f = maakFoto({ x: 0, y: 0, breedte: 10, hoogte: 10, assetId: null });
    expect(() => renderElement({ ...f, type: 'onbekend' } as never, leeg)).toThrow('Geen renderer voor onbekend');
  });
});
```

`src/assets/store.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { AssetStore, stickerKey } from './store';
import { maakSticker, nieuweCollage } from '../document/create';

async function pngBlob(w: number, h: number): Promise<Blob> {
  const c = new OffscreenCanvas(w, h);
  c.getContext('2d')!.fillRect(0, 0, w, h);
  return c.convertToBlob({ type: 'image/png' });
}

describe('AssetStore', () => {
  it('addBlob bewaart blob en geladen afbeelding onder hetzelfde id', async () => {
    const s = new AssetStore();
    const id = await s.addBlob(await pngBlob(30, 20));
    const img = s.image(id) as HTMLImageElement;
    expect(img.naturalWidth).toBe(30);
    expect(s.blob(id)?.type).toBe('image/png');
  });

  it('ensureSticker laadt een ingekleurde sticker één keer', async () => {
    const s = new AssetStore();
    const k1 = await s.ensureSticker('dieren/cat', '#FF6B6B');
    const k2 = await s.ensureSticker('dieren/cat', '#FF6B6B');
    expect(k1).toBe(stickerKey('dieren/cat', '#FF6B6B'));
    expect(k2).toBe(k1);
    expect((s.image(k1) as HTMLImageElement).naturalWidth).toBe(512);
  });

  it('preload laadt alle stickers van een collage', async () => {
    const s = new AssetStore();
    const c = { ...nieuweCollage('vierkant'), elementen: [maakSticker({ x: 0, y: 0, sticker: 'ruimte/rocket', kleur: '#5AA9F2', grootte: 100 })] };
    await s.preload(c);
    expect(s.image(stickerKey('ruimte/rocket', '#5AA9F2'))).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests — moeten falen**

Run: `npx vitest run src/elements src/assets/store.test.ts`
Expected: FAIL — `Failed to resolve import "./paths"`.

- [ ] **Step 3: Implementatie**

`src/elements/paths.ts`:
```ts
import type { Pad } from '../document/types';

export interface PathCtx {
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  bezierCurveTo(a: number, b: number, c: number, d: number, x: number, y: number): void;
  ellipse(x: number, y: number, rx: number, ry: number, rot: number, start: number, end: number): void;
  closePath(): void;
}

type Cmd = ['M', number, number] | ['L', number, number] | ['C', number, number, number, number, number, number] | ['E'] | ['Z'];

function ster(): Cmd[] {
  const c: Cmd[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.5 : 0.21;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    c.push([i === 0 ? 'M' : 'L', 0.5 + r * Math.cos(a), 0.53 + r * Math.sin(a)]);
  }
  c.push(['Z']);
  return c;
}

const PADEN: Record<Pad, Cmd[]> = {
  rechthoek: [['M', 0, 0], ['L', 1, 0], ['L', 1, 1], ['L', 0, 1], ['Z']],
  rond: [['E']],
  hart: [
    ['M', 0.5, 0.92], ['C', 0.18, 0.7, 0, 0.5, 0, 0.3], ['C', 0, 0.12, 0.14, 0.02, 0.28, 0.02],
    ['C', 0.39, 0.02, 0.47, 0.09, 0.5, 0.18], ['C', 0.53, 0.09, 0.61, 0.02, 0.72, 0.02],
    ['C', 0.86, 0.02, 1, 0.12, 1, 0.3], ['C', 1, 0.5, 0.82, 0.7, 0.5, 0.92], ['Z'],
  ],
  ster: ster(),
  wolk: [
    ['M', 0.2, 0.85], ['C', 0.05, 0.85, 0, 0.65, 0.12, 0.55], ['C', 0.05, 0.35, 0.25, 0.22, 0.38, 0.3],
    ['C', 0.42, 0.12, 0.68, 0.08, 0.72, 0.28], ['C', 0.9, 0.22, 1.02, 0.42, 0.9, 0.55],
    ['C', 1.02, 0.65, 0.95, 0.85, 0.8, 0.85], ['Z'],
  ],
  blob: [
    ['M', 0.5, 0.03], ['C', 0.8, 0, 1, 0.25, 0.97, 0.52], ['C', 0.94, 0.82, 0.7, 1, 0.45, 0.97],
    ['C', 0.18, 0.94, 0, 0.75, 0.03, 0.48], ['C', 0.06, 0.2, 0.25, 0.05, 0.5, 0.03], ['Z'],
  ],
  driehoek: [['M', 0.5, 0], ['L', 1, 1], ['L', 0, 1], ['Z']],
  pijl: [['M', 0, 0.35], ['L', 0.6, 0.35], ['L', 0.6, 0.1], ['L', 1, 0.5], ['L', 0.6, 0.9], ['L', 0.6, 0.65], ['L', 0, 0.65], ['Z']],
};

export function tracePad(ctx: PathCtx, pad: Pad, w: number, h: number): void {
  ctx.beginPath();
  for (const c of PADEN[pad]) {
    switch (c[0]) {
      case 'M': ctx.moveTo(c[1] * w, c[2] * h); break;
      case 'L': ctx.lineTo(c[1] * w, c[2] * h); break;
      case 'C': ctx.bezierCurveTo(c[1] * w, c[2] * h, c[3] * w, c[4] * h, c[5] * w, c[6] * h); break;
      case 'E': ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); break;
      case 'Z': ctx.closePath(); break;
    }
  }
}
```

`src/elements/base.ts`:
```ts
import Konva from 'konva';
import type { Basis } from '../document/types';

export interface RenderCtx { image(key: string): CanvasImageSource | undefined }

export function baseGroup(b: Basis): Konva.Group {
  return new Konva.Group({
    id: b.id,
    name: 'element',
    x: b.x,
    y: b.y,
    offsetX: b.breedte / 2,
    offsetY: b.hoogte / 2,
    rotation: b.rotatie,
    scaleX: b.schaalX * (b.gespiegeld ? -1 : 1),
    scaleY: b.schaalY,
    draggable: !b.vergrendeld,
  });
}
```

`src/elements/vorm.ts`:
```ts
import Konva from 'konva';
import type { Pad, VormElement } from '../document/types';
import { baseGroup } from './base';
import { tracePad, type PathCtx } from './paths';

export function renderVorm(el: VormElement): Konva.Group {
  const g = baseGroup(el);
  if (el.vorm === 'lijn') {
    g.add(new Konva.Line({
      points: [0, el.hoogte / 2, el.breedte, el.hoogte / 2],
      stroke: el.rand ?? el.vulling ?? '#2D2A32',
      strokeWidth: el.randDikte,
      lineCap: 'round',
      hitStrokeWidth: Math.max(el.randDikte, 44),
      opacity: el.doorzichtigheid,
    }));
    return g;
  }
  const pad = el.vorm as Pad;
  g.add(new Konva.Shape({
    width: el.breedte,
    height: el.hoogte,
    fill: el.vulling ?? undefined,
    stroke: el.rand ?? undefined,
    strokeWidth: el.rand ? el.randDikte : 0,
    lineJoin: 'round',
    opacity: el.doorzichtigheid,
    sceneFunc(ctx, shape) {
      tracePad(ctx as unknown as PathCtx, pad, el.breedte, el.hoogte);
      ctx.fillStrokeShape(shape);
    },
  }));
  return g;
}
```

`src/elements/sticker.ts`:
```ts
import Konva from 'konva';
import type { StickerElement } from '../document/types';
import { stickerKey } from '../assets/store';
import { baseGroup, type RenderCtx } from './base';

export function renderSticker(el: StickerElement, ctx: RenderCtx): Konva.Group {
  const g = baseGroup(el);
  const img = ctx.image(stickerKey(el.sticker, el.kleur));
  g.add(img
    ? new Konva.Image({ image: img, width: el.breedte, height: el.hoogte })
    : new Konva.Rect({ width: el.breedte, height: el.hoogte, fill: '#EDE3D3', cornerRadius: 16 }));
  return g;
}
```

`src/elements/index.ts`:
```ts
import type Konva from 'konva';
import type { Element } from '../document/types';
import type { RenderCtx } from './base';
import { renderVorm } from './vorm';
import { renderSticker } from './sticker';

type Renderer = (el: never, ctx: RenderCtx) => Konva.Group;

const RENDERERS: Partial<Record<Element['type'], Renderer>> = {
  vorm: renderVorm as Renderer,
  sticker: renderSticker as Renderer,
};

export function renderElement(el: Element, ctx: RenderCtx): Konva.Group {
  const fn = RENDERERS[el.type];
  if (!fn) throw new Error(`Geen renderer voor ${el.type}`);
  return fn(el as never, ctx);
}

export type { RenderCtx };
```

`src/assets/store.ts`:
```ts
import type { Collage, StickerElement } from '../document/types';
import { nieuwId } from '../document/create';
import { recolorSvg, stickerUrl } from './stickers';
import type { RenderCtx } from '../elements/base';

export const stickerKey = (sticker: string, kleur: string): string => `sticker:${sticker}:${kleur}`;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Afbeelding laden mislukt'));
    img.src = src;
  });
}

export class AssetStore implements RenderCtx {
  private images = new Map<string, HTMLImageElement>();
  private blobs = new Map<string, Blob>();
  private svgCache = new Map<string, Promise<string>>();

  image(key: string): HTMLImageElement | undefined { return this.images.get(key); }
  blob(id: string): Blob | undefined { return this.blobs.get(id); }

  async addBlob(blob: Blob, id: string = nieuwId()): Promise<string> {
    const img = await loadImage(URL.createObjectURL(blob));
    this.blobs.set(id, blob);
    this.images.set(id, img);
    return id;
  }

  async ensureSticker(sticker: string, kleur: string): Promise<string> {
    const key = stickerKey(sticker, kleur);
    if (this.images.has(key)) return key;
    let svg = this.svgCache.get(sticker);
    if (!svg) {
      svg = fetch(stickerUrl(sticker)).then((r) => {
        if (!r.ok) throw new Error(`Sticker ${sticker} niet gevonden`);
        return r.text();
      });
      this.svgCache.set(sticker, svg);
    }
    const url = URL.createObjectURL(new Blob([recolorSvg(await svg, kleur)], { type: 'image/svg+xml' }));
    this.images.set(key, await loadImage(url));
    return key;
  }

  async preload(c: Collage): Promise<void> {
    const stickers = c.elementen.filter((e): e is StickerElement => e.type === 'sticker');
    await Promise.all(stickers.map((s) => this.ensureSticker(s.sticker, s.kleur)));
  }
}
```

- [ ] **Step 4: Run tests — moeten slagen**

Run: `npx vitest run src/elements src/assets`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/elements src/assets
git commit -m "feat: add shape paths, asset store and shape/sticker renderers"
```

---

### Task 6: CanvasController — stage, synchronisatie, selectie en transformeren

**Files:**
- Create: `src/elements/achtergrond.ts`, `src/editor/canvas.ts`, `src/editor/canvas.test.ts`

**Interfaces:**
- Consumes: `Editor`, `EditorState` (Task 4), `renderElement`, `RenderCtx` (Task 5), `FORMATEN` (Task 3)
- Produces:
  - `renderAchtergrond(a: Achtergrond, breedte: number, hoogte: number, ctx: RenderCtx): Konva.Shape` (in deze taak: `kleur` en `verloop`; `patroon` en `foto` geven een witte rechthoek tot Task 17)
  - `interface ControllerOpties { onVakTik?(id: string): void }`
  - `class CanvasController` met:
    - `constructor(container: HTMLDivElement, editor: Editor, assets: RenderCtx, opties?: ControllerOpties)`
    - `readonly stage: Konva.Stage`
    - `fit(): void`
    - `naarCanvas(clientX: number, clientY: number): { x: number; y: number }`
    - `naarScherm(x: number, y: number): { x: number; y: number }`
    - `group(id: string): Konva.Group | undefined`
    - `destroy(): void`
  - Konva-lagen: `content` (achtergrond + elementen, geknipt op het canvas) en `ui` (transformer, hulplijnen).
  - Commit-regel: alleen `dragend` en `transformend` schrijven naar de store.

- [ ] **Step 1: Failing test schrijven**

`src/editor/canvas.test.ts`:
```ts
import { describe, it, expect, afterEach } from 'vitest';
import Konva from 'konva';
import { CanvasController } from './canvas';
import { createEditor } from './store';
import { maakVorm, nieuweCollage } from '../document/create';

const leeg = { image: () => undefined };
let ctrl: CanvasController | null = null;
let div: HTMLDivElement | null = null;

function opzet(w = 800, h = 600) {
  div = document.createElement('div');
  div.style.cssText = `width:${w}px;height:${h}px;position:fixed;left:0;top:0`;
  document.body.append(div);
  const editor = createEditor(nieuweCollage('vierkant'));
  ctrl = new CanvasController(div, editor, leeg);
  return { editor, ctrl };
}

afterEach(() => { ctrl?.destroy(); div?.remove(); ctrl = null; div = null; });

const transformer = (c: CanvasController) => c.stage.findOne('Transformer') as Konva.Transformer;

describe('CanvasController', () => {
  it('schaalt het canvas passend en gecentreerd', () => {
    const { ctrl } = opzet(800, 600);
    const s = ctrl.stage.scaleX();
    expect(s).toBeCloseTo((600 / 1200) * 0.94, 5);
    expect(ctrl.stage.x()).toBeCloseTo((800 - 1200 * s) / 2, 5);
  });

  it('voegt nodes toe, vervangt gewijzigde en verwijdert gewiste', () => {
    const { editor, ctrl } = opzet();
    const v = maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    editor.add(v);
    const eerst = ctrl.group(v.id)!;
    expect(eerst.x()).toBe(100);
    editor.update(v.id, { x: 400 });
    const daarna = ctrl.group(v.id)!;
    expect(daarna).not.toBe(eerst);
    expect(daarna.x()).toBe(400);
    editor.remove(v.id);
    expect(ctrl.group(v.id)).toBeUndefined();
    expect(ctrl.stage.find('.element')).toHaveLength(0);
  });

  it('houdt de laagvolgorde van het document aan, achtergrond onderaan', () => {
    const { editor, ctrl } = opzet();
    const a = maakVorm({ x: 1, y: 1, vorm: 'rond', breedte: 5, hoogte: 5 });
    const b = maakVorm({ x: 2, y: 2, vorm: 'rond', breedte: 5, hoogte: 5 });
    editor.add(a); editor.add(b);
    expect(ctrl.group(a.id)!.zIndex()).toBeLessThan(ctrl.group(b.id)!.zIndex());
    editor.move(a.id, 'voorste');
    expect(ctrl.group(a.id)!.zIndex()).toBeGreaterThan(ctrl.group(b.id)!.zIndex());
    expect(ctrl.stage.findOne('.achtergrond')!.zIndex()).toBe(0);
  });

  it('selectie toont de transformer, vergrendeld element niet', () => {
    const { editor, ctrl } = opzet();
    const v = maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    editor.add(v);
    expect(transformer(ctrl).nodes()[0]).toBe(ctrl.group(v.id));
    editor.update(v.id, { vergrendeld: true });
    expect(transformer(ctrl).nodes()).toHaveLength(0);
    editor.select(null);
    expect(transformer(ctrl).nodes()).toHaveLength(0);
  });

  it('dragend schrijft de nieuwe positie naar de store', () => {
    const { editor, ctrl } = opzet();
    const v = maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    editor.add(v);
    const g = ctrl.group(v.id)!;
    g.x(555);
    g.fire('dragend', { target: g }, true);
    expect(editor.get().collage.elementen[0].x).toBe(555);
  });

  it('transformend schrijft schaal en rotatie, ook bij gespiegeld element', () => {
    const { editor, ctrl } = opzet();
    const v = { ...maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 }), gespiegeld: true };
    editor.add(v);
    const g = ctrl.group(v.id)!;
    g.setAttrs({ scaleX: -2, scaleY: 2, rotation: 45 });
    transformer(ctrl).fire('transformend');
    const el = editor.get().collage.elementen[0];
    expect(el.schaalX).toBe(2);
    expect(el.schaalY).toBe(2);
    expect(el.rotatie).toBe(45);
    expect(el.gespiegeld).toBe(true);
  });

  it('naarCanvas en naarScherm zijn elkaars inverse', () => {
    const { ctrl } = opzet();
    const p = ctrl.naarScherm(600, 300);
    const q = ctrl.naarCanvas(p.x, p.y);
    expect(q.x).toBeCloseTo(600, 5);
    expect(q.y).toBeCloseTo(300, 5);
  });

  it('past zich aan bij een andere containergrootte (draaien van iPad)', async () => {
    const { ctrl } = opzet(800, 600);
    div!.style.width = '600px';
    div!.style.height = '800px';
    await new Promise((r) => setTimeout(r, 50));
    expect(ctrl.stage.width()).toBe(600);
    expect(ctrl.stage.scaleX()).toBeCloseTo((600 / 1200) * 0.94, 5);
  });

  it('formaatwissel via load past de clip aan', () => {
    const { editor, ctrl } = opzet();
    editor.load(nieuweCollage('poster'));
    const laag = ctrl.stage.getLayers()[0];
    expect(laag.clipHeight()).toBe(1800);
  });
});
```

- [ ] **Step 2: Run test — moet falen**

Run: `npx vitest run src/editor/canvas.test.ts`
Expected: FAIL — `Failed to resolve import "./canvas"`.

- [ ] **Step 3: Achtergrond-renderer (basis)**

`src/elements/achtergrond.ts`:
```ts
import Konva from 'konva';
import type { Achtergrond } from '../document/types';
import type { RenderCtx } from './base';

export function verloopPunten(hoek: number, b: number, h: number) {
  const r = (hoek * Math.PI) / 180;
  const half = Math.hypot(b, h) / 2;
  const dx = Math.cos(r) * half, dy = Math.sin(r) * half;
  return { start: { x: b / 2 - dx, y: h / 2 - dy }, eind: { x: b / 2 + dx, y: h / 2 + dy } };
}

export function renderAchtergrond(a: Achtergrond, breedte: number, hoogte: number, _ctx: RenderCtx): Konva.Shape {
  const basis = { x: 0, y: 0, width: breedte, height: hoogte, listening: false, name: 'achtergrond' };
  switch (a.soort) {
    case 'kleur':
      return new Konva.Rect({ ...basis, fill: a.kleur });
    case 'verloop': {
      const p = verloopPunten(a.hoek, breedte, hoogte);
      return new Konva.Rect({ ...basis, fillLinearGradientStartPoint: p.start, fillLinearGradientEndPoint: p.eind, fillLinearGradientColorStops: [0, a.van, 1, a.naar] });
    }
    default:
      return new Konva.Rect({ ...basis, fill: '#FFFFFF' });
  }
}
```

- [ ] **Step 4: CanvasController**

`src/editor/canvas.ts`:
```ts
import Konva from 'konva';
import type { Achtergrond, Element, Formaat } from '../document/types';
import { FORMATEN } from '../document/formats';
import { renderElement, type RenderCtx } from '../elements/index';
import { renderAchtergrond } from '../elements/achtergrond';
import type { Editor, EditorState } from './store';

export interface ControllerOpties { onVakTik?(id: string): void }

interface NodeInfo { el: Element; group: Konva.Group }

export class CanvasController {
  readonly stage: Konva.Stage;
  protected content = new Konva.Layer();
  protected ui = new Konva.Layer();
  protected transformer: Konva.Transformer;
  protected nodes = new Map<string, NodeInfo>();
  protected maat = { breedte: 1, hoogte: 1 };
  private achtergrond?: Konva.Shape;
  private laatsteAchtergrond?: Achtergrond;
  private formaat?: Formaat;
  private stopSync: () => void;
  private resizeObs: ResizeObserver;

  constructor(private container: HTMLDivElement, protected editor: Editor, protected assets: RenderCtx, protected opties: ControllerOpties = {}) {
    this.stage = new Konva.Stage({ container, width: container.clientWidth || 1, height: container.clientHeight || 1 });
    this.transformer = new Konva.Transformer({
      rotateEnabled: true,
      flipEnabled: false,
      keepRatio: true,
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      anchorSize: 28,
      anchorCornerRadius: 14,
      anchorStroke: '#5AA9F2',
      anchorStrokeWidth: 3,
      anchorFill: '#FFFFFF',
      borderStroke: '#5AA9F2',
      borderStrokeWidth: 3,
      rotateAnchorOffset: 48,
      padding: 6,
    });
    this.ui.add(this.transformer);
    this.stage.add(this.content, this.ui);
    this.bindEvents();
    this.stopSync = editor.state.subscribe((s) => this.sync(s));
    this.resizeObs = new ResizeObserver(() => this.fit());
    this.resizeObs.observe(container);
  }

  fit(): void {
    const w = this.container.clientWidth || 1, h = this.container.clientHeight || 1;
    this.stage.size({ width: w, height: h });
    const s = Math.min(w / this.maat.breedte, h / this.maat.hoogte) * 0.94;
    this.stage.scale({ x: s, y: s });
    this.stage.position({ x: (w - this.maat.breedte * s) / 2, y: (h - this.maat.hoogte * s) / 2 });
    this.stage.batchDraw();
  }

  naarCanvas(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.container.getBoundingClientRect();
    return { x: (clientX - r.left - this.stage.x()) / this.stage.scaleX(), y: (clientY - r.top - this.stage.y()) / this.stage.scaleY() };
  }

  naarScherm(x: number, y: number): { x: number; y: number } {
    const r = this.container.getBoundingClientRect();
    return { x: r.left + this.stage.x() + x * this.stage.scaleX(), y: r.top + this.stage.y() + y * this.stage.scaleY() };
  }

  group(id: string): Konva.Group | undefined { return this.nodes.get(id)?.group; }

  destroy(): void {
    this.stopSync();
    this.resizeObs.disconnect();
    this.stage.destroy();
  }

  protected sync(s: EditorState): void {
    const c = s.collage;
    if (c.formaat !== this.formaat) {
      this.formaat = c.formaat;
      this.maat = { breedte: FORMATEN[c.formaat].breedte, hoogte: FORMATEN[c.formaat].hoogte };
      this.content.clip({ x: 0, y: 0, width: this.maat.breedte, height: this.maat.hoogte });
      this.laatsteAchtergrond = undefined;
      this.fit();
    }
    if (c.achtergrond !== this.laatsteAchtergrond) {
      this.achtergrond?.destroy();
      this.achtergrond = renderAchtergrond(c.achtergrond, this.maat.breedte, this.maat.hoogte, this.assets);
      this.content.add(this.achtergrond);
      this.laatsteAchtergrond = c.achtergrond;
    }
    const gezien = new Set<string>();
    for (const el of c.elementen) {
      gezien.add(el.id);
      const huidig = this.nodes.get(el.id);
      if (huidig && huidig.el === el) continue;
      huidig?.group.destroy();
      const group = renderElement(el, this.assets);
      this.content.add(group);
      this.nodes.set(el.id, { el, group });
    }
    for (const [id, n] of this.nodes) {
      if (!gezien.has(id)) { n.group.destroy(); this.nodes.delete(id); }
    }
    this.achtergrond!.zIndex(0);
    c.elementen.forEach((el, i) => this.nodes.get(el.id)!.group.zIndex(i + 1));
    this.updateTransformer(s.selectedId);
    this.stage.batchDraw();
  }

  protected updateTransformer(selectedId: string | null): void {
    const sel = selectedId ? this.nodes.get(selectedId) : undefined;
    this.transformer.nodes(sel && !sel.el.vergrendeld ? [sel.group] : []);
    this.transformer.keepRatio(sel?.el.type !== 'vorm');
  }

  protected elementVan(target: Konva.Node): NodeInfo | undefined {
    const g = target.findAncestor('.element', true) as Konva.Group | null | undefined;
    return g ? this.nodes.get(g.id()) : undefined;
  }

  protected bindEvents(): void {
    this.stage.on('click tap', (e) => {
      if (e.target.getLayer() === this.ui) return;
      const n = this.elementVan(e.target);
      if (!n) { this.editor.select(null); return; }
      this.editor.select(n.el.id);
      if (n.el.type === 'foto' && !n.el.assetId) this.opties.onVakTik?.(n.el.id);
    });
    this.stage.on('contextmenu', (e) => {
      e.evt.preventDefault();
      const n = this.elementVan(e.target);
      if (n) this.editor.select(n.el.id);
    });
    this.content.on('dragstart', (e) => {
      if (e.target.name() === 'element') this.editor.select(e.target.id());
    });
    this.content.on('dragend', (e) => {
      const g = e.target;
      if (g.name() !== 'element') return;
      this.editor.update(g.id(), { x: g.x(), y: g.y() });
    });
    this.transformer.on('transformend', () => {
      const g = this.transformer.nodes()[0];
      if (!g) return;
      this.editor.update(g.id(), { x: g.x(), y: g.y(), rotatie: g.rotation(), schaalX: Math.abs(g.scaleX()), schaalY: g.scaleY() });
    });
  }
}
```

- [ ] **Step 5: Run test — moet slagen**

Run: `npx vitest run src/editor/canvas.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 6: Commit**

```bash
git add src/editor/canvas.ts src/editor/canvas.test.ts src/elements/achtergrond.ts
git commit -m "feat: add Konva canvas controller with selection and transform"
```

---

### Task 7: Uitlijnhulp, knijpgebaar en sneltoetsen

**Files:**
- Create: `src/editor/snap.ts`, `src/editor/pinch.ts`, `src/editor/toetsen.ts`, `src/editor/snap.test.ts`, `src/editor/pinch.test.ts`, `src/editor/toetsen.test.ts`
- Modify: `src/editor/canvas.ts` (dragmove-uitlijning, hulplijnen, knijpen), `src/editor/canvas.test.ts` (één gebaar = één undo-stap)

**Interfaces:**
- Produces:
  - `interface Box { x: number; y: number; width: number; height: number }`, `interface Gids { richting: 'v' | 'h'; pos: number }`
  - `snap(moving: Box, others: Box[], canvas: { breedte: number; hoogte: number }, drempel: number): { dx: number; dy: number; gidsen: Gids[] }`
  - `interface Punt { x: number; y: number }`, `pinchDelta(a1: Punt, a2: Punt, b1: Punt, b2: Punt): { schaal: number; rotatie: number; dx: number; dy: number }`
  - `type Actie = { soort: 'ongedaan' } | { soort: 'opnieuw' } | { soort: 'wissen' } | { soort: 'kopie' } | { soort: 'deselecteer' } | { soort: 'schuif'; dx: number; dy: number }`
  - `toetsNaarActie(e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey'>): Actie | null`

- [ ] **Step 1: Failing tests schrijven**

`src/editor/snap.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { snap } from './snap';

const canvas = { breedte: 1000, hoogte: 800 };

describe('snap', () => {
  it('klikt het midden vast op het midden van het canvas', () => {
    const r = snap({ x: 445, y: 100, width: 100, height: 50 }, [], canvas, 10);
    expect(r.dx).toBe(5);
    expect(r.gidsen).toContainEqual({ richting: 'v', pos: 500 });
  });

  it('klikt randen vast op randen van andere elementen', () => {
    const r = snap({ x: 100, y: 304, width: 50, height: 50 }, [{ x: 600, y: 300, width: 80, height: 80 }], canvas, 10);
    expect(r.dy).toBe(-4);
    expect(r.gidsen).toContainEqual({ richting: 'h', pos: 300 });
  });

  it('doet niets buiten de drempel', () => {
    const r = snap({ x: 200, y: 200, width: 30, height: 30 }, [], canvas, 10);
    expect(r).toEqual({ dx: 0, dy: 0, gidsen: [] });
  });

  it('kiest het dichtstbijzijnde doel', () => {
    const r = snap({ x: 3, y: 200, width: 30, height: 30 }, [{ x: 1, y: 600, width: 10, height: 10 }], canvas, 10);
    expect(r.dx).toBe(-2);
  });
});
```

`src/editor/pinch.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { pinchDelta } from './pinch';

describe('pinchDelta', () => {
  it('verdubbelde afstand geeft schaal 2', () => {
    const d = pinchDelta({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: -50, y: 0 }, { x: 150, y: 0 });
    expect(d.schaal).toBeCloseTo(2);
    expect(d.rotatie).toBeCloseTo(0);
    expect(d.dx).toBeCloseTo(0);
  });

  it('kwartslag draaien geeft 90 graden', () => {
    const d = pinchDelta({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: -50 }, { x: 50, y: 50 });
    expect(d.rotatie).toBeCloseTo(90);
    expect(d.schaal).toBeCloseTo(1);
  });

  it('verschuiven van beide vingers geeft dx en dy', () => {
    const d = pinchDelta({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 30 }, { x: 30, y: 30 });
    expect(d.dx).toBeCloseTo(20);
    expect(d.dy).toBeCloseTo(30);
  });

  it('vingers op elkaar geven schaal 1 in plaats van oneindig', () => {
    expect(pinchDelta({ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 }).schaal).toBe(1);
  });
});
```

`src/editor/toetsen.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { toetsNaarActie } from './toetsen';

const t = (key: string, extra: Partial<{ ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }> = {}) =>
  toetsNaarActie({ key, ctrlKey: false, metaKey: false, shiftKey: false, ...extra });

describe('toetsNaarActie', () => {
  it('herkent ongedaan maken en opnieuw', () => {
    expect(t('z', { ctrlKey: true })).toEqual({ soort: 'ongedaan' });
    expect(t('Z', { metaKey: true, shiftKey: true })).toEqual({ soort: 'opnieuw' });
    expect(t('y', { ctrlKey: true })).toEqual({ soort: 'opnieuw' });
  });

  it('herkent wissen, kopie en deselecteren', () => {
    expect(t('Delete')).toEqual({ soort: 'wissen' });
    expect(t('Backspace')).toEqual({ soort: 'wissen' });
    expect(t('d', { ctrlKey: true })).toEqual({ soort: 'kopie' });
    expect(t('Escape')).toEqual({ soort: 'deselecteer' });
  });

  it('pijltjes schuiven 5, met shift 20', () => {
    expect(t('ArrowLeft')).toEqual({ soort: 'schuif', dx: -5, dy: 0 });
    expect(t('ArrowDown', { shiftKey: true })).toEqual({ soort: 'schuif', dx: 0, dy: 20 });
  });

  it('gewone letters doen niets', () => {
    expect(t('a')).toBeNull();
    expect(t('z')).toBeNull();
  });
});
```

Voeg toe aan `src/editor/canvas.test.ts` (binnen de bestaande `describe`):
```ts
  it('één sleepgebaar met veel bewegingen is één undo-stap', () => {
    const { editor, ctrl } = opzet();
    const v = maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    editor.add(v);
    const g = ctrl.group(v.id)!;
    for (let i = 1; i <= 10; i++) { g.x(100 + i * 7); g.fire('dragmove', { target: g }, true); }
    g.fire('dragend', { target: g }, true);
    expect(editor.get().collage.elementen[0].x).not.toBe(100);
    editor.undo();
    expect(editor.get().collage.elementen[0].x).toBe(100);
    editor.undo();
    expect(editor.get().collage.elementen).toHaveLength(0);
  });

  it('dragmove klikt vast op het midden en toont een hulplijn', () => {
    const { editor, ctrl } = opzet();
    const v = maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 100, hoogte: 100 });
    editor.add(v);
    const g = ctrl.group(v.id)!;
    g.x(603);
    g.fire('dragmove', { target: g }, true);
    expect(g.x()).toBeCloseTo(600, 0);
    expect(ctrl.stage.find('.gids').length).toBeGreaterThan(0);
    g.fire('dragend', { target: g }, true);
    expect(ctrl.stage.find('.gids')).toHaveLength(0);
  });
```

- [ ] **Step 2: Run tests — moeten falen**

Run: `npx vitest run src/editor`
Expected: FAIL — `Failed to resolve import "./snap"` (en de twee nieuwe canvastests falen).

- [ ] **Step 3: Pure functies**

`src/editor/snap.ts`:
```ts
export interface Box { x: number; y: number; width: number; height: number }
export interface Gids { richting: 'v' | 'h'; pos: number }

const xs = (b: Box) => [b.x, b.x + b.width / 2, b.x + b.width];
const ys = (b: Box) => [b.y, b.y + b.height / 2, b.y + b.height];

function beste(eigen: number[], doelen: number[], drempel: number): { d: number; pos: number } | null {
  let r: { d: number; pos: number } | null = null;
  for (const e of eigen) {
    for (const t of doelen) {
      const d = t - e;
      if (Math.abs(d) <= drempel && (!r || Math.abs(d) < Math.abs(r.d))) r = { d, pos: t };
    }
  }
  return r;
}

export function snap(moving: Box, others: Box[], canvas: { breedte: number; hoogte: number }, drempel: number): { dx: number; dy: number; gidsen: Gids[] } {
  const bx = beste(xs(moving), [0, canvas.breedte / 2, canvas.breedte, ...others.flatMap(xs)], drempel);
  const by = beste(ys(moving), [0, canvas.hoogte / 2, canvas.hoogte, ...others.flatMap(ys)], drempel);
  const gidsen: Gids[] = [];
  if (bx) gidsen.push({ richting: 'v', pos: bx.pos });
  if (by) gidsen.push({ richting: 'h', pos: by.pos });
  return { dx: bx?.d ?? 0, dy: by?.d ?? 0, gidsen };
}
```

`src/editor/pinch.ts`:
```ts
export interface Punt { x: number; y: number }

const hoek = (p: Punt, q: Punt) => Math.atan2(q.y - p.y, q.x - p.x);

export function pinchDelta(a1: Punt, a2: Punt, b1: Punt, b2: Punt): { schaal: number; rotatie: number; dx: number; dy: number } {
  const da = Math.hypot(a2.x - a1.x, a2.y - a1.y);
  const db = Math.hypot(b2.x - b1.x, b2.y - b1.y);
  return {
    schaal: da === 0 ? 1 : db / da,
    rotatie: ((hoek(b1, b2) - hoek(a1, a2)) * 180) / Math.PI,
    dx: (b1.x + b2.x) / 2 - (a1.x + a2.x) / 2,
    dy: (b1.y + b2.y) / 2 - (a1.y + a2.y) / 2,
  };
}
```

`src/editor/toetsen.ts`:
```ts
export type Actie =
  | { soort: 'ongedaan' } | { soort: 'opnieuw' } | { soort: 'wissen' } | { soort: 'kopie' } | { soort: 'deselecteer' }
  | { soort: 'schuif'; dx: number; dy: number };

export function toetsNaarActie(e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey'>): Actie | null {
  const mod = e.ctrlKey || e.metaKey;
  const k = e.key.toLowerCase();
  if (mod && k === 'z') return e.shiftKey ? { soort: 'opnieuw' } : { soort: 'ongedaan' };
  if (mod && k === 'y') return { soort: 'opnieuw' };
  if (mod && k === 'd') return { soort: 'kopie' };
  if (mod) return null;
  if (k === 'delete' || k === 'backspace') return { soort: 'wissen' };
  if (k === 'escape') return { soort: 'deselecteer' };
  const stap = e.shiftKey ? 20 : 5;
  const pijlen: Record<string, [number, number]> = { arrowleft: [-stap, 0], arrowright: [stap, 0], arrowup: [0, -stap], arrowdown: [0, stap] };
  const p = pijlen[k];
  return p ? { soort: 'schuif', dx: p[0], dy: p[1] } : null;
}
```

- [ ] **Step 4: Controller uitbreiden**

In `src/editor/canvas.ts`, voeg imports toe:
```ts
import { snap, type Gids } from './snap';
import { pinchDelta, type Punt } from './pinch';
```

Voeg velden toe aan de klasse:
```ts
  private knijp: { id: string; p1: Punt; p2: Punt; x: number; y: number; sx: number; sy: number; rot: number } | null = null;
```

Voeg methodes toe:
```ts
  protected tekenGidsen(gidsen: Gids[]): void {
    this.ui.find('.gids').forEach((n) => n.destroy());
    const dik = 2 / this.stage.scaleX();
    for (const g of gidsen) {
      const punten = g.richting === 'v' ? [g.pos, 0, g.pos, this.maat.hoogte] : [0, g.pos, this.maat.breedte, g.pos];
      this.ui.add(new Konva.Line({ name: 'gids', points: punten, stroke: '#FF6B6B', strokeWidth: dik, dash: [8 * dik, 6 * dik], listening: false }));
    }
    this.ui.batchDraw();
  }

  private touchPunten(e: TouchEvent): [Punt, Punt] {
    const t = e.touches;
    return [{ x: t[0].clientX, y: t[0].clientY }, { x: t[1].clientX, y: t[1].clientY }];
  }
```

Voeg aan het einde van `bindEvents()` toe:
```ts
    this.content.on('dragmove', (e) => {
      const g = e.target as Konva.Group;
      if (g.name() !== 'element') return;
      const box = g.getClientRect({ relativeTo: this.content });
      const andere = [...this.nodes.values()].filter((n) => n.group !== g).map((n) => n.group.getClientRect({ relativeTo: this.content }));
      const r = snap(box, andere, this.maat, 12 / this.stage.scaleX());
      g.x(g.x() + r.dx);
      g.y(g.y() + r.dy);
      this.tekenGidsen(r.gidsen);
    });
    this.content.on('dragend', () => this.tekenGidsen([]));

    this.stage.on('touchmove', (e) => {
      const evt = e.evt as TouchEvent;
      if (evt.touches.length !== 2) return;
      const id = this.editor.get().selectedId;
      const n = id ? this.nodes.get(id) : undefined;
      if (!n || n.el.vergrendeld) return;
      evt.preventDefault();
      const [p1, p2] = this.touchPunten(evt);
      if (!this.knijp || this.knijp.id !== n.el.id) {
        n.group.stopDrag();
        this.knijp = { id: n.el.id, p1, p2, x: n.group.x(), y: n.group.y(), sx: n.group.scaleX(), sy: n.group.scaleY(), rot: n.group.rotation() };
        return;
      }
      const d = pinchDelta(this.knijp.p1, this.knijp.p2, p1, p2);
      const s = this.stage.scaleX();
      const klem = (v: number) => Math.sign(v) * Math.min(20, Math.max(0.05, Math.abs(v)));
      n.group.setAttrs({
        scaleX: klem(this.knijp.sx * d.schaal),
        scaleY: klem(this.knijp.sy * d.schaal),
        rotation: this.knijp.rot + d.rotatie,
        x: this.knijp.x + d.dx / s,
        y: this.knijp.y + d.dy / s,
      });
      this.transformer.forceUpdate();
      this.stage.batchDraw();
    });
    this.stage.on('touchend touchcancel', (e) => {
      if (!this.knijp || (e.evt as TouchEvent).touches.length >= 2) return;
      const g = this.nodes.get(this.knijp.id)?.group;
      this.knijp = null;
      if (g) this.editor.update(g.id(), { x: g.x(), y: g.y(), rotatie: g.rotation(), schaalX: Math.abs(g.scaleX()), schaalY: g.scaleY() });
    });
```

- [ ] **Step 5: Run tests — moeten slagen**

Run: `npx vitest run src/editor`
Expected: PASS (alle editor-tests, inclusief 2 nieuwe canvastests).

- [ ] **Step 6: Commit**

```bash
git add src/editor
git commit -m "feat: add snapping guides, pinch gesture and keyboard shortcut mapping"
```

---
### Task 8: App-shell — startscherm, editorscherm, balken en sneltoetsen

**Files:**
- Create: `src/ui/types.ts`, `src/ui/toast.ts`, `src/ui/Toast.svelte`, `src/ui/Dialoog.svelte`, `src/ui/StartScherm.svelte`, `src/ui/EditorScherm.svelte`, `src/ui/BovenBalk.svelte`, `src/ui/GereedschapBalk.svelte`, `src/ui/ContextBalk.svelte`, `e2e/editor.spec.ts`
- Modify: `src/App.svelte`, `e2e/helpers.ts`, `e2e/smoke.spec.ts`

**Interfaces:**
- Consumes: `createEditor`, `Editor` (Task 4), `CanvasController` (Task 6/7), `toetsNaarActie` (Task 7), `AssetStore` (Task 5), `FORMATEN`, `nieuweCollage`, `maakVorm` (Task 3), `Icon` (Task 2)
- Produces:
  - `type Paneel = 'foto' | 'tekst' | 'stickers' | 'vormen' | 'tekenen' | 'achtergrond'` (in `src/ui/types.ts`)
  - `toon(tekst: string, icoon?: 'info' | 'warning' | 'check-circle'): void` en `meldingen` store (in `src/ui/toast.ts`)
  - `StartScherm` prop `onStart(c: Collage, opdracht?: string, pakket?: string): void`
  - `EditorScherm` props `collage: Collage`, `opdracht?: string | null`, `startPakket?: string | null`, `onTerug(): void`
  - DOM-id's (gebruikt door tests en de rondleiding): `#start-nieuw`, `#formaat-<formaat>`, `#tool-<paneel>`, `#canvas-vlak`, `#paneel-<paneel>`, `#knop-terug`, `#knop-ongedaan`, `#knop-opnieuw`, `#knop-help`, `#knop-bewaar`, `#ctx-voor`, `#ctx-achter`, `#ctx-kopie`, `#ctx-draai`, `#ctx-spiegel`, `#ctx-slot`, `#ctx-wissen`
  - Test-haak bij `MODE === 'e2e'`: `window.__collage = { editor, assets, controller, maakVorm }`
  - e2e-helpers: `openNieuweCollage(page, formaat?)`, `elementen(page)`, `tikOpCanvas(page, x, y)`

- [ ] **Step 1: e2e-helpers uitbreiden en failing e2e-test schrijven**

`e2e/helpers.ts` (volledig vervangen):
```ts
import { test as base, expect, type Page } from '@playwright/test';

export const test = base;
export { expect };

declare global {
  interface Window { __collage: any }
}

export async function openNieuweCollage(page: Page, formaat = 'vierkant'): Promise<void> {
  await page.goto('/');
  await page.click('#start-nieuw');
  await page.click(`#formaat-${formaat}`);
  await page.waitForFunction(() => window.__collage?.controller);
}

export function elementen(page: Page): Promise<any[]> {
  return page.evaluate(() => window.__collage.editor.get().collage.elementen);
}

export async function tikOpCanvas(page: Page, x: number, y: number): Promise<void> {
  const p = await page.evaluate(([cx, cy]) => window.__collage.controller.naarScherm(cx, cy), [x, y]);
  await page.mouse.click(p.x, p.y);
}
```

`e2e/editor.spec.ts`:
```ts
import { test, expect, openNieuweCollage, elementen, tikOpCanvas } from './helpers';

test('nieuwe collage openen en terugkeren', async ({ page }) => {
  await openNieuweCollage(page, 'a4-liggend');
  await expect(page.locator('#canvas-vlak canvas').first()).toBeVisible();
  await page.click('#knop-terug');
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Stoppen' }).click();
  await expect(page.locator('#start-nieuw')).toBeVisible();
});

test('selecteren, contextbalk, ongedaan maken en sneltoetsen', async ({ page }) => {
  await openNieuweCollage(page);
  await page.evaluate(() => {
    const { editor, maakVorm } = window.__collage;
    editor.add(maakVorm({ x: 600, y: 600, vorm: 'rechthoek', breedte: 300, hoogte: 300 }));
    editor.select(null);
  });
  await tikOpCanvas(page, 600, 600);
  await expect(page.locator('#ctx-wissen')).toBeVisible();

  await page.click('#ctx-kopie');
  expect(await elementen(page)).toHaveLength(2);

  await page.click('#knop-ongedaan');
  expect(await elementen(page)).toHaveLength(1);
  await page.click('#knop-opnieuw');
  expect(await elementen(page)).toHaveLength(2);

  // De kopie ligt bovenaan (630, 630); tikken op (700, 700) selecteert de kopie.
  await tikOpCanvas(page, 700, 700);
  await page.keyboard.press('Delete');
  expect(await elementen(page)).toHaveLength(1);
  await page.keyboard.press('Control+z');
  expect(await elementen(page)).toHaveLength(2);

  await tikOpCanvas(page, 700, 700);
  await page.keyboard.press('ArrowRight');
  const els = await elementen(page);
  expect(els[1].x).toBe(635);
});

test('vergrendeld element toont alleen de slot-knop', async ({ page }) => {
  await openNieuweCollage(page);
  await page.evaluate(() => {
    const { editor, maakVorm } = window.__collage;
    editor.add(maakVorm({ x: 600, y: 600, vorm: 'rechthoek', breedte: 300, hoogte: 300 }));
  });
  await page.click('#ctx-slot');
  await expect(page.locator('#ctx-wissen')).toHaveCount(0);
  await page.click('#ctx-slot');
  await expect(page.locator('#ctx-wissen')).toBeVisible();
});
```

`e2e/smoke.spec.ts` (heading blijft "Collagemaker" op het startscherm, geen wijziging nodig).

- [ ] **Step 2: Run e2e — moet falen**

Run: `npx playwright test e2e/editor.spec.ts --project=chromebook`
Expected: FAIL — `#start-nieuw` niet gevonden.

- [ ] **Step 3: Kleine bouwstenen**

`src/ui/types.ts`:
```ts
export type Paneel = 'foto' | 'tekst' | 'stickers' | 'vormen' | 'tekenen' | 'achtergrond';
```

`src/ui/toast.ts`:
```ts
import { writable } from 'svelte/store';

export interface Melding { id: number; tekst: string; icoon: 'info' | 'warning' | 'check-circle' }

let teller = 0;
export const meldingen = writable<Melding[]>([]);

export function toon(tekst: string, icoon: Melding['icoon'] = 'info'): void {
  const id = ++teller;
  meldingen.update((m) => [...m, { id, tekst, icoon }]);
  setTimeout(() => meldingen.update((m) => m.filter((x) => x.id !== id)), 4500);
}
```

`src/ui/Toast.svelte`:
```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  import { meldingen } from './toast';
</script>

<div class="toasts" role="status" aria-live="polite">
  {#each $meldingen as m (m.id)}
    <div class="toast"><Icon name={m.icoon} size={28} /><span>{m.tekst}</span></div>
  {/each}
</div>

<style>
  .toasts { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); display: grid; gap: 8px; z-index: 100; pointer-events: none; }
  .toast { display: flex; align-items: center; gap: 12px; background: var(--inkt); color: #fff; padding: 14px 20px; border-radius: 18px; box-shadow: var(--schaduw); font-weight: 700; max-width: min(90vw, 520px); }
</style>
```

`src/ui/Dialoog.svelte`:
```svelte
<script lang="ts">
  let { titel, tekst, knoppen }: { titel: string; tekst: string; knoppen: { label: string; gevaar?: boolean; hoofd?: boolean; actie: () => void }[] } = $props();
</script>

<div class="scherm" role="presentation">
  <div class="dialoog" role="alertdialog" aria-modal="true" aria-labelledby="dialoog-titel">
    <h2 id="dialoog-titel">{titel}</h2>
    <p>{tekst}</p>
    <div class="knoppen">
      {#each knoppen as k}
        <button class:gevaar={k.gevaar} class:hoofd={k.hoofd} onclick={k.actie}>{k.label}</button>
      {/each}
    </div>
  </div>
</div>

<style>
  .scherm { position: fixed; inset: 0; background: rgba(45, 42, 50, 0.45); display: grid; place-items: center; z-index: 90; padding: 16px; }
  .dialoog { background: var(--paneel); border-radius: 28px; padding: 28px; max-width: 460px; box-shadow: var(--schaduw); }
  p { font-size: 1.1rem; line-height: 1.5; }
  .knoppen { display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap; }
  .knoppen button { padding: 0 22px; background: var(--creme); }
  .knoppen button.hoofd { background: var(--koraal); color: #fff; }
  .knoppen button.gevaar { background: #fde2e1; }
</style>
```

- [ ] **Step 4: Startscherm**

`src/ui/StartScherm.svelte`:
```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  import { FORMATEN } from '../document/formats';
  import { nieuweCollage } from '../document/create';
  import type { Collage, Formaat } from '../document/types';

  let { onStart }: { onStart: (c: Collage, opdracht?: string, pakket?: string) => void } = $props();
  let stap = $state<'menu' | 'formaat'>('menu');
  const formaten = Object.entries(FORMATEN) as [Formaat, (typeof FORMATEN)[Formaat]][];
</script>

<main class="start">
  <h1>Collagemaker</h1>
  {#if stap === 'menu'}
    <div class="kaarten">
      <button id="start-nieuw" class="kaart" style:--kleur="var(--koraal)" onclick={() => (stap = 'formaat')}>
        <Icon name="plus" size={64} /><span>Nieuw</span>
      </button>
      <!-- startkaarten -->
    </div>
  {:else if stap === 'formaat'}
    <button class="terug" onclick={() => (stap = 'menu')}><Icon name="arrow-left" /> Terug</button>
    <h2>Kies een vorm</h2>
    <div class="kaarten">
      {#each formaten as [id, f]}
        <button id="formaat-{id}" class="kaart formaat" onclick={() => onStart(nieuweCollage(id))}>
          <span class="blad" style:aspect-ratio="{f.breedte} / {f.hoogte}"></span>
          <span>{f.naam}</span>
        </button>
      {/each}
    </div>
  {/if}
</main>

<style>
  .start { min-height: 100dvh; padding: max(24px, env(safe-area-inset-top)) 24px 24px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; gap: 16px; }
  h1 { font-size: clamp(2rem, 6vw, 3.5rem); color: var(--koraal); margin-top: 16px; }
  .kaarten { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; width: min(960px, 100%); }
  .kaart { flex-direction: column; min-height: 200px; padding: 20px; border-radius: 28px; font-size: 1.4rem; background: var(--paneel); box-shadow: var(--schaduw); color: var(--kleur, var(--inkt)); }
  .formaat { color: var(--inkt); }
  .blad { display: block; height: 110px; max-width: 150px; background: var(--creme); border: 4px solid var(--hemel); border-radius: 10px; }
  .terug { align-self: flex-start; padding: 0 18px; }
</style>
```

- [ ] **Step 5: Balken**

`src/ui/BovenBalk.svelte`:
```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  let { naam, kanOngedaan, kanOpnieuw, onTerug, onOngedaan, onOpnieuw, onHelp, onBewaar }: {
    naam: string; kanOngedaan: boolean; kanOpnieuw: boolean;
    onTerug: () => void; onOngedaan: () => void; onOpnieuw: () => void; onHelp?: () => void; onBewaar?: () => void;
  } = $props();
</script>

<header class="boven-balk">
  <button id="knop-terug" aria-label="Terug" onclick={onTerug}><Icon name="arrow-left" /></button>
  <h1>{naam}</h1>
  <button id="knop-ongedaan" aria-label="Ongedaan maken" disabled={!kanOngedaan} onclick={onOngedaan}><Icon name="arrow-counter-clockwise" /></button>
  <button id="knop-opnieuw" aria-label="Opnieuw" disabled={!kanOpnieuw} onclick={onOpnieuw}><Icon name="arrow-clockwise" /></button>
  {#if onHelp}<button id="knop-help" aria-label="Help" onclick={onHelp}><Icon name="question" /></button>{/if}
  {#if onBewaar}<button id="knop-bewaar" class="hoofd" onclick={onBewaar}><Icon name="download-simple" /><span>Bewaar</span></button>{/if}
</header>

<style>
  .boven-balk { display: flex; align-items: center; gap: 8px; padding: max(8px, env(safe-area-inset-top)) 12px 8px; background: var(--paneel); box-shadow: 0 2px 10px rgba(45, 42, 50, 0.06); }
  h1 { flex: 1; font-size: 1.3rem; margin: 0 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  button { background: var(--creme); }
  button.hoofd { background: var(--koraal); }
</style>
```

`src/ui/GereedschapBalk.svelte`:
```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  import type { Paneel } from './types';
  let { actief, onKies }: { actief: Paneel | null; onKies: (p: Paneel) => void } = $props();
  const TOOLS: { id: Paneel; label: string; icoon: string }[] = [
    { id: 'foto', label: 'Foto', icoon: 'image' },
    { id: 'tekst', label: 'Tekst', icoon: 'text-t' },
    { id: 'stickers', label: 'Stickers', icoon: 'sticker' },
    { id: 'vormen', label: 'Vormen', icoon: 'shapes' },
    { id: 'tekenen', label: 'Tekenen', icoon: 'pencil-simple' },
    { id: 'achtergrond', label: 'Achtergrond', icoon: 'paint-bucket' },
  ];
</script>

<nav class="tools" aria-label="Gereedschap">
  {#each TOOLS as t}
    <button id="tool-{t.id}" class:actief={actief === t.id} aria-pressed={actief === t.id} onclick={() => onKies(t.id)}>
      <Icon name={t.icoon} size={30} /><span>{t.label}</span>
    </button>
  {/each}
</nav>

<style>
  .tools { display: flex; flex-direction: column; gap: 6px; padding: 10px 8px; background: var(--paneel); overflow-y: auto; }
  button { flex-direction: column; gap: 2px; width: 84px; min-height: 72px; font-size: 0.8rem; background: transparent; }
  button.actief { background: var(--zon); }
  @media (orientation: portrait) {
    .tools { flex-direction: row; justify-content: space-around; padding: 6px 4px max(6px, env(safe-area-inset-bottom)); overflow-x: auto; }
    button { width: auto; min-width: 64px; }
  }
</style>
```

`src/ui/ContextBalk.svelte`:
```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  import type { Element } from '../document/types';
  import type { Editor } from '../editor/store';
  let { editor, el, onTekst, onBijsnijden }: { editor: Editor; el: Element; onTekst?: () => void; onBijsnijden?: () => void } = $props();
</script>

<div class="context-balk" role="toolbar" aria-label="Bewerk element">
  {#if el.vergrendeld}
    <button id="ctx-slot" onclick={() => editor.update(el.id, { vergrendeld: false })}><Icon name="lock" /><span>Los</span></button>
  {:else}
    {#if el.type === 'tekst' && onTekst}
      <button id="ctx-tekst" onclick={onTekst}><Icon name="pencil" /><span>Tekst</span></button>
    {/if}
    {#if el.type === 'foto' && el.assetId && onBijsnijden}
      <button id="ctx-bijsnijden" onclick={onBijsnijden}><Icon name="crop" /><span>Knip</span></button>
    {/if}
    <button id="ctx-voor" onclick={() => editor.move(el.id, 'voor')}><Icon name="arrow-line-up" /><span>Voor</span></button>
    <button id="ctx-achter" onclick={() => editor.move(el.id, 'achter')}><Icon name="arrow-line-down" /><span>Achter</span></button>
    <button id="ctx-kopie" onclick={() => editor.duplicate(el.id)}><Icon name="copy" /><span>Kopie</span></button>
    <button id="ctx-draai" onclick={() => editor.update(el.id, { rotatie: (el.rotatie + 15) % 360 })}><Icon name="arrow-clockwise" /><span>Draai</span></button>
    <button id="ctx-spiegel" onclick={() => editor.update(el.id, { gespiegeld: !el.gespiegeld })}><Icon name="flip-horizontal" /><span>Spiegel</span></button>
    <button id="ctx-slot" onclick={() => editor.update(el.id, { vergrendeld: true })}><Icon name="lock-open" /><span>Vast</span></button>
    <button id="ctx-wissen" class="gevaar" onclick={() => editor.remove(el.id)}><Icon name="trash" /><span>Weg</span></button>
  {/if}
</div>

<style>
  .context-balk { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 4px; padding: 6px; background: var(--paneel); border-radius: 22px; box-shadow: var(--schaduw); max-width: calc(100% - 20px); overflow-x: auto; z-index: 5; }
  button { flex-direction: column; gap: 0; font-size: 0.72rem; min-width: 60px; background: transparent; }
</style>
```

- [ ] **Step 6: Editorscherm**

`src/ui/EditorScherm.svelte`:
```svelte
<script lang="ts">
  import { onDestroy, onMount, untrack } from 'svelte';
  import type { Collage, Element } from '../document/types';
  import { maakVorm } from '../document/create';
  import { createEditor } from '../editor/store';
  import { CanvasController } from '../editor/canvas';
  import { toetsNaarActie } from '../editor/toetsen';
  import { AssetStore } from '../assets/store';
  import type { Paneel } from './types';
  import BovenBalk from './BovenBalk.svelte';
  import GereedschapBalk from './GereedschapBalk.svelte';
  import ContextBalk from './ContextBalk.svelte';
  import Dialoog from './Dialoog.svelte';

  let { collage, opdracht = null, startPakket = null, onTerug }: { collage: Collage; opdracht?: string | null; startPakket?: string | null; onTerug: () => void } = $props();

  const editor = createEditor(untrack(() => collage));
  const assets = new AssetStore();
  const editorState = editor.state;
  let canvasEl: HTMLDivElement;
  let controller = $state.raw<CanvasController | null>(null);
  let paneel = $state<Paneel | null>(null);
  let vraagTerug = $state(false);

  const geselecteerd = $derived($editorState.collage.elementen.find((e) => e.id === $editorState.selectedId) ?? null);
  const PANEEL_VOOR: Record<Element['type'], Paneel> = { foto: 'foto', tekst: 'tekst', sticker: 'stickers', vorm: 'vormen', tekening: 'tekenen' };

  $effect(() => {
    const id = $editorState.selectedId;
    untrack(() => {
      const el = editor.get().collage.elementen.find((e) => e.id === id);
      if (el) paneel = PANEEL_VOOR[el.type];
    });
  });

  onMount(async () => {
    await assets.preload(editor.get().collage);
    controller = new CanvasController(canvasEl, editor, assets, {});
    if (import.meta.env.MODE === 'e2e') (window as any).__collage = { editor, assets, controller, maakVorm };
  });
  onDestroy(() => controller?.destroy());

  function opToets(e: KeyboardEvent) {
    if ((e.target as HTMLElement).closest('input, textarea, [contenteditable]')) return;
    const actie = toetsNaarActie(e);
    if (!actie) return;
    const el = geselecteerd;
    switch (actie.soort) {
      case 'ongedaan': editor.undo(); break;
      case 'opnieuw': editor.redo(); break;
      case 'deselecteer': editor.select(null); break;
      case 'wissen': if (!el) return; editor.remove(el.id); break;
      case 'kopie': if (!el) return; editor.duplicate(el.id); break;
      case 'schuif': if (!el || el.vergrendeld) return; editor.update(el.id, { x: el.x + actie.dx, y: el.y + actie.dy }); break;
    }
    e.preventDefault();
  }
</script>

<svelte:window onkeydown={opToets} />

<div class="editor">
  <div class="vak-boven">
    <BovenBalk
      naam={$editorState.collage.naam}
      kanOngedaan={$editorState.canUndo}
      kanOpnieuw={$editorState.canRedo}
      onTerug={() => (vraagTerug = true)}
      onOngedaan={() => editor.undo()}
      onOpnieuw={() => editor.redo()}
    />
  </div>
  <!-- opdrachtbalk -->
  <div class="vak-tools"><GereedschapBalk actief={paneel} onKies={(p) => (paneel = paneel === p ? null : p)} /></div>
  <div class="vak-canvas" id="canvas-vlak">
    <div class="canvas" bind:this={canvasEl}></div>
    {#if geselecteerd}<ContextBalk {editor} el={geselecteerd} />{/if}
  </div>
  {#if paneel}
    <aside class="vak-paneel" id="paneel-{paneel}">
      <!-- panelen -->
    </aside>
  {/if}
</div>

{#if vraagTerug}
  <Dialoog
    titel="Stoppen met deze collage?"
    tekst="Je collage is nog niet bewaard. Bewaar hem eerst als je hem wil houden."
    knoppen={[
      { label: 'Verder werken', hoofd: true, actie: () => (vraagTerug = false) },
      { label: 'Stoppen', gevaar: true, actie: onTerug },
    ]}
  />
{/if}

<style>
  .editor {
    display: grid; height: 100dvh;
    grid-template-columns: auto 1fr auto;
    grid-template-rows: auto auto 1fr;
    grid-template-areas: 'boven boven boven' 'opdracht opdracht opdracht' 'tools canvas paneel';
  }
  .vak-boven { grid-area: boven; z-index: 2; }
  .vak-tools { grid-area: tools; display: flex; }
  .vak-canvas { grid-area: canvas; position: relative; background: var(--werkvlak); overflow: hidden; touch-action: none; min-height: 0; min-width: 0; }
  .canvas { position: absolute; inset: 0; }
  .vak-paneel { grid-area: paneel; width: 340px; overflow-y: auto; background: var(--paneel); padding: 16px; box-sizing: border-box; box-shadow: -2px 0 12px rgba(45, 42, 50, 0.06); }
  @media (orientation: portrait) {
    .editor {
      grid-template-columns: 1fr;
      grid-template-rows: auto auto 1fr auto auto;
      grid-template-areas: 'boven' 'opdracht' 'canvas' 'paneel' 'tools';
    }
    .vak-paneel { width: auto; max-height: 42dvh; border-radius: 24px 24px 0 0; }
  }
</style>
```

`src/App.svelte` (vervangen):
```svelte
<script lang="ts">
  import StartScherm from './ui/StartScherm.svelte';
  import EditorScherm from './ui/EditorScherm.svelte';
  import Toast from './ui/Toast.svelte';
  import type { Collage } from './document/types';

  let collage = $state.raw<Collage | null>(null);
  let opdracht = $state<string | null>(null);
  let pakket = $state<string | null>(null);
</script>

{#if collage}
  <EditorScherm {collage} {opdracht} startPakket={pakket} onTerug={() => { collage = null; opdracht = null; pakket = null; }} />
{:else}
  <StartScherm onStart={(c, o, p) => { collage = c; opdracht = o ?? null; pakket = p ?? null; }} />
{/if}
<Toast />
```

- [ ] **Step 7: Run e2e en typecheck**

Run: `npx playwright test e2e/editor.spec.ts e2e/smoke.spec.ts`
Expected: PASS op beide projecten.
Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add start screen, editor screen, toolbars and keyboard shortcuts"
```

---

### Task 9: Kleurenpalet, schuifje, vormen- en stickerpaneel

**Files:**
- Create: `src/ui/kleuren.ts`, `src/ui/KleurPalet.svelte`, `src/ui/Schuif.svelte`, `src/ui/VormPaneel.svelte`, `src/ui/StickerPaneel.svelte`, `e2e/vormen-stickers.spec.ts`
- Modify: `src/ui/EditorScherm.svelte` (panelen inhaken)

**Interfaces:**
- Consumes: `Editor`, `maakVorm`, `maakSticker`, `FORMATEN`, `STICKER_PACKS`, `stickerUrl`, `AssetStore.ensureSticker`
- Produces:
  - `KLEUREN: string[]` (16 kleuren)
  - `<KleurPalet waarde onKies metGeen? />`, `<Schuif label min max stap? waarde onWijzig />` (id = `schuif-` + label in kleine letters met streepjes)
  - `<VormPaneel editor el />`, `<StickerPaneel editor assets el startPakket? />`
  - DOM-id's: `#vorm-<vorm>`, `#pakket-<id>`, `.sticker-knop`, `.kleur` (paletknoppen met `aria-label` = kleurcode)

- [ ] **Step 1: Failing e2e-test schrijven**

`e2e/vormen-stickers.spec.ts`:
```ts
import { test, expect, openNieuweCollage, elementen } from './helpers';

test('vorm toevoegen en kleur wijzigen', async ({ page }) => {
  await openNieuweCollage(page);
  await page.click('#tool-vormen');
  await page.click('#vorm-hart');
  let els = await elementen(page);
  expect(els).toHaveLength(1);
  expect(els[0]).toMatchObject({ type: 'vorm', vorm: 'hart' });
  await page.locator('#paneel-vormen .palet').first().getByRole('button', { name: '#5AA9F2' }).click();
  els = await elementen(page);
  expect(els[0].vulling).toBe('#5AA9F2');
});

test('sticker toevoegen uit een ander pakket en herkleuren', async ({ page }) => {
  await openNieuweCollage(page);
  await page.click('#tool-stickers');
  await page.click('#pakket-ruimte');
  await page.locator('.sticker-knop').first().click();
  await page.waitForFunction(() => window.__collage.editor.get().collage.elementen.length === 1);
  let els = await elementen(page);
  expect(els[0].type).toBe('sticker');
  expect(els[0].sticker.startsWith('ruimte/')).toBe(true);
  await page.locator('#paneel-stickers .palet').getByRole('button', { name: '#3BB273' }).click();
  await page.waitForFunction(() => window.__collage.editor.get().collage.elementen[0].kleur === '#3BB273');
});
```

- [ ] **Step 2: Run e2e — moet falen**

Run: `npx playwright test e2e/vormen-stickers.spec.ts --project=chromebook`
Expected: FAIL — `#vorm-hart` niet gevonden.

- [ ] **Step 3: Gedeelde UI-onderdelen**

`src/ui/kleuren.ts`:
```ts
export const KLEUREN = [
  '#2D2A32', '#FFFFFF', '#FF6B6B', '#FF9F1C', '#FFC94D', '#FFE14D', '#8BD450', '#3BB273',
  '#4ECDC4', '#5AA9F2', '#2F6FDB', '#A78BFA', '#8338EC', '#FF4FD8', '#A0522D', '#9CA3AF',
];
```

`src/ui/KleurPalet.svelte`:
```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  import { KLEUREN } from './kleuren';
  let { waarde, onKies, metGeen = false }: { waarde: string | null; onKies: (k: string | null) => void; metGeen?: boolean } = $props();
</script>

<div class="palet">
  {#if metGeen}
    <button class="kleur geen" class:actief={waarde === null} aria-label="Geen kleur" onclick={() => onKies(null)}><Icon name="prohibit" /></button>
  {/if}
  {#each KLEUREN as k}
    <button class="kleur" class:actief={waarde === k} style:background={k} aria-label={k} onclick={() => onKies(k)}></button>
  {/each}
</div>

<style>
  .palet { display: grid; grid-template-columns: repeat(auto-fill, minmax(56px, 1fr)); gap: 8px; margin-bottom: 16px; }
  .kleur { border: 3px solid var(--rand); border-radius: 50%; aspect-ratio: 1; padding: 0; }
  .kleur.actief { border-color: var(--inkt); box-shadow: 0 0 0 3px var(--zon); }
  .geen { background: var(--paneel); }
</style>
```

`src/ui/Schuif.svelte`:
```svelte
<script lang="ts">
  let { label, min, max, stap = 1, waarde, onWijzig }: { label: string; min: number; max: number; stap?: number; waarde: number; onWijzig: (v: number) => void } = $props();
  const id = $derived('schuif-' + label.toLowerCase().replace(/\s+/g, '-'));
</script>

<div class="schuif">
  <label for={id}>{label}</label>
  <input {id} type="range" {min} {max} step={stap} value={waarde} onchange={(e) => onWijzig(Number(e.currentTarget.value))} />
</div>

<style>
  .schuif { margin-bottom: 14px; }
  label { display: block; font-weight: 700; margin-bottom: 4px; }
</style>
```

- [ ] **Step 4: Panelen**

`src/ui/VormPaneel.svelte`:
```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  import KleurPalet from './KleurPalet.svelte';
  import Schuif from './Schuif.svelte';
  import { FORMATEN } from '../document/formats';
  import { maakVorm } from '../document/create';
  import type { Element, VormElement } from '../document/types';
  import type { Editor } from '../editor/store';

  let { editor, el }: { editor: Editor; el: Element | null } = $props();
  const vorm = $derived(el?.type === 'vorm' ? el : null);

  const VORMEN: { vorm: VormElement['vorm']; icoon: string; label: string }[] = [
    { vorm: 'rechthoek', icoon: 'square', label: 'Vierkant' },
    { vorm: 'rond', icoon: 'circle', label: 'Rond' },
    { vorm: 'ster', icoon: 'star', label: 'Ster' },
    { vorm: 'hart', icoon: 'heart', label: 'Hart' },
    { vorm: 'driehoek', icoon: 'triangle', label: 'Driehoek' },
    { vorm: 'pijl', icoon: 'arrow-right', label: 'Pijl' },
    { vorm: 'wolk', icoon: 'cloud', label: 'Wolk' },
    { vorm: 'blob', icoon: 'drop', label: 'Vlek' },
    { vorm: 'lijn', icoon: 'line-segment', label: 'Lijn' },
  ];

  function voegToe(v: VormElement['vorm']) {
    const f = FORMATEN[editor.get().collage.formaat];
    const lijn = v === 'lijn';
    editor.add(maakVorm({ x: f.breedte / 2, y: f.hoogte / 2, vorm: v, breedte: lijn ? 400 : 300, hoogte: lijn ? 40 : 300 }));
  }
</script>

<h2>Vormen</h2>
<div class="raster">
  {#each VORMEN as v}
    <button id="vorm-{v.vorm}" onclick={() => voegToe(v.vorm)}><Icon name={v.icoon} size={36} /><span>{v.label}</span></button>
  {/each}
</div>

{#if vorm}
  {#if vorm.vorm !== 'lijn'}
    <h3>Kleur</h3>
    <KleurPalet waarde={vorm.vulling} metGeen onKies={(k) => editor.update(vorm.id, { vulling: k })} />
  {/if}
  <h3>Rand</h3>
  <KleurPalet waarde={vorm.rand} metGeen={vorm.vorm !== 'lijn'} onKies={(k) => editor.update(vorm.id, { rand: k })} />
  <Schuif label="Dikte" min={2} max={40} waarde={vorm.randDikte} onWijzig={(v) => editor.update(vorm.id, { randDikte: v })} />
  <Schuif label="Zichtbaar" min={10} max={100} waarde={Math.round(vorm.doorzichtigheid * 100)} onWijzig={(v) => editor.update(vorm.id, { doorzichtigheid: v / 100 })} />
{/if}

<style>
  .raster { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 20px; }
  .raster button { flex-direction: column; min-height: 84px; background: var(--creme); font-size: 0.85rem; }
</style>
```

`src/ui/StickerPaneel.svelte`:
```svelte
<script lang="ts">
  import { untrack } from 'svelte';
  import Icon from './Icon.svelte';
  import KleurPalet from './KleurPalet.svelte';
  import { STICKER_PACKS, stickerUrl } from '../assets/stickers';
  import type { AssetStore } from '../assets/store';
  import { FORMATEN } from '../document/formats';
  import { maakSticker } from '../document/create';
  import type { Element } from '../document/types';
  import type { Editor } from '../editor/store';

  let { editor, assets, el, startPakket = null }: { editor: Editor; assets: AssetStore; el: Element | null; startPakket?: string | null } = $props();
  let pakket = $state(untrack(() => startPakket) ?? STICKER_PACKS[0].id);
  let kleur = $state('#FF6B6B');
  const sticker = $derived(el?.type === 'sticker' ? el : null);
  const huidig = $derived(STICKER_PACKS.find((p) => p.id === pakket)!);

  async function voegToe(naam: string) {
    const s = `${pakket}/${naam}`;
    await assets.ensureSticker(s, kleur);
    const f = FORMATEN[editor.get().collage.formaat];
    editor.add(maakSticker({ x: f.breedte / 2, y: f.hoogte / 2, sticker: s, kleur, grootte: 260 }));
  }

  async function kiesKleur(k: string | null) {
    if (!k) return;
    kleur = k;
    if (sticker) {
      await assets.ensureSticker(sticker.sticker, k);
      editor.update(sticker.id, { kleur: k });
    }
  }
</script>

<h2>Stickers</h2>
<div class="pakketten" role="tablist">
  {#each STICKER_PACKS as p}
    <button id="pakket-{p.id}" role="tab" aria-selected={pakket === p.id} class:actief={pakket === p.id} aria-label={p.naam} onclick={() => (pakket = p.id)}>
      <Icon name={p.icoon} size={30} />
    </button>
  {/each}
</div>
<h3>{huidig.naam}</h3>
<div class="stickers">
  {#each huidig.stickers as naam}
    <button class="sticker-knop" aria-label={naam} onclick={() => voegToe(naam)}>
      <img src={stickerUrl(`${pakket}/${naam}`)} alt="" draggable="false" />
    </button>
  {/each}
</div>
<h3>Kleur</h3>
<KleurPalet waarde={sticker?.kleur ?? kleur} onKies={kiesKleur} />

<style>
  .pakketten { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 8px; }
  .pakketten button { background: var(--creme); flex: none; }
  .pakketten button.actief { background: var(--zon); }
  .stickers { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 8px; margin-bottom: 16px; }
  .sticker-knop { aspect-ratio: 1; background: var(--creme); padding: 10px; }
  .sticker-knop img { width: 100%; height: 100%; pointer-events: none; }
</style>
```

- [ ] **Step 5: Panelen inhaken in EditorScherm**

In `src/ui/EditorScherm.svelte`, voeg imports toe:
```ts
  import VormPaneel from './VormPaneel.svelte';
  import StickerPaneel from './StickerPaneel.svelte';
```
Vervang `<!-- panelen -->` door:
```svelte
      {#if paneel === 'vormen'}<VormPaneel {editor} el={geselecteerd} />{/if}
      {#if paneel === 'stickers'}<StickerPaneel {editor} {assets} el={geselecteerd} {startPakket} />{/if}
      <!-- panelen -->
```

- [ ] **Step 6: Run e2e — moet slagen**

Run: `npx playwright test e2e/vormen-stickers.spec.ts`
Expected: PASS op beide projecten.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add shape and sticker panels with color palette"
```

---

### Task 10: Foto's importeren — kiezen, slepen, plakken, verkleinen

**Files:**
- Create: `src/import/afbeelding.ts`, `src/import/afbeelding.test.ts`, `src/editor/uitsnede.ts`, `src/editor/uitsnede.test.ts`, `src/editor/foto-acties.ts`, `src/elements/foto.ts`, `src/ui/FotoPaneel.svelte`, `e2e/foto.spec.ts`
- Modify: `src/elements/index.ts` (foto-renderer), `src/ui/EditorScherm.svelte` (bestandkiezer, slepen, plakken, paneel), `e2e/helpers.ts` (PNG-fixture)

**Interfaces:**
- Produces:
  - `class ImportFout extends Error { code: 'geen-afbeelding' | 'geblokkeerd' | 'kapot' }`
  - `FOUTTEKST: Record<ImportFout['code'], string>`
  - `pasIn(w: number, h: number, max: number): { breedte: number; hoogte: number }` (alleen verkleinen)
  - `verkleinAfbeelding(blob: Blob, max?: number): Promise<Blob>`
  - `afbeeldingenUit(dt: DataTransfer): Promise<Blob[]>`
  - `dekUitsnede(bronB: number, bronH: number, doelB: number, doelH: number): Uitsnede`
  - `voegFotoToe(editor: Editor, assets: AssetStore, blob: Blob, opties?: { positie?: { x: number; y: number }; vakId?: string }): Promise<void>`
  - `renderFoto(el: FotoElement, ctx: RenderCtx): Konva.Group` — leeg vak heeft naam `leeg-vak` op een kind-node
  - DOM-id's: `#foto-kiezen` (knop), `#foto-input` (verborgen input)
  - Helper `maakPng(page: Page): Promise<Buffer>` in `e2e/helpers.ts` (PNG van 400×300)

- [ ] **Step 1: Failing unit-tests schrijven**

`src/import/afbeelding.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { ImportFout, afbeeldingenUit, pasIn, verkleinAfbeelding } from './afbeelding';

async function maakBlob(w: number, h: number, type = 'image/jpeg'): Promise<Blob> {
  const c = new OffscreenCanvas(w, h);
  const x = c.getContext('2d')!;
  x.fillStyle = '#4ECDC4';
  x.fillRect(0, 0, w, h);
  return c.convertToBlob({ type, quality: 0.9 });
}

async function maat(b: Blob) {
  const bmp = await createImageBitmap(b);
  return { w: bmp.width, h: bmp.height };
}

describe('pasIn', () => {
  it('verkleint de lange zijde tot max', () => {
    expect(pasIn(4000, 3000, 2048)).toEqual({ breedte: 2048, hoogte: 1536 });
    expect(pasIn(1000, 3000, 2048)).toEqual({ breedte: 683, hoogte: 2048 });
  });
  it('vergroot nooit', () => {
    expect(pasIn(300, 200, 2048)).toEqual({ breedte: 300, hoogte: 200 });
  });
});

describe('verkleinAfbeelding', () => {
  it('maakt een grote foto maximaal 2048 px', async () => {
    const uit = await verkleinAfbeelding(await maakBlob(4000, 3000));
    expect(await maat(uit)).toEqual({ w: 2048, h: 1536 });
    expect(uit.type).toBe('image/jpeg');
  });

  it('laat een kleine foto ongemoeid', async () => {
    const b = await maakBlob(200, 100);
    expect(await verkleinAfbeelding(b)).toBe(b);
  });

  it('houdt PNG als PNG (transparantie)', async () => {
    const uit = await verkleinAfbeelding(await maakBlob(3000, 3000, 'image/png'));
    expect(uit.type).toBe('image/png');
  });

  it('valt terug op <img>-decodering als createImageBitmap faalt', async () => {
    const svg = new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="1000"><rect width="3000" height="1000" fill="red"/></svg>'], { type: 'image/svg+xml' });
    const uit = await verkleinAfbeelding(svg);
    expect(await maat(uit)).toEqual({ w: 2048, h: 683 });
  });

  it('weigert iets dat geen afbeelding is', async () => {
    await expect(verkleinAfbeelding(new Blob(['hallo'], { type: 'text/plain' }))).rejects.toMatchObject({ code: 'geen-afbeelding' });
  });

  it('meldt een kapotte afbeelding', async () => {
    await expect(verkleinAfbeelding(new Blob(['geen jpeg'], { type: 'image/jpeg' }))).rejects.toBeInstanceOf(ImportFout);
  });
});

describe('afbeeldingenUit', () => {
  it('geeft afbeeldingsbestanden terug', async () => {
    const dt = new DataTransfer();
    dt.items.add(new File([await maakBlob(10, 10)], 'a.jpg', { type: 'image/jpeg' }));
    expect(await afbeeldingenUit(dt)).toHaveLength(1);
  });

  it('weigert alleen niet-afbeeldingen', async () => {
    const dt = new DataTransfer();
    dt.items.add(new File(['x'], 'a.txt', { type: 'text/plain' }));
    await expect(afbeeldingenUit(dt)).rejects.toMatchObject({ code: 'geen-afbeelding' });
  });

  it('haalt een afbeelding op via een URL (data-URL)', async () => {
    const c = document.createElement('canvas');
    c.width = c.height = 4;
    const dt = new DataTransfer();
    dt.setData('text/uri-list', c.toDataURL('image/png'));
    const uit = await afbeeldingenUit(dt);
    expect(uit[0].type).toBe('image/png');
  });

  it('meldt geblokkeerd als de URL niet opgehaald kan worden', async () => {
    const dt = new DataTransfer();
    dt.setData('text/uri-list', 'https://voorbeeld.invalid/foto.jpg');
    await expect(afbeeldingenUit(dt)).rejects.toMatchObject({ code: 'geblokkeerd' });
  });

  it('meldt geen-afbeelding bij lege overdracht', async () => {
    await expect(afbeeldingenUit(new DataTransfer())).rejects.toMatchObject({ code: 'geen-afbeelding' });
  });
});
```

`src/editor/uitsnede.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { dekUitsnede } from './uitsnede';

describe('dekUitsnede', () => {
  it('snijdt een brede foto bij voor een vierkant vak (midden)', () => {
    expect(dekUitsnede(400, 200, 100, 100)).toEqual({ x: 100, y: 0, breedte: 200, hoogte: 200 });
  });
  it('snijdt een hoge foto bij voor een breed vak (midden)', () => {
    expect(dekUitsnede(200, 400, 200, 100)).toEqual({ x: 0, y: 150, breedte: 200, hoogte: 100 });
  });
});
```

- [ ] **Step 2: Run tests — moeten falen**

Run: `npx vitest run src/import src/editor/uitsnede.test.ts`
Expected: FAIL — `Failed to resolve import "./afbeelding"`.

- [ ] **Step 3: Implementatie import en uitsnede**

`src/import/afbeelding.ts`:
```ts
import { loadImage } from '../assets/store';

export class ImportFout extends Error {
  constructor(public code: 'geen-afbeelding' | 'geblokkeerd' | 'kapot') { super(code); }
}

export const FOUTTEKST: Record<ImportFout['code'], string> = {
  'geen-afbeelding': 'Dat is geen foto. Probeer een foto.',
  geblokkeerd: 'Deze foto kan ik niet ophalen. Bewaar hem eerst en voeg hem dan toe.',
  kapot: 'Deze foto kan ik niet openen.',
};

export function pasIn(w: number, h: number, max: number): { breedte: number; hoogte: number } {
  const s = Math.min(1, max / Math.max(w, h));
  return { breedte: Math.round(w * s), hoogte: Math.round(h * s) };
}

async function decodeer(blob: Blob): Promise<{ bron: CanvasImageSource; w: number; h: number; sluit(): void }> {
  try {
    const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    return { bron: bmp, w: bmp.width, h: bmp.height, sluit: () => bmp.close() };
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      const img = await loadImage(url);
      if (!img.naturalWidth) throw new Error();
      return { bron: img, w: img.naturalWidth, h: img.naturalHeight, sluit: () => URL.revokeObjectURL(url) };
    } catch {
      URL.revokeObjectURL(url);
      throw new ImportFout('kapot');
    }
  }
}

export async function verkleinAfbeelding(blob: Blob, max = 2048): Promise<Blob> {
  if (!blob.type.startsWith('image/')) throw new ImportFout('geen-afbeelding');
  const d = await decodeer(blob);
  const { breedte, hoogte } = pasIn(d.w, d.h, max);
  const klein = breedte === d.w && hoogte === d.h;
  if (klein && blob.size < 4_000_000 && blob.type !== 'image/svg+xml') { d.sluit(); return blob; }
  const c = document.createElement('canvas');
  c.width = breedte;
  c.height = hoogte;
  c.getContext('2d')!.drawImage(d.bron, 0, 0, breedte, hoogte);
  d.sluit();
  const type = blob.type === 'image/png' || blob.type === 'image/webp' || blob.type === 'image/gif' || blob.type === 'image/svg+xml' ? 'image/png' : 'image/jpeg';
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new ImportFout('kapot'))), type, 0.9));
}

function urlUit(dt: DataTransfer): string | null {
  const lijst = dt.getData('text/uri-list').split(/\r?\n/).find((l) => l && !l.startsWith('#'));
  if (lijst) return lijst.trim();
  const html = dt.getData('text/html');
  const m = html.match(/<img[^>]+src="([^"]+)"/i);
  return m ? m[1] : null;
}

export async function afbeeldingenUit(dt: DataTransfer): Promise<Blob[]> {
  const bestanden = [...dt.files];
  const fotos = bestanden.filter((f) => f.type.startsWith('image/'));
  if (fotos.length) return fotos;
  if (bestanden.length) throw new ImportFout('geen-afbeelding');
  const url = urlUit(dt);
  if (!url) throw new ImportFout('geen-afbeelding');
  try {
    const r = await fetch(url, { mode: 'cors' });
    if (!r.ok) throw new Error();
    const b = await r.blob();
    if (!b.type.startsWith('image/')) throw new Error();
    return [b];
  } catch {
    throw new ImportFout('geblokkeerd');
  }
}
```

`src/editor/uitsnede.ts`:
```ts
import type { Uitsnede } from '../document/types';

export function dekUitsnede(bronB: number, bronH: number, doelB: number, doelH: number): Uitsnede {
  const doel = doelB / doelH;
  if (bronB / bronH > doel) {
    const b = bronH * doel;
    return { x: (bronB - b) / 2, y: 0, breedte: b, hoogte: bronH };
  }
  const h = bronB / doel;
  return { x: 0, y: (bronH - h) / 2, breedte: bronB, hoogte: h };
}
```

- [ ] **Step 4: Run tests — moeten slagen**

Run: `npx vitest run src/import src/editor/uitsnede.test.ts`
Expected: PASS (15 tests).

- [ ] **Step 5: Foto-renderer en foto-acties (met unit-test)**

Voeg toe aan `src/elements/render.test.ts`:
```ts
import { renderFoto } from './foto';

describe('renderFoto', () => {
  it('leeg vak toont een gestreepte rechthoek met naam leeg-vak', () => {
    const f = maakFoto({ x: 50, y: 50, breedte: 100, hoogte: 80, assetId: null });
    const g = renderFoto(f, leeg);
    expect(g.findOne('.leeg-vak')).toBeDefined();
  });

  it('foto met afbeelding gebruikt uitsnede als crop', () => {
    const img = document.createElement('canvas');
    img.width = 400; img.height = 200;
    const f = { ...maakFoto({ x: 0, y: 0, breedte: 100, hoogte: 100, assetId: 'a1' }), uitsnede: { x: 100, y: 0, breedte: 200, hoogte: 200 } };
    const node = renderFoto(f, { image: (k) => (k === 'a1' ? img : undefined) }).findOne('Image') as Konva.Image;
    expect(node.image()).toBe(img);
    expect(node.crop()).toEqual({ x: 100, y: 0, width: 200, height: 200 });
    expect(node.width()).toBe(100);
  });
});
```

`src/elements/foto.ts`:
```ts
import Konva from 'konva';
import type { FotoElement } from '../document/types';
import { baseGroup, type RenderCtx } from './base';

export function fotoNode(el: FotoElement, ctx: RenderCtx): Konva.Shape {
  const img = el.assetId ? ctx.image(el.assetId) : undefined;
  if (!img) {
    return new Konva.Rect({
      name: 'leeg-vak', width: el.breedte, height: el.hoogte,
      fill: '#FFF3E0', stroke: '#FF9F1C', strokeWidth: Math.max(4, el.breedte / 80),
      dash: [18, 12], cornerRadius: 12,
    });
  }
  const u = el.uitsnede;
  return new Konva.Image({
    image: img, width: el.breedte, height: el.hoogte,
    ...(u ? { crop: { x: u.x, y: u.y, width: u.breedte, height: u.hoogte } } : {}),
  });
}

function plusTeken(el: FotoElement): Konva.Shape {
  const r = Math.min(el.breedte, el.hoogte) * 0.12;
  return new Konva.Shape({
    listening: false, stroke: '#FF9F1C', strokeWidth: r * 0.35, lineCap: 'round',
    sceneFunc(c, s) {
      c.beginPath();
      c.moveTo(el.breedte / 2 - r, el.hoogte / 2); c.lineTo(el.breedte / 2 + r, el.hoogte / 2);
      c.moveTo(el.breedte / 2, el.hoogte / 2 - r); c.lineTo(el.breedte / 2, el.hoogte / 2 + r);
      c.strokeShape(s);
    },
    name: 'leeg-vak',
  });
}

export function renderFoto(el: FotoElement, ctx: RenderCtx): Konva.Group {
  const g = baseGroup(el);
  const node = fotoNode(el, ctx);
  g.add(node);
  if (node.name() === 'leeg-vak') g.add(plusTeken(el));
  return g;
}
```

In `src/elements/index.ts`: voeg `import { renderFoto } from './foto';` toe en voeg aan `RENDERERS` toe: `foto: renderFoto as Renderer,`.

`src/editor/foto-acties.ts`:
```ts
import type { AssetStore } from '../assets/store';
import { maakFoto } from '../document/create';
import { FORMATEN } from '../document/formats';
import type { FotoElement } from '../document/types';
import { pasIn, verkleinAfbeelding } from '../import/afbeelding';
import type { Editor } from './store';
import { dekUitsnede } from './uitsnede';

export async function voegFotoToe(editor: Editor, assets: AssetStore, blob: Blob, opties: { positie?: { x: number; y: number }; vakId?: string } = {}): Promise<void> {
  const klein = await verkleinAfbeelding(blob);
  const id = await assets.addBlob(klein);
  const img = assets.image(id)!;
  const { collage } = editor.get();
  const vak = opties.vakId ? (collage.elementen.find((e) => e.id === opties.vakId) as FotoElement | undefined) : undefined;
  if (vak) {
    editor.update(vak.id, { assetId: id, uitsnede: dekUitsnede(img.naturalWidth, img.naturalHeight, vak.breedte, vak.hoogte) });
    return;
  }
  const f = FORMATEN[collage.formaat];
  const maat = pasIn(img.naturalWidth, img.naturalHeight, Math.min(f.breedte, f.hoogte) * 0.6);
  editor.add(maakFoto({ x: opties.positie?.x ?? f.breedte / 2, y: opties.positie?.y ?? f.hoogte / 2, breedte: maat.breedte, hoogte: maat.hoogte, assetId: id }));
}
```

Run: `npx vitest run src/elements`
Expected: PASS.

- [ ] **Step 6: Failing e2e-test schrijven**

Voeg toe aan `e2e/helpers.ts`:
```ts
// Echte PNG van 400x300, in de browser gemaakt (geen vaste base64 nodig)
export async function maakPng(page: Page): Promise<Buffer> {
  const b64 = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 400;
    c.height = 300;
    const x = c.getContext('2d')!;
    x.fillStyle = '#4ECDC4';
    x.fillRect(0, 0, 400, 300);
    x.fillStyle = '#FF6B6B';
    x.fillRect(100, 75, 200, 150);
    return c.toDataURL('image/png').split(',')[1];
  });
  return Buffer.from(b64, 'base64');
}
```

`e2e/foto.spec.ts`:
```ts
import { test, expect, openNieuweCollage, elementen, maakPng } from './helpers';

test('foto kiezen via het fotopaneel', async ({ page }) => {
  await openNieuweCollage(page);
  await page.click('#tool-foto');
  const chooser = page.waitForEvent('filechooser');
  await page.click('#foto-kiezen');
  await (await chooser).setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: await maakPng(page) });
  await page.waitForFunction(() => window.__collage.editor.get().collage.elementen.length === 1);
  const [f] = await elementen(page);
  expect(f.type).toBe('foto');
  expect(f.assetId).toBeTruthy();
});

test('foto slepen op het canvas', async ({ page }) => {
  await openNieuweCollage(page);
  const b64 = (await maakPng(page)).toString('base64');
  await page.evaluate(async (data) => {
    const blob = await (await fetch(`data:image/png;base64,${data}`)).blob();
    const dt = new DataTransfer();
    dt.items.add(new File([blob], 'x.png', { type: 'image/png' }));
    const vak = document.querySelector('#canvas-vlak')!;
    const r = vak.getBoundingClientRect();
    vak.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }));
  }, b64);
  await page.waitForFunction(() => window.__collage.editor.get().collage.elementen.length === 1);
});

test('tekstbestand slepen geeft een melding en voegt niets toe', async ({ page }) => {
  await openNieuweCollage(page);
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(['hallo'], 'x.txt', { type: 'text/plain' }));
    document.querySelector('#canvas-vlak')!.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
  });
  await expect(page.getByText('Dat is geen foto. Probeer een foto.')).toBeVisible();
  expect(await elementen(page)).toHaveLength(0);
});
```

- [ ] **Step 7: FotoPaneel en EditorScherm**

`src/ui/FotoPaneel.svelte`:
```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  import type { Element } from '../document/types';
  import type { Editor } from '../editor/store';

  let { editor, el, onKiesFoto }: { editor: Editor; el: Element | null; onKiesFoto: (vakId?: string) => void } = $props();
  const foto = $derived(el?.type === 'foto' ? el : null);
</script>

<h2>Foto</h2>
<button id="foto-kiezen" class="hoofd breed" onclick={() => onKiesFoto(foto && !foto.assetId ? foto.id : undefined)}>
  <Icon name="image" /> {foto && !foto.assetId ? 'Kies foto voor dit vak' : 'Kies een foto'}
</button>
<p class="tip">Je kan ook een foto op de collage slepen of plakken.</p>
<!-- foto-opties -->

<style>
  .breed { width: 100%; margin-bottom: 8px; }
  .tip { color: #6b6470; margin: 0 0 16px; }
</style>
```

In `src/ui/EditorScherm.svelte`:

Imports toevoegen:
```ts
  import FotoPaneel from './FotoPaneel.svelte';
  import { voegFotoToe } from '../editor/foto-acties';
  import { afbeeldingenUit, FOUTTEKST, ImportFout } from '../import/afbeelding';
  import { toon } from './toast';
```

Script uitbreiden:
```ts
  let fotoInput: HTMLInputElement;
  let fotoVak: string | undefined;

  function meldFout(e: unknown) {
    toon(e instanceof ImportFout ? FOUTTEKST[e.code] : 'Er ging iets mis. Probeer het nog eens.', 'warning');
  }

  function kiesFoto(vakId?: string) {
    fotoVak = vakId;
    fotoInput.value = '';
    fotoInput.click();
  }

  async function voegFotosToe(blobs: Blob[], positie?: { x: number; y: number }, vakId?: string) {
    for (const [i, b] of blobs.entries()) {
      try {
        await voegFotoToe(editor, assets, b, { positie: positie && { x: positie.x + i * 40, y: positie.y + i * 40 }, vakId: i === 0 ? vakId : undefined });
      } catch (e) { meldFout(e); }
    }
  }

  async function opDrop(e: DragEvent) {
    e.preventDefault();
    if (!e.dataTransfer) return;
    const positie = controller?.naarCanvas(e.clientX, e.clientY);
    try { await voegFotosToe(await afbeeldingenUit(e.dataTransfer), positie); } catch (err) { meldFout(err); }
  }

  async function opPlak(e: ClipboardEvent) {
    if ((e.target as HTMLElement).closest('input, textarea')) return;
    if (!e.clipboardData || ![...e.clipboardData.items].some((i) => i.type.startsWith('image/'))) return;
    e.preventDefault();
    try { await voegFotosToe(await afbeeldingenUit(e.clipboardData)); } catch (err) { meldFout(err); }
  }
```

Wijzig de controller-aanmaak in `onMount`:
```ts
    controller = new CanvasController(canvasEl, editor, assets, { onVakTik: (id) => kiesFoto(id) });
```

Wijzig `<svelte:window onkeydown={opToets} />` naar:
```svelte
<svelte:window onkeydown={opToets} onpaste={opPlak} />
```

Wijzig het canvasvak:
```svelte
  <div class="vak-canvas" id="canvas-vlak" role="application" aria-label="Collage" ondragover={(e) => e.preventDefault()} ondrop={opDrop}>
```

Vervang `<!-- panelen -->` door:
```svelte
      {#if paneel === 'foto'}<FotoPaneel {editor} el={geselecteerd} onKiesFoto={kiesFoto} />{/if}
      <!-- panelen -->
```

Voeg vóór de afsluitende `</div>` van `.editor` toe:
```svelte
  <input id="foto-input" class="visueel-verborgen" type="file" accept="image/*" multiple bind:this={fotoInput}
    onchange={() => voegFotosToe([...(fotoInput.files ?? [])], undefined, fotoVak)} />
```

- [ ] **Step 8: Run tests — moeten slagen**

Run: `npx vitest run && npx playwright test e2e/foto.spec.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: import photos via picker, drag-and-drop and paste with downscaling"
```

---

### Task 11: Vormmaskers en kaders voor foto's

**Files:**
- Create: `src/elements/kaders.ts`, `src/elements/kaders.test.ts`, `src/elements/patronen-rng.ts`
- Modify: `src/elements/foto.ts`, `src/elements/render.test.ts`, `src/ui/FotoPaneel.svelte`, `e2e/foto.spec.ts`

**Interfaces:**
- Consumes: `tracePad` (Task 5), `KaderStijl`, `Masker`
- Produces:
  - `KADERS: { stijl: KaderStijl; naam: string }[]` (13 inclusief `geen`)
  - `MASKERS: { masker: Masker; naam: string; icoon: string }[]`
  - `langsRand(w: number, h: number, stap: number): { x: number; y: number }[]`
  - `kaderNodes(stijl: KaderStijl, kleur: string, w: number, h: number, masker: Masker): { achter: Konva.Shape[]; voor: Konva.Shape[] }`
  - DOM-id's: `#masker-<masker>`, `#kader-<stijl>`

- [ ] **Step 1: Failing tests schrijven**

`src/elements/kaders.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { KADERS, kaderNodes, langsRand } from './kaders';
import type { Masker } from '../document/types';

const MASKERS: Masker[] = ['rechthoek', 'rond', 'hart', 'ster', 'wolk', 'blob'];

describe('langsRand', () => {
  it('geeft punten op de rand, gelijk verdeeld', () => {
    const p = langsRand(100, 50, 30);
    expect(p).toHaveLength(10);
    for (const q of p) {
      const opRand = q.x === 0 || q.x === 100 || q.y === 0 || q.y === 50;
      expect(opRand).toBe(true);
    }
  });
});

describe('kaderNodes', () => {
  it('heeft 12 stijlen plus geen', () => {
    expect(KADERS.map((k) => k.stijl)).toHaveLength(13);
  });

  it('geen geeft niets', () => {
    expect(kaderNodes('geen', '#FFF', 100, 100, 'rechthoek')).toEqual({ achter: [], voor: [] });
  });

  it.each(KADERS.filter((k) => k.stijl !== 'geen').flatMap((k) => MASKERS.map((m) => [k.stijl, m] as const)))('%s met masker %s tekent iets', (stijl, masker) => {
    const r = kaderNodes(stijl, '#FF6B6B', 200, 150, masker);
    expect(r.achter.length + r.voor.length).toBeGreaterThan(0);
  });

  it('polaroid ligt achter de foto en is groter, met bredere onderrand', () => {
    const { achter } = kaderNodes('polaroid', '#FFFFFF', 200, 150, 'rechthoek');
    const r = achter[0].getClientRect();
    expect(r.width).toBeGreaterThan(200);
    expect(r.y + r.height - 150).toBeGreaterThan(-r.y);
  });

  it('kaders luisteren niet naar tikken', () => {
    const { voor, achter } = kaderNodes('sterren', '#FFC94D', 200, 150, 'rechthoek');
    for (const n of [...voor, ...achter]) expect(n.listening()).toBe(false);
  });
});
```

Voeg toe aan `src/elements/render.test.ts` (in `describe('renderFoto')`):
```ts
  it('niet-rechthoekig masker knipt de foto via clipFunc', () => {
    const img = document.createElement('canvas');
    const f = { ...maakFoto({ x: 0, y: 0, breedte: 100, hoogte: 100, assetId: 'a1' }), masker: 'hart' as const };
    const g = renderFoto(f, { image: () => img });
    const binnen = g.findOne('.foto-binnen') as Konva.Group;
    expect(binnen.clipFunc()).toBeTypeOf('function');
  });

  it('kader effen komt boven de foto', () => {
    const img = document.createElement('canvas');
    const f = { ...maakFoto({ x: 0, y: 0, breedte: 100, hoogte: 100, assetId: 'a1' }), kader: { stijl: 'effen' as const, kleur: '#FF0000' } };
    const g = renderFoto(f, { image: () => img });
    const kinderen = g.getChildren();
    expect(kinderen[kinderen.length - 1].name()).toBe('kader');
  });
```

- [ ] **Step 2: Run tests — moeten falen**

Run: `npx vitest run src/elements`
Expected: FAIL — `Failed to resolve import "./kaders"`.

- [ ] **Step 3: Implementatie kaders**

`src/elements/kaders.ts`:
```ts
import Konva from 'konva';
import type { ShapeConfig } from 'konva/lib/Shape';
import type { KaderStijl, Masker } from '../document/types';
import { tracePad, type PathCtx } from './paths';
import { mulberry32 } from './patronen-rng';

export const KADERS: { stijl: KaderStijl; naam: string }[] = [
  { stijl: 'geen', naam: 'Geen' }, { stijl: 'effen', naam: 'Rand' }, { stijl: 'polaroid', naam: 'Polaroid' },
  { stijl: 'plakband', naam: 'Plakband' }, { stijl: 'gescheurd', naam: 'Gescheurd' }, { stijl: 'stippen', naam: 'Stippen' },
  { stijl: 'film', naam: 'Film' }, { stijl: 'goud', naam: 'Goud' }, { stijl: 'krijt', naam: 'Krijt' },
  { stijl: 'dubbel', naam: 'Dubbel' }, { stijl: 'schaduw', naam: 'Schaduw' }, { stijl: 'golf', naam: 'Golf' },
  { stijl: 'sterren', naam: 'Sterren' },
];

export const MASKERS: { masker: Masker; naam: string; icoon: string }[] = [
  { masker: 'rechthoek', naam: 'Vierkant', icoon: 'square' }, { masker: 'rond', naam: 'Rond', icoon: 'circle' },
  { masker: 'hart', naam: 'Hart', icoon: 'heart' }, { masker: 'ster', naam: 'Ster', icoon: 'star' },
  { masker: 'wolk', naam: 'Wolk', icoon: 'cloud' }, { masker: 'blob', naam: 'Vlek', icoon: 'drop' },
];

const GOUD = [0, '#B8860B', 0.25, '#FFE58A', 0.5, '#D4A017', 0.75, '#FFF3B0', 1, '#B8860B'];

export function langsRand(w: number, h: number, stap: number): { x: number; y: number }[] {
  const omtrek = 2 * (w + h);
  const n = Math.max(4, Math.round(omtrek / stap));
  const punten: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    let s = (i * omtrek) / n;
    if (s < w) { punten.push({ x: s, y: 0 }); continue; }
    s -= w;
    if (s < h) { punten.push({ x: w, y: s }); continue; }
    s -= h;
    if (s < w) { punten.push({ x: w - s, y: h }); continue; }
    s -= w;
    punten.push({ x: 0, y: h - s });
  }
  return punten;
}

const stil = { listening: false, name: 'kader' };

function omtrek(masker: Masker, w: number, h: number, cfg: ShapeConfig): Konva.Shape {
  return new Konva.Shape({
    ...stil, lineJoin: 'round', ...cfg,
    sceneFunc(ctx, s) { tracePad(ctx as unknown as PathCtx, masker, w, h); ctx.strokeShape(s); },
  });
}

function vlak(masker: Masker, w: number, h: number, cfg: ShapeConfig): Konva.Shape {
  return new Konva.Shape({
    ...stil, ...cfg,
    sceneFunc(ctx, s) { tracePad(ctx as unknown as PathCtx, masker, w, h); ctx.fillShape(s); },
  });
}

export function kaderNodes(stijl: KaderStijl, kleur: string, w: number, h: number, masker: Masker): { achter: Konva.Shape[]; voor: Konva.Shape[] } {
  const d = Math.max(6, Math.min(w, h) * 0.04);
  const niets = { achter: [], voor: [] };
  if (stijl === 'geen') return niets;

  if (masker !== 'rechthoek') {
    switch (stijl) {
      case 'dubbel': return { achter: [], voor: [omtrek(masker, w, h, { stroke: kleur, strokeWidth: d * 2.4 }), omtrek(masker, w, h, { stroke: '#FFFFFF', strokeWidth: d * 0.8 })] };
      case 'stippen': return { achter: [], voor: [omtrek(masker, w, h, { stroke: kleur, strokeWidth: d * 1.6, dash: [0, d * 2.2], lineCap: 'round' })] };
      case 'goud': return { achter: [], voor: [omtrek(masker, w, h, { strokeWidth: d * 2.4, strokeLinearGradientStartPoint: { x: 0, y: 0 }, strokeLinearGradientEndPoint: { x: w, y: h }, strokeLinearGradientColorStops: GOUD })] };
      case 'krijt': return { achter: [], voor: [omtrek(masker, w, h, { stroke: kleur, strokeWidth: d * 1.4, dash: [d * 3, d * 0.6, d * 1.2, d * 0.5], opacity: 0.85 })] };
      case 'schaduw': return { achter: [vlak(masker, w, h, { fill: '#FFFFFF', shadowColor: 'rgba(0,0,0,0.35)', shadowBlur: d * 3, shadowOffset: { x: d * 0.5, y: d } })], voor: [] };
      default: return { achter: [], voor: [omtrek(masker, w, h, { stroke: kleur, strokeWidth: d * 2 })] };
    }
  }

  const rand = (cfg: ShapeConfig) => new Konva.Rect({ ...stil, x: 0, y: 0, width: w, height: h, lineJoin: 'round', ...cfg });

  switch (stijl) {
    case 'effen':
      return { achter: [], voor: [rand({ stroke: kleur, strokeWidth: d * 2 })] };
    case 'polaroid':
      return { achter: [new Konva.Rect({ ...stil, x: -d * 1.5, y: -d * 1.5, width: w + d * 3, height: h + d * 7.5, fill: kleur, shadowColor: 'rgba(0,0,0,0.25)', shadowBlur: d * 2, shadowOffset: { x: 0, y: d * 0.6 } })], voor: [] };
    case 'plakband': {
      const tape = (x: number, rot: number) => new Konva.Rect({ ...stil, x, y: 0, width: w * 0.3, height: d * 3, offsetX: w * 0.15, offsetY: d * 1.5, rotation: rot, fill: kleur, opacity: 0.7 });
      return { achter: [], voor: [tape(0, -40), tape(w, 40)] };
    }
    case 'gescheurd': {
      const m = d * 1.8, j = d * 0.9;
      const rng = mulberry32(Math.round(w * 7 + h * 13));
      const pts = langsRand(w + 2 * m, h + 2 * m, d * 1.4).flatMap((p) => [p.x - m + (rng() - 0.5) * j, p.y - m + (rng() - 0.5) * j]);
      return { achter: [new Konva.Line({ ...stil, points: pts, closed: true, fill: kleur, shadowColor: 'rgba(0,0,0,0.2)', shadowBlur: d, shadowOffset: { x: 0, y: d * 0.3 } })], voor: [] };
    }
    case 'stippen':
      return { achter: [], voor: [rand({ stroke: kleur, strokeWidth: d * 1.6, dash: [0, d * 2.2], lineCap: 'round' })] };
    case 'film': {
      const gaten: Konva.Shape[] = [];
      for (let y = d * 0.6; y < h - d; y += d * 2.5) {
        gaten.push(new Konva.Rect({ ...stil, x: -d * 2.2, y, width: d, height: d * 1.2, cornerRadius: 2, fill: '#FFFFFF' }));
        gaten.push(new Konva.Rect({ ...stil, x: w + d * 1.2, y, width: d, height: d * 1.2, cornerRadius: 2, fill: '#FFFFFF' }));
      }
      return { achter: [new Konva.Rect({ ...stil, x: -d * 3, y: -d * 0.8, width: w + d * 6, height: h + d * 1.6, fill: '#1E1E1E' })], voor: gaten };
    }
    case 'goud':
      return { achter: [], voor: [rand({ strokeWidth: d * 2.4, strokeLinearGradientStartPoint: { x: 0, y: 0 }, strokeLinearGradientEndPoint: { x: w, y: h }, strokeLinearGradientColorStops: GOUD }), rand({ stroke: '#8B6508', strokeWidth: d * 0.4 })] };
    case 'krijt':
      return { achter: [], voor: [rand({ stroke: kleur, strokeWidth: d * 1.4, dash: [d * 3, d * 0.6, d * 1.2, d * 0.5], lineCap: 'round', opacity: 0.85 }), rand({ x: d * 0.3, y: d * 0.2, stroke: kleur, strokeWidth: d * 0.6, opacity: 0.4 })] };
    case 'dubbel':
      return { achter: [], voor: [rand({ stroke: kleur, strokeWidth: d * 2.4 }), rand({ stroke: '#FFFFFF', strokeWidth: d * 0.8 })] };
    case 'schaduw':
      return { achter: [rand({ fill: '#FFFFFF', shadowColor: 'rgba(0,0,0,0.35)', shadowBlur: d * 3, shadowOffset: { x: d * 0.5, y: d } })], voor: [] };
    case 'golf': {
      const r = d * 1.2;
      const bollen = langsRand(w, h, r * 1.6).map((p) => new Konva.Circle({ ...stil, x: p.x, y: p.y, radius: r, fill: kleur }));
      return { achter: [new Konva.Rect({ ...stil, x: -r * 0.5, y: -r * 0.5, width: w + r, height: h + r, fill: kleur }), ...bollen], voor: [] };
    }
    case 'sterren': {
      const sterren = langsRand(w, h, d * 4).map((p) => new Konva.Star({ ...stil, x: p.x, y: p.y, numPoints: 5, innerRadius: d * 0.5, outerRadius: d * 1.1, fill: kleur }));
      return { achter: [], voor: sterren };
    }
  }
}
```

Deze taak heeft ook een kleine seeded random-generator nodig (ook gebruikt in Task 17).

`src/elements/patronen-rng.ts`:
```ts
export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 4: Foto-renderer met masker en kader**

Vervang `renderFoto` in `src/elements/foto.ts`:
```ts
import { kaderNodes } from './kaders';
import { tracePad, type PathCtx } from './paths';

export function renderFoto(el: FotoElement, ctx: RenderCtx): Konva.Group {
  const g = baseGroup(el);
  const node = fotoNode(el, ctx);
  const leeg = node.name() === 'leeg-vak';
  const binnen = new Konva.Group({ name: 'foto-binnen' });
  if (el.masker !== 'rechthoek' && !leeg) {
    binnen.clipFunc((c) => tracePad(c as unknown as PathCtx, el.masker, el.breedte, el.hoogte));
  }
  binnen.add(node);
  const { achter, voor } = leeg ? { achter: [], voor: [] } : kaderNodes(el.kader.stijl, el.kader.kleur, el.breedte, el.hoogte, el.masker);
  g.add(...achter);
  g.add(binnen);
  if (leeg) g.add(plusTeken(el));
  g.add(...voor);
  return g;
}
```
(`g.add()` zonder argumenten is in Konva toegestaan; als je TypeScript-versie klaagt, gebruik `for (const n of achter) g.add(n)`.)

- [ ] **Step 5: Run tests — moeten slagen**

Run: `npx vitest run src/elements`
Expected: PASS.

- [ ] **Step 6: FotoPaneel uitbreiden + e2e**

In `src/ui/FotoPaneel.svelte`, voeg imports toe:
```ts
  import KleurPalet from './KleurPalet.svelte';
  import { KADERS, MASKERS } from '../elements/kaders';
```
Vervang `<!-- foto-opties -->` door:
```svelte
{#if foto && foto.assetId}
  <h3>Vorm</h3>
  <div class="raster">
    {#each MASKERS as m}
      <button id="masker-{m.masker}" class:actief={foto.masker === m.masker} onclick={() => editor.update(foto.id, { masker: m.masker })}>
        <Icon name={m.icoon} size={30} /><span>{m.naam}</span>
      </button>
    {/each}
  </div>
  <h3>Kader</h3>
  <div class="raster">
    {#each KADERS as k}
      <button id="kader-{k.stijl}" class:actief={foto.kader.stijl === k.stijl} onclick={() => editor.update(foto.id, { kader: { ...foto.kader, stijl: k.stijl } })}>{k.naam}</button>
    {/each}
  </div>
  {#if foto.kader.stijl !== 'geen'}
    <h3>Kleur kader</h3>
    <KleurPalet waarde={foto.kader.kleur} onKies={(k) => k && editor.update(foto.id, { kader: { ...foto.kader, kleur: k } })} />
  {/if}
  <!-- filter-opties -->
{/if}
```
Voeg toe aan de `<style>`:
```css
  .raster { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
  .raster button { flex-direction: column; min-height: 64px; background: var(--creme); font-size: 0.85rem; padding: 4px; }
  .raster button.actief { background: var(--zon); }
```

Voeg toe aan `e2e/foto.spec.ts`:
```ts
test('masker en kader kiezen', async ({ page }) => {
  await openNieuweCollage(page);
  await page.click('#tool-foto');
  const chooser = page.waitForEvent('filechooser');
  await page.click('#foto-kiezen');
  await (await chooser).setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: await maakPng(page) });
  await page.click('#masker-hart');
  await page.click('#kader-polaroid');
  const [f] = await elementen(page);
  expect(f.masker).toBe('hart');
  expect(f.kader.stijl).toBe('polaroid');
});
```

Run: `npx playwright test e2e/foto.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add photo shape masks and 12 frame styles"
```

---

### Task 12: Fotofilters met voorbeeldtegels

**Files:**
- Create: `src/elements/filters.ts`, `src/elements/filters.test.ts`
- Modify: `src/elements/foto.ts`, `src/ui/FotoPaneel.svelte`, `e2e/foto.spec.ts`

**Interfaces:**
- Produces:
  - `FILTERS: { naam: FilterNaam; label: string }[]` (10)
  - `pasFilterToe(img: ImageData, naam: FilterNaam, helderheid?: number, contrast?: number): void` (muteert `img`)
  - `filterVoorbeeld(bron: CanvasImageSource, bronB: number, bronH: number, naam: FilterNaam): string` (data-URL, 72×72)
  - DOM-id's: `#filter-<naam>`, `#schuif-helder`, `#schuif-contrast`

- [ ] **Step 1: Failing tests schrijven**

`src/elements/filters.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { pasFilterToe, filterVoorbeeld } from './filters';

function beeld(r: number, g: number, b: number, w = 4, h = 4): ImageData {
  const d = new ImageData(w, h);
  for (let i = 0; i < d.data.length; i += 4) { d.data[i] = r; d.data[i + 1] = g; d.data[i + 2] = b; d.data[i + 3] = 255; }
  return d;
}

describe('pasFilterToe', () => {
  it('normaal zonder aanpassing verandert niets', () => {
    const d = beeld(10, 20, 30);
    pasFilterToe(d, 'normaal');
    expect([...d.data.slice(0, 4)]).toEqual([10, 20, 30, 255]);
  });

  it('zwartwit maakt r=g=b', () => {
    const d = beeld(200, 100, 50);
    pasFilterToe(d, 'zwartwit');
    expect(d.data[0]).toBe(d.data[1]);
    expect(d.data[1]).toBe(d.data[2]);
  });

  it('negatief keert om', () => {
    const d = beeld(0, 100, 255);
    pasFilterToe(d, 'negatief');
    expect([...d.data.slice(0, 3)]).toEqual([255, 155, 0]);
  });

  it('warm verhoogt rood en verlaagt blauw', () => {
    const d = beeld(100, 100, 100);
    pasFilterToe(d, 'warm');
    expect(d.data[0]).toBeGreaterThan(100);
    expect(d.data[2]).toBeLessThan(100);
  });

  it('helderheid +50 maakt lichter, alpha blijft', () => {
    const d = beeld(100, 100, 100);
    pasFilterToe(d, 'normaal', 50, 0);
    expect(d.data[0]).toBeGreaterThan(100);
    expect(d.data[3]).toBe(255);
  });

  it('contrast +50 trekt waarden uit elkaar', () => {
    const d = beeld(200, 60, 128);
    pasFilterToe(d, 'normaal', 0, 50);
    expect(d.data[0]).toBeGreaterThan(200);
    expect(d.data[1]).toBeLessThan(60);
  });

  it('pixel maakt blokken met gelijke kleur', () => {
    const d = new ImageData(120, 1);
    for (let x = 0; x < 120; x++) { d.data[x * 4] = x * 2; d.data[x * 4 + 3] = 255; }
    pasFilterToe(d, 'pixel');
    expect(d.data[0]).toBe(d.data[4]);
  });

  it('vervaagd verzacht een harde rand', () => {
    const d = new ImageData(300, 1);
    for (let x = 0; x < 300; x++) { d.data[x * 4] = x < 150 ? 0 : 255; d.data[x * 4 + 3] = 255; }
    pasFilterToe(d, 'vervaagd');
    expect(d.data[150 * 4]).toBeGreaterThan(0);
    expect(d.data[150 * 4]).toBeLessThan(255);
  });
});

describe('filterVoorbeeld', () => {
  it('geeft een PNG-data-URL', () => {
    const c = document.createElement('canvas');
    c.width = 200; c.height = 100;
    expect(filterVoorbeeld(c, 200, 100, 'sepia')).toMatch(/^data:image\/png/);
  });
});
```

- [ ] **Step 2: Run tests — moeten falen**

Run: `npx vitest run src/elements/filters.test.ts`
Expected: FAIL — `Failed to resolve import "./filters"`.

- [ ] **Step 3: Implementatie**

`src/elements/filters.ts`:
```ts
import type { FilterNaam } from '../document/types';

export const FILTERS: { naam: FilterNaam; label: string }[] = [
  { naam: 'normaal', label: 'Normaal' }, { naam: 'zwartwit', label: 'Zwart-wit' }, { naam: 'sepia', label: 'Oud' },
  { naam: 'warm', label: 'Warm' }, { naam: 'koel', label: 'Koel' }, { naam: 'vrolijk', label: 'Vrolijk' },
  { naam: 'vervaagd', label: 'Wazig' }, { naam: 'pixel', label: 'Pixels' }, { naam: 'strip', label: 'Strip' },
  { naam: 'negatief', label: 'Omgekeerd' },
];

function boxBlur(img: ImageData, r: number): void {
  const { width: w, height: h, data } = img;
  const tmp = new Uint8ClampedArray(data.length);
  const pass = (src: Uint8ClampedArray, dst: Uint8ClampedArray, horizontaal: boolean) => {
    const lijnen = horizontaal ? h : w, lengte = horizontaal ? w : h;
    for (let l = 0; l < lijnen; l++) {
      for (let c = 0; c < 4; c++) {
        let som = 0, n = 0;
        const idx = (k: number) => (horizontaal ? (l * w + k) : (k * w + l)) * 4 + c;
        for (let k = 0; k <= Math.min(r, lengte - 1); k++) { som += src[idx(k)]; n++; }
        for (let k = 0; k < lengte; k++) {
          dst[idx(k)] = som / n;
          const uit = k - r, inn = k + r + 1;
          if (uit >= 0) { som -= src[idx(uit)]; n--; }
          if (inn < lengte) { som += src[idx(inn)]; n++; }
        }
      }
    }
  };
  for (let i = 0; i < 2; i++) { pass(data, tmp, true); pass(tmp, data, false); }
}

function pixeleer(img: ImageData, blok: number): void {
  const { width: w, height: h, data } = img;
  for (let by = 0; by < h; by += blok) {
    for (let bx = 0; bx < w; bx += blok) {
      const som = [0, 0, 0, 0];
      let n = 0;
      for (let y = by; y < Math.min(by + blok, h); y++) for (let x = bx; x < Math.min(bx + blok, w); x++) {
        const i = (y * w + x) * 4;
        for (let c = 0; c < 4; c++) som[c] += data[i + c];
        n++;
      }
      for (let y = by; y < Math.min(by + blok, h); y++) for (let x = bx; x < Math.min(bx + blok, w); x++) {
        const i = (y * w + x) * 4;
        for (let c = 0; c < 4; c++) data[i + c] = som[c] / n;
      }
    }
  }
}

export function pasFilterToe(img: ImageData, naam: FilterNaam, helderheid = 0, contrast = 0): void {
  if (naam === 'vervaagd') boxBlur(img, Math.max(2, Math.round(img.width / 150)));
  if (naam === 'pixel') pixeleer(img, Math.max(4, Math.round(img.width / 60)));
  const kleurFilter = naam !== 'normaal' && naam !== 'vervaagd' && naam !== 'pixel';
  if (!kleurFilter && !helderheid && !contrast) return;
  const c = contrast * 2.55;
  const f = (259 * (c + 255)) / (255 * (259 - c));
  const hd = helderheid * 2.55;
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    switch (naam) {
      case 'zwartwit': { const v = 0.299 * r + 0.587 * g + 0.114 * b; r = g = b = v; break; }
      case 'sepia': { const nr = 0.393 * r + 0.769 * g + 0.189 * b, ng = 0.349 * r + 0.686 * g + 0.168 * b, nb = 0.272 * r + 0.534 * g + 0.131 * b; r = nr; g = ng; b = nb; break; }
      case 'warm': r = r * 1.08 + 10; b = b * 0.88; break;
      case 'koel': r = r * 0.9; b = b * 1.1 + 10; break;
      case 'vrolijk': { const v = 0.299 * r + 0.587 * g + 0.114 * b; r = v + (r - v) * 1.6; g = v + (g - v) * 1.6; b = v + (b - v) * 1.6; break; }
      case 'strip': { const p = (x: number) => (Math.round((x / 255) * 3) / 3) * 255; r = p(r); g = p(g); b = p(b); break; }
      case 'negatief': r = 255 - r; g = 255 - g; b = 255 - b; break;
    }
    if (hd || contrast) { r = f * (r + hd - 128) + 128; g = f * (g + hd - 128) + 128; b = f * (b + hd - 128) + 128; }
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
}

export function filterVoorbeeld(bron: CanvasImageSource, bronB: number, bronH: number, naam: FilterNaam): string {
  const m = 72;
  const c = document.createElement('canvas');
  c.width = c.height = m;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  const s = Math.min(bronB, bronH);
  x.drawImage(bron, (bronB - s) / 2, (bronH - s) / 2, s, s, 0, 0, m, m);
  const d = x.getImageData(0, 0, m, m);
  pasFilterToe(d, naam);
  x.putImageData(d, 0, 0);
  return c.toDataURL('image/png');
}
```

In `src/elements/foto.ts`, vervang in `fotoNode` de return van de `Konva.Image` door:
```ts
  const node = new Konva.Image({
    image: img, width: el.breedte, height: el.hoogte,
    ...(u ? { crop: { x: u.x, y: u.y, width: u.breedte, height: u.hoogte } } : {}),
  });
  if (el.filter !== 'normaal' || el.helderheid || el.contrast) {
    node.filters([(d: ImageData) => pasFilterToe(d, el.filter, el.helderheid, el.contrast)]);
    node.cache();
  }
  return node;
```
en voeg `import { pasFilterToe } from './filters';` toe.

Voeg toe aan `src/elements/render.test.ts` (in `describe('renderFoto')`):
```ts
  it('filter zet een gecachte node met filter', () => {
    const img = document.createElement('canvas');
    img.width = 10; img.height = 10;
    const f = { ...maakFoto({ x: 0, y: 0, breedte: 10, hoogte: 10, assetId: 'a1' }), filter: 'sepia' as const };
    const node = renderFoto(f, { image: () => img }).findOne('Image') as Konva.Image;
    expect(node.filters()).toHaveLength(1);
    expect(node.isCached()).toBe(true);
  });
```

- [ ] **Step 4: Run tests — moeten slagen**

Run: `npx vitest run src/elements`
Expected: PASS.

- [ ] **Step 5: Paneel uitbreiden + e2e**

In `src/ui/FotoPaneel.svelte`, voeg toe aan het script:
```ts
  import Schuif from './Schuif.svelte';
  import { FILTERS, filterVoorbeeld } from '../elements/filters';
  import type { AssetStore } from '../assets/store';
```
Wijzig de props naar:
```ts
  let { editor, assets, el, onKiesFoto }: { editor: Editor; assets: AssetStore; el: Element | null; onKiesFoto: (vakId?: string) => void } = $props();
```
Voeg toe:
```ts
  const assetId = $derived(foto?.assetId ?? null);
  const voorbeelden = $derived.by(() => {
    if (!assetId) return {} as Record<string, string>;
    const img = assets.image(assetId);
    if (!img) return {};
    return Object.fromEntries(FILTERS.map((f) => [f.naam, filterVoorbeeld(img, img.naturalWidth, img.naturalHeight, f.naam)]));
  });
```
`assetId` is een primitieve waarde: de voorbeelden worden alleen opnieuw berekend als de gekozen foto verandert, niet bij elke wijziging aan het element.

Vervang `<!-- filter-opties -->` door:
```svelte
  <h3>Filter</h3>
  <div class="filters">
    {#each FILTERS as f}
      <button id="filter-{f.naam}" class:actief={foto.filter === f.naam} onclick={() => editor.update(foto.id, { filter: f.naam })}>
        {#if voorbeelden[f.naam]}<img src={voorbeelden[f.naam]} alt="" />{/if}
        <span>{f.label}</span>
      </button>
    {/each}
  </div>
  <Schuif label="Helder" min={-100} max={100} waarde={foto.helderheid} onWijzig={(v) => editor.update(foto.id, { helderheid: v })} />
  <Schuif label="Contrast" min={-100} max={100} waarde={foto.contrast} onWijzig={(v) => editor.update(foto.id, { contrast: v })} />
```
Voeg CSS toe:
```css
  .filters { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
  .filters button { flex-direction: column; padding: 6px; background: var(--creme); font-size: 0.8rem; }
  .filters button.actief { background: var(--zon); }
  .filters img { width: 64px; height: 64px; border-radius: 10px; }
```

In `src/ui/EditorScherm.svelte`, wijzig de FotoPaneel-regel naar:
```svelte
      {#if paneel === 'foto'}<FotoPaneel {editor} {assets} el={geselecteerd} onKiesFoto={kiesFoto} />{/if}
```

Voeg toe aan `e2e/foto.spec.ts`:
```ts
test('filter en helderheid kiezen', async ({ page }) => {
  await openNieuweCollage(page);
  await page.click('#tool-foto');
  const chooser = page.waitForEvent('filechooser');
  await page.click('#foto-kiezen');
  await (await chooser).setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: await maakPng(page) });
  await page.click('#filter-sepia');
  await page.$eval('#schuif-helder', (el: HTMLInputElement) => {
    el.value = '40';
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const [f] = await elementen(page);
  expect(f.filter).toBe('sepia');
  expect(f.helderheid).toBe(40);
});
```

Run: `npx playwright test e2e/foto.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add photo filters with live previews and brightness/contrast"
```

---

### Task 13: Foto bijsnijden

**Files:**
- Modify: `src/editor/uitsnede.ts`, `src/editor/uitsnede.test.ts`, `src/ui/EditorScherm.svelte`, `src/ui/FotoPaneel.svelte`, `e2e/foto.spec.ts`
- Create: `src/ui/BijsnijDialoog.svelte`

**Interfaces:**
- Produces:
  - `type Verhouding = 'vrij' | '1:1' | '4:3' | '16:9'`, `VERHOUDINGEN: Verhouding[]`
  - `verhoudingGetal(v: Verhouding): number | null`
  - `pasVerhoudingToe(ratio: number, bron: { breedte: number; hoogte: number }): Uitsnede` (grootste rechthoek met die verhouding, gecentreerd)
  - `klemUitsnede(r: Uitsnede, bron: { breedte: number; hoogte: number }): Uitsnede` (minimaal 20 px, binnen de bron)
  - `<BijsnijDialoog bron: HTMLImageElement, start: Uitsnede | null, onKlaar(u: Uitsnede), onAnnuleer() />`
  - DOM-id's: `#ctx-bijsnijden`, `#foto-bijsnijden`, `#verhouding-<v>` (met `:` vervangen door `-`), `#bijsnij-klaar`, `#bijsnij-annuleer`

- [ ] **Step 1: Failing tests schrijven**

Voeg toe aan `src/editor/uitsnede.test.ts`:
```ts
import { klemUitsnede, pasVerhoudingToe, verhoudingGetal } from './uitsnede';

describe('verhoudingen', () => {
  it('rekent verhoudingen om', () => {
    expect(verhoudingGetal('vrij')).toBeNull();
    expect(verhoudingGetal('4:3')).toBeCloseTo(4 / 3);
  });

  it('pasVerhoudingToe kiest de grootste gecentreerde rechthoek', () => {
    expect(pasVerhoudingToe(1, { breedte: 400, hoogte: 300 })).toEqual({ x: 50, y: 0, breedte: 300, hoogte: 300 });
    expect(pasVerhoudingToe(16 / 9, { breedte: 400, hoogte: 400 })).toEqual({ x: 0, y: 87.5, breedte: 400, hoogte: 225 });
  });

  it('klemUitsnede houdt de uitsnede binnen de foto en minstens 20 px', () => {
    const bron = { breedte: 100, hoogte: 100 };
    expect(klemUitsnede({ x: -10, y: 90, breedte: 50, hoogte: 50 }, bron)).toEqual({ x: 0, y: 50, breedte: 50, hoogte: 50 });
    expect(klemUitsnede({ x: 0, y: 0, breedte: 5, hoogte: 500 }, bron)).toEqual({ x: 0, y: 0, breedte: 20, hoogte: 100 });
  });
});
```

- [ ] **Step 2: Run tests — moeten falen**

Run: `npx vitest run src/editor/uitsnede.test.ts`
Expected: FAIL — `klemUitsnede is not exported` / is not a function.

- [ ] **Step 3: Implementatie rekenfuncties**

Voeg toe aan `src/editor/uitsnede.ts`:
```ts
export type Verhouding = 'vrij' | '1:1' | '4:3' | '16:9';
export const VERHOUDINGEN: Verhouding[] = ['vrij', '1:1', '4:3', '16:9'];

export function verhoudingGetal(v: Verhouding): number | null {
  if (v === 'vrij') return null;
  const [a, b] = v.split(':').map(Number);
  return a / b;
}

export function pasVerhoudingToe(ratio: number, bron: { breedte: number; hoogte: number }): Uitsnede {
  let breedte = bron.breedte, hoogte = breedte / ratio;
  if (hoogte > bron.hoogte) { hoogte = bron.hoogte; breedte = hoogte * ratio; }
  return { x: (bron.breedte - breedte) / 2, y: (bron.hoogte - hoogte) / 2, breedte, hoogte };
}

export function klemUitsnede(r: Uitsnede, bron: { breedte: number; hoogte: number }): Uitsnede {
  const breedte = Math.min(bron.breedte, Math.max(20, r.breedte));
  const hoogte = Math.min(bron.hoogte, Math.max(20, r.hoogte));
  return {
    x: Math.min(bron.breedte - breedte, Math.max(0, r.x)),
    y: Math.min(bron.hoogte - hoogte, Math.max(0, r.y)),
    breedte, hoogte,
  };
}
```

Run: `npx vitest run src/editor/uitsnede.test.ts`
Expected: PASS.

- [ ] **Step 4: Bijsnijdialoog**

`src/ui/BijsnijDialoog.svelte`:
```svelte
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Konva from 'konva';
  import Icon from './Icon.svelte';
  import type { Uitsnede } from '../document/types';
  import { VERHOUDINGEN, klemUitsnede, pasVerhoudingToe, verhoudingGetal, type Verhouding } from '../editor/uitsnede';

  let { bron, start, onKlaar, onAnnuleer }: { bron: HTMLImageElement; start: Uitsnede | null; onKlaar: (u: Uitsnede) => void; onAnnuleer: () => void } = $props();

  let vlak: HTMLDivElement;
  let stage: Konva.Stage;
  let rect: Konva.Rect;
  let gat: Konva.Rect;
  let tr: Konva.Transformer;
  let s = 1;
  let verhouding = $state<Verhouding>('vrij');
  const maat = { breedte: bron.naturalWidth, hoogte: bron.naturalHeight };

  function zet(u: Uitsnede) {
    rect.setAttrs({ x: u.x * s, y: u.y * s, width: u.breedte * s, height: u.hoogte * s, scaleX: 1, scaleY: 1 });
    synchroniseer();
  }

  function synchroniseer() {
    gat.setAttrs({ x: rect.x(), y: rect.y(), width: rect.width() * rect.scaleX(), height: rect.height() * rect.scaleY() });
    stage.batchDraw();
  }

  function huidig(): Uitsnede {
    return klemUitsnede({ x: rect.x() / s, y: rect.y() / s, breedte: (rect.width() * rect.scaleX()) / s, hoogte: (rect.height() * rect.scaleY()) / s }, maat);
  }

  function kiesVerhouding(v: Verhouding) {
    verhouding = v;
    const r = verhoudingGetal(v);
    tr.keepRatio(r !== null);
    if (r !== null) zet(pasVerhoudingToe(r, maat));
  }

  onMount(() => {
    const w = vlak.clientWidth, h = vlak.clientHeight;
    s = Math.min(w / maat.breedte, h / maat.hoogte) * 0.92;
    stage = new Konva.Stage({ container: vlak, width: w, height: h });
    const laag = new Konva.Layer({ x: (w - maat.breedte * s) / 2, y: (h - maat.hoogte * s) / 2 });
    const donker = new Konva.Layer({ x: laag.x(), y: laag.y(), listening: false });
    laag.add(new Konva.Image({ image: bron, width: maat.breedte * s, height: maat.hoogte * s }));
    donker.add(new Konva.Rect({ width: maat.breedte * s, height: maat.hoogte * s, fill: 'rgba(0,0,0,0.55)' }));
    gat = new Konva.Rect({ fill: '#000', globalCompositeOperation: 'destination-out' });
    donker.add(gat);
    const ui = new Konva.Layer({ x: laag.x(), y: laag.y() });
    rect = new Konva.Rect({
      stroke: '#FFFFFF', strokeWidth: 3, dash: [10, 6], draggable: true,
      dragBoundFunc(pos) {
        const b = rect.width() * rect.scaleX(), hh = rect.height() * rect.scaleY();
        return {
          x: Math.min(laag.x() + maat.breedte * s - b, Math.max(laag.x(), pos.x)),
          y: Math.min(laag.y() + maat.hoogte * s - hh, Math.max(laag.y(), pos.y)),
        };
      },
    });
    tr = new Konva.Transformer({
      nodes: [rect], rotateEnabled: false, keepRatio: false, flipEnabled: false,
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      anchorSize: 30, anchorCornerRadius: 15, anchorFill: '#FFFFFF', anchorStroke: '#FF6B6B', borderEnabled: false,
      boundBoxFunc(oud, nieuw) {
        const binnen = nieuw.x >= laag.x() - 1 && nieuw.y >= laag.y() - 1 && nieuw.x + nieuw.width <= laag.x() + maat.breedte * s + 1 && nieuw.y + nieuw.height <= laag.y() + maat.hoogte * s + 1;
        return binnen && nieuw.width > 20 && nieuw.height > 20 ? nieuw : oud;
      },
    });
    ui.add(rect, tr);
    stage.add(laag, donker, ui);
    rect.on('dragmove transform', synchroniseer);
    zet(start ?? { x: 0, y: 0, ...maat });
  });

  onDestroy(() => stage?.destroy());
</script>

<div class="scherm" role="dialog" aria-modal="true" aria-label="Foto bijsnijden">
  <div class="balk">
    {#each VERHOUDINGEN as v}
      <button id="verhouding-{v.replace(':', '-')}" class:actief={verhouding === v} onclick={() => kiesVerhouding(v)}>{v === 'vrij' ? 'Vrij' : v}</button>
    {/each}
  </div>
  <div class="vlak" bind:this={vlak}></div>
  <div class="balk">
    <button id="bijsnij-annuleer" onclick={onAnnuleer}><Icon name="x" /> Stop</button>
    <button id="bijsnij-klaar" class="hoofd" onclick={() => onKlaar(huidig())}><Icon name="check" /> Klaar</button>
  </div>
</div>

<style>
  .scherm { position: fixed; inset: 0; z-index: 80; background: #1e1b24; display: grid; grid-template-rows: auto 1fr auto; padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom)); gap: 12px; }
  .balk { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .balk button { padding: 0 20px; }
  .balk button.actief { background: var(--zon); }
  .vlak { min-height: 0; touch-action: none; }
</style>
```

- [ ] **Step 5: Inhaken**

In `src/ui/EditorScherm.svelte`:

Import:
```ts
  import BijsnijDialoog from './BijsnijDialoog.svelte';
  import type { FotoElement, Uitsnede } from '../document/types';
```
(Voeg `FotoElement` en `Uitsnede` toe aan de bestaande type-import uit `../document/types`.)

Script:
```ts
  let bijsnijden = $state<{ id: string; bron: HTMLImageElement; start: Uitsnede | null } | null>(null);

  function openBijsnijden(id: string) {
    const f = editor.get().collage.elementen.find((e) => e.id === id) as FotoElement | undefined;
    const bron = f?.assetId ? assets.image(f.assetId) : undefined;
    if (f && bron) bijsnijden = { id, bron, start: f.uitsnede };
  }

  function klaarBijsnijden(u: Uitsnede) {
    if (!bijsnijden) return;
    const f = editor.get().collage.elementen.find((e) => e.id === bijsnijden!.id) as FotoElement;
    editor.update(f.id, { uitsnede: u, hoogte: Math.round((f.breedte * u.hoogte) / u.breedte) });
    bijsnijden = null;
  }
```

Wijzig de ContextBalk-regel:
```svelte
    {#if geselecteerd}<ContextBalk {editor} el={geselecteerd} onBijsnijden={() => openBijsnijden(geselecteerd!.id)} />{/if}
```

Voeg na het `{#if vraagTerug}`-blok toe:
```svelte
{#if bijsnijden}
  <BijsnijDialoog bron={bijsnijden.bron} start={bijsnijden.start} onKlaar={klaarBijsnijden} onAnnuleer={() => (bijsnijden = null)} />
{/if}
```

In `src/ui/FotoPaneel.svelte`: voeg prop `onBijsnijden: (id: string) => void` toe aan de props-type en destructuring, en zet direct na `{#if foto && foto.assetId}`:
```svelte
  <button id="foto-bijsnijden" class="breed" onclick={() => onBijsnijden(foto.id)}><Icon name="crop" /> Bijsnijden</button>
```
Wijzig in EditorScherm de FotoPaneel-regel:
```svelte
      {#if paneel === 'foto'}<FotoPaneel {editor} {assets} el={geselecteerd} onKiesFoto={kiesFoto} onBijsnijden={openBijsnijden} />{/if}
```

- [ ] **Step 6: e2e-test**

Voeg toe aan `e2e/foto.spec.ts`:
```ts
test('bijsnijden naar vierkant past de uitsnede en hoogte aan', async ({ page }) => {
  await openNieuweCollage(page);
  await page.click('#tool-foto');
  const chooser = page.waitForEvent('filechooser');
  await page.click('#foto-kiezen');
  await (await chooser).setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: await maakPng(page) });
  await page.click('#foto-bijsnijden');
  await page.click('#verhouding-1-1');
  await page.click('#bijsnij-klaar');
  const [f] = await elementen(page);
  expect(f.uitsnede.breedte).toBeCloseTo(f.uitsnede.hoogte, 3);
  expect(f.hoogte).toBe(f.breedte);
});
```

Run: `npx playwright test e2e/foto.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add photo crop dialog with fixed aspect ratios"
```

---
### Task 14: Lettertypes, tekst en tekstinvoer

**Files:**
- Create: `src/assets/fonts.ts`, `src/assets/fonts.test.ts`, `src/elements/tekst.ts`, `src/editor/tekst-acties.ts`, `src/editor/tekst-acties.test.ts`, `src/ui/TekstInvoer.svelte`, `src/ui/TekstPaneel.svelte`, `e2e/tekst.spec.ts`
- Modify: `src/elements/index.ts`, `src/elements/render.test.ts`, `src/ui/EditorScherm.svelte`, `src/main.ts`

**Interfaces:**
- Produces:
  - `LETTERTYPES: { id: string; naam: string; familie: string }[]` (10)
  - `familie(id: string): string`, `fontStijl(el: { vet: boolean; schuin: boolean }): string` (`'normal' | 'bold' | 'italic' | 'italic bold'`)
  - `laadLettertypes(): Promise<void>`
  - `meet(tekst: string, familie: string, grootte: number, stijl?: string): number`
  - `natuurlijkeBreedte(el: Pick<TekstElement, 'tekst' | 'lettertype' | 'grootte' | 'vet' | 'schuin' | 'ballon'>, max: number): number`
  - `tekstKlaar(editor: Editor, id: string | null, tekst: string): void`
  - `tekstStijlPatch(el: TekstElement, patch: Partial<TekstElement>, canvasBreedte: number): Partial<TekstElement>`
  - `renderTekst(el: TekstElement, ctx: RenderCtx): Konva.Group` (roept `renderWordArt` aan als `el.wordart` gezet is; tot Task 15 tekent het altijd gewone tekst)
  - `<TekstInvoer onKlaar(tekst, id) />` met methode `openen(tekst: string, id: string | null): void`
  - DOM-id's: `#tekst-nieuw`, `#tekst-wijzig`, `#tekst-veld`, `#tekst-klaar`, `#tekst-annuleer`, `#font-<id>`, `#tekst-vet`, `#tekst-schuin`, `#tekst-links`, `#tekst-midden`, `#tekst-rechts`, `#tekst-schaduw`, `#ctx-tekst`

- [ ] **Step 1: Lettertypes installeren**

Run:
```bash
npm install @fontsource/baloo-2 @fontsource/fredoka @fontsource/pacifico @fontsource/bangers @fontsource/permanent-marker @fontsource/caveat @fontsource/luckiest-guy @fontsource/chewy @fontsource/sniglet
```

- [ ] **Step 2: Failing tests schrijven**

`src/assets/fonts.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { LETTERTYPES, familie, fontStijl, laadLettertypes, meet } from './fonts';

beforeAll(() => laadLettertypes());

describe('lettertypes', () => {
  it('heeft 10 lettertypes en ze zijn geladen', () => {
    expect(LETTERTYPES).toHaveLength(10);
    for (const l of LETTERTYPES) expect(document.fonts.check(`40px ${l.familie}`), l.id).toBe(true);
  });

  it('familie geeft de CSS-familie, onbekend valt terug op Nunito', () => {
    expect(familie('baloo')).toBe('"Baloo 2"');
    expect(familie('bestaat-niet')).toBe('Nunito');
  });

  it('fontStijl combineert schuin en vet zoals Konva verwacht', () => {
    expect(fontStijl({ vet: false, schuin: false })).toBe('normal');
    expect(fontStijl({ vet: true, schuin: false })).toBe('bold');
    expect(fontStijl({ vet: true, schuin: true })).toBe('italic bold');
  });

  it('meet hangt af van het lettertype en de grootte', () => {
    const a = meet('Hallo wereld', familie('bangers'), 40);
    const b = meet('Hallo wereld', familie('pacifico'), 40);
    expect(a).not.toBeCloseTo(b, 0);
    expect(meet('Hallo', 'Nunito', 80)).toBeCloseTo(meet('Hallo', 'Nunito', 40) * 2, 0);
  });
});
```

`src/editor/tekst-acties.test.ts`:
```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createEditor } from './store';
import { maakTekst, nieuweCollage } from '../document/create';
import { natuurlijkeBreedte, tekstKlaar, tekstStijlPatch } from './tekst-acties';
import { laadLettertypes } from '../assets/fonts';
import type { TekstElement } from '../document/types';

beforeAll(() => laadLettertypes());

describe('tekstKlaar', () => {
  it('nieuwe lege tekst voegt niets toe', () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    tekstKlaar(ed, null, '   ');
    expect(ed.get().collage.elementen).toHaveLength(0);
    expect(ed.get().canUndo).toBe(false);
  });

  it('nieuwe tekst komt in het midden met passende breedte', () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    tekstKlaar(ed, null, 'Hoi');
    const t = ed.get().collage.elementen[0] as TekstElement;
    expect(t).toMatchObject({ type: 'tekst', tekst: 'Hoi', x: 600, y: 600 });
    expect(t.breedte).toBeLessThan(400);
    expect(t.breedte).toBeGreaterThan(50);
  });

  it('bestaande tekst leegmaken verwijdert het element', () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    tekstKlaar(ed, null, 'Hoi');
    const id = ed.get().collage.elementen[0].id;
    tekstKlaar(ed, id, '');
    expect(ed.get().collage.elementen).toHaveLength(0);
  });

  it('bestaande tekst wijzigen past tekst en breedte aan', () => {
    const ed = createEditor(nieuweCollage('vierkant'));
    tekstKlaar(ed, null, 'Hoi');
    const id = ed.get().collage.elementen[0].id;
    const voor = (ed.get().collage.elementen[0] as TekstElement).breedte;
    tekstKlaar(ed, id, 'Hoi allemaal samen');
    const t = ed.get().collage.elementen[0] as TekstElement;
    expect(t.tekst).toBe('Hoi allemaal samen');
    expect(t.breedte).toBeGreaterThan(voor);
  });
});

describe('breedte', () => {
  it('natuurlijkeBreedte respecteert het maximum en de langste regel', () => {
    const t = maakTekst({ x: 0, y: 0, tekst: 'kort\neen veel langere regel hier' });
    const vrij = natuurlijkeBreedte(t, 10_000);
    expect(natuurlijkeBreedte({ ...t, tekst: 'een veel langere regel hier' }, 10_000)).toBeCloseTo(vrij, 0);
    expect(natuurlijkeBreedte(t, 100)).toBe(100);
  });

  it('tekstStijlPatch herberekent de breedte bij grotere letters', () => {
    const t = { ...maakTekst({ x: 0, y: 0, tekst: 'Hallo' }), breedte: 150 };
    const p = tekstStijlPatch(t, { grootte: 144 }, 1200);
    expect(p.grootte).toBe(144);
    expect(p.breedte!).toBeGreaterThan(150);
  });
});
```

Voeg toe aan `src/elements/render.test.ts`:
```ts
import { renderTekst } from './tekst';

describe('renderTekst', () => {
  it('tekst met ballon heeft eerst een rechthoek, offset op de echte hoogte', () => {
    const t = { ...maakTekst({ x: 0, y: 0, tekst: 'Hallo\nwereld', grootte: 50, breedte: 300 }), ballon: '#FFE14D' };
    const g = renderTekst(t, leeg);
    const [rect, text] = g.getChildren();
    expect(rect).toBeInstanceOf(Konva.Rect);
    expect((text as Konva.Text).text()).toBe('Hallo\nwereld');
    expect(g.offsetY()).toBeCloseTo((text as Konva.Text).height() / 2, 3);
  });

  it('vet en schuin worden fontStyle', () => {
    const t = { ...maakTekst({ x: 0, y: 0, tekst: 'A' }), vet: true, schuin: true };
    const text = renderTekst(t, leeg).findOne('Text') as Konva.Text;
    expect(text.fontStyle()).toBe('italic bold');
  });
});
```

- [ ] **Step 3: Run tests — moeten falen**

Run: `npx vitest run src/assets/fonts.test.ts src/editor/tekst-acties.test.ts src/elements/render.test.ts`
Expected: FAIL — `Failed to resolve import "./fonts"`.

- [ ] **Step 4: Implementatie**

`src/assets/fonts.ts`:
```ts
import '@fontsource/baloo-2/400.css';
import '@fontsource/baloo-2/700.css';
import '@fontsource/fredoka/400.css';
import '@fontsource/fredoka/700.css';
import '@fontsource/pacifico/400.css';
import '@fontsource/bangers/400.css';
import '@fontsource/permanent-marker/400.css';
import '@fontsource/caveat/400.css';
import '@fontsource/caveat/700.css';
import '@fontsource/luckiest-guy/400.css';
import '@fontsource/chewy/400.css';
import '@fontsource/sniglet/400.css';
import '@fontsource/sniglet/800.css';

export const LETTERTYPES: { id: string; naam: string; familie: string }[] = [
  { id: 'nunito', naam: 'Nunito', familie: 'Nunito' },
  { id: 'baloo', naam: 'Baloo', familie: '"Baloo 2"' },
  { id: 'fredoka', naam: 'Fredoka', familie: 'Fredoka' },
  { id: 'pacifico', naam: 'Pacifico', familie: 'Pacifico' },
  { id: 'bangers', naam: 'Bangers', familie: 'Bangers' },
  { id: 'marker', naam: 'Stift', familie: '"Permanent Marker"' },
  { id: 'caveat', naam: 'Handschrift', familie: 'Caveat' },
  { id: 'luckiest', naam: 'Luckiest', familie: '"Luckiest Guy"' },
  { id: 'chewy', naam: 'Chewy', familie: 'Chewy' },
  { id: 'sniglet', naam: 'Sniglet', familie: 'Sniglet' },
];

export function familie(id: string): string {
  return LETTERTYPES.find((l) => l.id === id)?.familie ?? 'Nunito';
}

export function fontStijl(el: { vet: boolean; schuin: boolean }): string {
  return [el.schuin && 'italic', el.vet && 'bold'].filter(Boolean).join(' ') || 'normal';
}

export async function laadLettertypes(): Promise<void> {
  await Promise.all(LETTERTYPES.flatMap((l) => ['400', '700'].map((w) => document.fonts.load(`${w} 40px ${l.familie}`).catch(() => []))));
}

let meetCtx: CanvasRenderingContext2D | null = null;

export function meet(tekst: string, fam: string, grootte: number, stijl = 'normal'): number {
  meetCtx ??= document.createElement('canvas').getContext('2d')!;
  meetCtx.font = `${stijl === 'normal' ? '' : stijl + ' '}${grootte}px ${fam}`;
  return meetCtx.measureText(tekst).width;
}
```

`src/editor/tekst-acties.ts`:
```ts
import { familie, fontStijl, meet } from '../assets/fonts';
import { maakTekst } from '../document/create';
import { FORMATEN } from '../document/formats';
import type { TekstElement } from '../document/types';
import type { Editor } from './store';

export function natuurlijkeBreedte(el: Pick<TekstElement, 'tekst' | 'lettertype' | 'grootte' | 'vet' | 'schuin' | 'ballon'>, max: number): number {
  const regels = el.tekst.split('\n');
  const w = Math.max(...regels.map((r) => meet(r || ' ', familie(el.lettertype), el.grootte, fontStijl(el))));
  const pad = el.ballon ? el.grootte : 0;
  return Math.min(max, Math.ceil(w + pad + 4));
}

export function tekstKlaar(editor: Editor, id: string | null, tekst: string): void {
  const schoon = tekst.replace(/\s+$/, '');
  const { collage } = editor.get();
  const f = FORMATEN[collage.formaat];
  const max = f.breedte * 0.8;
  if (!id) {
    if (!schoon.trim()) return;
    const el = maakTekst({ x: f.breedte / 2, y: f.hoogte / 2, tekst: schoon });
    editor.add({ ...el, breedte: natuurlijkeBreedte(el, max) });
    return;
  }
  const el = collage.elementen.find((e) => e.id === id);
  if (!el || el.type !== 'tekst') return;
  if (!schoon.trim()) { editor.remove(id); return; }
  editor.update(id, { tekst: schoon, breedte: natuurlijkeBreedte({ ...el, tekst: schoon }, max) });
}

export function tekstStijlPatch(el: TekstElement, patch: Partial<TekstElement>, canvasBreedte: number): Partial<TekstElement> {
  return { ...patch, breedte: natuurlijkeBreedte({ ...el, ...patch }, canvasBreedte * 0.8) };
}
```

`src/elements/tekst.ts`:
```ts
import Konva from 'konva';
import type { TekstElement } from '../document/types';
import { familie, fontStijl } from '../assets/fonts';
import { baseGroup, type RenderCtx } from './base';

export function renderTekst(el: TekstElement, _ctx: RenderCtx): Konva.Group {
  const t = new Konva.Text({
    text: el.tekst,
    fontFamily: familie(el.lettertype),
    fontSize: el.grootte,
    fontStyle: fontStijl(el),
    fill: el.kleur,
    align: el.uitlijning,
    lineHeight: el.regelafstand,
    width: el.breedte,
    padding: el.ballon ? el.grootte * 0.5 : 0,
    stroke: el.omlijning?.kleur,
    strokeWidth: el.omlijning?.dikte ?? 0,
    fillAfterStrokeEnabled: true,
    lineJoin: 'round',
    shadowEnabled: el.schaduw,
    shadowColor: 'rgba(0,0,0,0.35)',
    shadowBlur: el.grootte * 0.12,
    shadowOffset: { x: el.grootte * 0.06, y: el.grootte * 0.08 },
  });
  const g = baseGroup({ ...el, hoogte: t.height() });
  if (el.ballon) {
    g.add(new Konva.Rect({ width: el.breedte, height: t.height(), fill: el.ballon, cornerRadius: el.grootte * 0.6, shadowColor: 'rgba(0,0,0,0.15)', shadowBlur: 10, shadowOffset: { x: 0, y: 3 } }));
  }
  g.add(t);
  return g;
}
```

In `src/elements/index.ts`: `import { renderTekst } from './tekst';` en `tekst: renderTekst as Renderer,` in `RENDERERS`.

In `src/main.ts`, voeg toe na de Nunito-imports:
```ts
import { laadLettertypes } from './assets/fonts';
void laadLettertypes();
```

- [ ] **Step 5: Run tests — moeten slagen**

Run: `npx vitest run src/assets src/editor src/elements`
Expected: PASS.

- [ ] **Step 6: Tekstinvoer en paneel**

`src/ui/TekstInvoer.svelte`:
```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  let { onKlaar }: { onKlaar: (tekst: string, id: string | null) => void } = $props();
  let open = $state(false);
  let doelId: string | null = null;
  let veld: HTMLTextAreaElement;

  // Moet synchroon vanuit een tik worden aangeroepen: iPad opent het toetsenbord alleen dan.
  export function openen(tekst: string, id: string | null): void {
    doelId = id;
    veld.value = tekst;
    open = true;
    veld.focus();
  }

  function klaar() { open = false; veld.blur(); onKlaar(veld.value, doelId); }
  function annuleer() { open = false; veld.blur(); }
</script>

<div class="tekst-invoer" class:open aria-hidden={!open}>
  <textarea id="tekst-veld" bind:this={veld} rows="2" placeholder="Typ hier je tekst" enterkeyhint="done"
    onkeydown={(e) => { if (e.key === 'Escape') annuleer(); }}></textarea>
  <button id="tekst-annuleer" aria-label="Stop" onclick={annuleer}><Icon name="x" /></button>
  <button id="tekst-klaar" class="hoofd" onclick={klaar}><Icon name="check" /> Klaar</button>
</div>

<style>
  .tekst-invoer { position: fixed; left: 0; right: 0; top: 0; z-index: 70; display: flex; gap: 10px; align-items: center; padding: max(10px, env(safe-area-inset-top)) 12px 10px; background: var(--paneel); box-shadow: var(--schaduw); transform: translateY(-120%); transition: transform 0.2s ease; }
  .tekst-invoer.open { transform: translateY(0); }
  textarea { flex: 1; font-size: 24px; border: 3px solid var(--rand); border-radius: 16px; padding: 10px 14px; resize: none; user-select: text; -webkit-user-select: text; }
</style>
```

`src/ui/TekstPaneel.svelte`:
```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  import KleurPalet from './KleurPalet.svelte';
  import Schuif from './Schuif.svelte';
  import { LETTERTYPES } from '../assets/fonts';
  import { FORMATEN } from '../document/formats';
  import type { Element, TekstElement } from '../document/types';
  import type { Editor } from '../editor/store';
  import { tekstStijlPatch } from '../editor/tekst-acties';

  let { editor, el, onNieuw, onWijzig }: { editor: Editor; el: Element | null; onNieuw: () => void; onWijzig: (id: string) => void } = $props();
  const tekst = $derived(el?.type === 'tekst' ? el : null);

  function zet(patch: Partial<TekstElement>) {
    if (!tekst) return;
    editor.update(tekst.id, tekstStijlPatch(tekst, patch, FORMATEN[editor.get().collage.formaat].breedte));
  }
</script>

<h2>Tekst</h2>
<button id="tekst-nieuw" class="hoofd breed" onclick={onNieuw}><Icon name="plus" /> Nieuwe tekst</button>

{#if tekst}
  <button id="tekst-wijzig" class="breed" onclick={() => onWijzig(tekst.id)}><Icon name="pencil" /> Tekst wijzigen</button>
  <h3>Letters</h3>
  <div class="fonts">
    {#each LETTERTYPES as l}
      <button id="font-{l.id}" class:actief={tekst.lettertype === l.id} style:font-family={l.familie} onclick={() => zet({ lettertype: l.id })}>{l.naam}</button>
    {/each}
  </div>
  <Schuif label="Grootte" min={16} max={300} waarde={tekst.grootte} onWijzig={(v) => zet({ grootte: v })} />
  <div class="rij">
    <button id="tekst-vet" aria-label="Vet" aria-pressed={tekst.vet} class:actief={tekst.vet} onclick={() => zet({ vet: !tekst.vet })}><Icon name="text-b" /></button>
    <button id="tekst-schuin" aria-label="Schuin" aria-pressed={tekst.schuin} class:actief={tekst.schuin} onclick={() => zet({ schuin: !tekst.schuin })}><Icon name="text-italic" /></button>
    <button id="tekst-links" aria-label="Links" class:actief={tekst.uitlijning === 'left'} onclick={() => zet({ uitlijning: 'left' })}><Icon name="text-align-left" /></button>
    <button id="tekst-midden" aria-label="Midden" class:actief={tekst.uitlijning === 'center'} onclick={() => zet({ uitlijning: 'center' })}><Icon name="text-align-center" /></button>
    <button id="tekst-rechts" aria-label="Rechts" class:actief={tekst.uitlijning === 'right'} onclick={() => zet({ uitlijning: 'right' })}><Icon name="text-align-right" /></button>
  </div>
  <h3>Kleur</h3>
  <KleurPalet waarde={tekst.kleur} onKies={(k) => k && zet({ kleur: k })} />
  <h3>Rand</h3>
  <KleurPalet waarde={tekst.omlijning?.kleur ?? null} metGeen onKies={(k) => zet({ omlijning: k ? { kleur: k, dikte: tekst.omlijning?.dikte ?? Math.max(2, Math.round(tekst.grootte / 15)) } : null })} />
  <Schuif label="Regelafstand" min={0.8} max={2} stap={0.1} waarde={tekst.regelafstand} onWijzig={(v) => zet({ regelafstand: v })} />
  <button id="tekst-schaduw" class="breed" aria-pressed={tekst.schaduw} class:actief={tekst.schaduw} onclick={() => zet({ schaduw: !tekst.schaduw })}>Schaduw</button>
  <h3>Ballon</h3>
  <KleurPalet waarde={tekst.ballon} metGeen onKies={(k) => zet({ ballon: k })} />
  <!-- wordart-opties -->
{/if}

<style>
  .breed { width: 100%; margin-bottom: 10px; }
  .fonts { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 16px; }
  .fonts button, .rij button, #tekst-schaduw { background: var(--creme); font-size: 1.1rem; }
  .rij { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
  .actief { background: var(--zon) !important; }
</style>
```

In `src/ui/EditorScherm.svelte`:

Imports:
```ts
  import TekstPaneel from './TekstPaneel.svelte';
  import TekstInvoer from './TekstInvoer.svelte';
  import { tekstKlaar } from '../editor/tekst-acties';
  import { laadLettertypes } from '../assets/fonts';
```

Script:
```ts
  let tekstInvoer: { openen(tekst: string, id: string | null): void };

  function wijzigTekst(id: string) {
    const el = editor.get().collage.elementen.find((e) => e.id === id);
    if (el?.type === 'tekst') tekstInvoer.openen(el.tekst, id);
  }
```

In `onMount`, wijzig de eerste regel naar:
```ts
    await Promise.all([assets.preload(editor.get().collage), laadLettertypes()]);
```

ContextBalk-regel:
```svelte
    {#if geselecteerd}<ContextBalk {editor} el={geselecteerd} onTekst={() => wijzigTekst(geselecteerd!.id)} onBijsnijden={() => openBijsnijden(geselecteerd!.id)} />{/if}
```

Vervang `<!-- panelen -->` door:
```svelte
      {#if paneel === 'tekst'}<TekstPaneel {editor} el={geselecteerd} onNieuw={() => tekstInvoer.openen('', null)} onWijzig={wijzigTekst} />{/if}
      <!-- panelen -->
```

Voeg toe na `{#if bijsnijden}...{/if}`:
```svelte
<TekstInvoer bind:this={tekstInvoer} onKlaar={(t, id) => tekstKlaar(editor, id, t)} />
```

- [ ] **Step 7: e2e-test**

`e2e/tekst.spec.ts`:
```ts
import { test, expect, openNieuweCollage, elementen } from './helpers';

test('tekst toevoegen, opmaken en leegmaken', async ({ page }) => {
  await openNieuweCollage(page);
  await page.click('#tool-tekst');
  await page.click('#tekst-nieuw');
  await page.fill('#tekst-veld', 'Hallo');
  await page.click('#tekst-klaar');
  let els = await elementen(page);
  expect(els).toHaveLength(1);
  expect(els[0]).toMatchObject({ type: 'tekst', tekst: 'Hallo' });

  await page.click('#font-bangers');
  await page.click('#tekst-vet');
  els = await elementen(page);
  expect(els[0]).toMatchObject({ lettertype: 'bangers', vet: true });

  await page.click('#ctx-tekst');
  await page.fill('#tekst-veld', '');
  await page.click('#tekst-klaar');
  expect(await elementen(page)).toHaveLength(0);
});
```

Run: `npx playwright test e2e/tekst.spec.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add bundled kid-friendly fonts, text elements and text input bar"
```

---

### Task 15: WordArt

**Files:**
- Create: `src/elements/wordart-layout.ts`, `src/elements/wordart-layout.test.ts`, `src/elements/wordart.ts`, `src/assets/wordart-presets.ts`, `src/assets/wordart-presets.test.ts`
- Modify: `src/elements/tekst.ts`, `src/elements/render.test.ts`, `src/ui/TekstPaneel.svelte`, `e2e/tekst.spec.ts`

**Interfaces:**
- Produces:
  - `interface LetterPos { x: number; y: number; rotatie: number }`
  - `legLetters(breedtes: number[], vorm: WordArtVorm, grootte: number): { posities: LetterPos[]; breedte: number; hoogte: number }` — posities zijn letter-middelpunten binnen een kader van `breedte × hoogte`
  - `REGENBOOG: string[]`, `mengKleur(a: string, b: string, t: number): string`, `letterKleur(v: WordArt['vulling'], i: number, n: number): string`
  - `renderWordArt(el: TekstElement): Konva.Group`
  - `WORDART_PRESETS: { id: string; naam: string; wordart: WordArt }[]` (12), `wordartPreset(id: string): WordArt` (diepe kopie; gooit bij onbekend id)
  - `wordartVoorbeeld(id: string): string` (data-URL, gecachet)
  - DOM-id's: `#wordart-<id>`, `#wordart-geen`, `#wordart-vorm-<vorm>`

- [ ] **Step 1: Failing tests schrijven**

`src/elements/wordart-layout.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { legLetters, letterKleur, mengKleur, REGENBOOG } from './wordart-layout';

const vijf = [40, 40, 40, 40, 40];

describe('legLetters', () => {
  it('recht: oplopende x, gelijke y, geen rotatie, alles binnen het kader', () => {
    const r = legLetters(vijf, 'recht', 50);
    for (let i = 1; i < 5; i++) expect(r.posities[i].x).toBeGreaterThan(r.posities[i - 1].x);
    expect(new Set(r.posities.map((p) => p.y)).size).toBe(1);
    expect(r.posities.every((p) => p.rotatie === 0)).toBe(true);
    for (const p of r.posities) { expect(p.x).toBeGreaterThan(0); expect(p.x).toBeLessThan(r.breedte); }
  });

  it('boog-omhoog: middelste letter het hoogst en recht', () => {
    const r = legLetters(vijf, 'boog-omhoog', 50);
    const ys = r.posities.map((p) => p.y);
    expect(Math.min(...ys)).toBe(ys[2]);
    expect(r.posities[2].rotatie).toBeCloseTo(0, 5);
    expect(r.posities[0].rotatie).toBeLessThan(0);
    expect(r.posities[4].rotatie).toBeGreaterThan(0);
  });

  it('boog-omlaag: middelste letter het laagst, volgorde links naar rechts', () => {
    const r = legLetters(vijf, 'boog-omlaag', 50);
    const ys = r.posities.map((p) => p.y);
    expect(Math.max(...ys)).toBe(ys[2]);
    expect(r.posities[0].x).toBeLessThan(r.posities[4].x);
  });

  it('cirkel: letters liggen op een cirkel rond het midden', () => {
    const r = legLetters(Array(12).fill(40), 'cirkel', 50);
    const cx = r.breedte / 2, cy = r.hoogte / 2;
    const afstanden = r.posities.map((p) => Math.hypot(p.x - cx, p.y - cy));
    for (const a of afstanden) expect(a).toBeCloseTo(afstanden[0], 0);
  });

  it('golf: sommige letters kantelen', () => {
    const r = legLetters(Array(10).fill(40), 'golf', 50);
    expect(r.posities.some((p) => Math.abs(p.rotatie) > 5)).toBe(true);
  });

  it('lege tekst geeft een leeg kader zonder fouten', () => {
    const r = legLetters([], 'boog-omhoog', 50);
    expect(r.posities).toEqual([]);
    expect(r.breedte).toBeGreaterThan(0);
  });
});

describe('kleuren', () => {
  it('mengKleur mengt lineair', () => {
    expect(mengKleur('#000000', '#FFFFFF', 0.5)).toBe('#808080');
    expect(mengKleur('#FF0000', '#0000FF', 0)).toBe('#FF0000');
  });

  it('letterKleur per soort', () => {
    expect(letterKleur({ soort: 'kleur', kleuren: ['#123456'] }, 3, 5)).toBe('#123456');
    expect(letterKleur({ soort: 'regenboog', kleuren: [] }, 1, 5)).toBe(REGENBOOG[1]);
    expect(letterKleur({ soort: 'verloop', kleuren: ['#000000', '#FFFFFF'] }, 4, 5)).toBe('#FFFFFF');
    expect(letterKleur({ soort: 'verloop', kleuren: ['#000000', '#FFFFFF'] }, 0, 1)).toBe('#000000');
  });
});
```

`src/assets/wordart-presets.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { WORDART_PRESETS, wordartPreset } from './wordart-presets';

describe('WordArt-voorinstellingen', () => {
  it('heeft 12 unieke voorinstellingen', () => {
    expect(WORDART_PRESETS).toHaveLength(12);
    expect(new Set(WORDART_PRESETS.map((p) => p.id)).size).toBe(12);
  });

  it('wordartPreset geeft een kopie', () => {
    const a = wordartPreset('regenboog');
    a.vorm = 'cirkel';
    expect(wordartPreset('regenboog').vorm).toBe('recht');
  });

  it('onbekende voorinstelling geeft een fout', () => {
    expect(() => wordartPreset('bestaat-niet')).toThrow();
  });
});
```

Voeg toe aan `src/elements/render.test.ts`:
```ts
import { wordartPreset } from '../assets/wordart-presets';

describe('renderWordArt', () => {
  it('tekent één Text per letter (spaties overgeslagen) plus een raakvlak', () => {
    const t = { ...maakTekst({ x: 0, y: 0, tekst: 'Hoi jij' }), wordart: wordartPreset('regenboog') };
    const g = renderTekst(t, leeg);
    expect(g.find('Text')).toHaveLength(6);
    expect(g.findOne('.raakvlak')).toBeDefined();
  });

  it('3d tekent extra lagen onder elke letter', () => {
    const t = { ...maakTekst({ x: 0, y: 0, tekst: 'AB' }), wordart: wordartPreset('3d') };
    expect(renderTekst(t, leeg).find('Text').length).toBeGreaterThan(2 * 5);
  });
});
```

- [ ] **Step 2: Run tests — moeten falen**

Run: `npx vitest run src/elements src/assets/wordart-presets.test.ts`
Expected: FAIL — `Failed to resolve import "./wordart-layout"`.

- [ ] **Step 3: Implementatie layout en kleuren**

`src/elements/wordart-layout.ts`:
```ts
import type { WordArt, WordArtVorm } from '../document/types';

export interface LetterPos { x: number; y: number; rotatie: number }

export const REGENBOOG = ['#FF5A5F', '#FF9F1C', '#FFD23F', '#3BB273', '#3A86FF', '#8338EC', '#FF4FD8'];

const graden = (r: number) => (r * 180) / Math.PI;

export function legLetters(breedtes: number[], vorm: WordArtVorm, grootte: number): { posities: LetterPos[]; breedte: number; hoogte: number } {
  const totaal = breedtes.reduce((a, b) => a + b, 0);
  const midden: number[] = [];
  let acc = 0;
  for (const b of breedtes) { midden.push(acc + b / 2); acc += b; }

  let ruw: LetterPos[];
  switch (vorm) {
    case 'recht':
      ruw = midden.map((m) => ({ x: m, y: 0, rotatie: 0 }));
      break;
    case 'golf': {
      const amp = grootte * 0.35, golf = grootte * 4, k = (2 * Math.PI) / golf;
      ruw = midden.map((m) => ({ x: m, y: amp * Math.sin(k * m), rotatie: graden(Math.atan(amp * k * Math.cos(k * m))) }));
      break;
    }
    case 'boog-omhoog':
    case 'cirkel': {
      const R = vorm === 'cirkel' ? Math.max(grootte * 0.8, (totaal / (2 * Math.PI)) * 1.08) : Math.max(grootte * 2, totaal / (Math.PI * 0.6));
      const theta = totaal / R;
      ruw = midden.map((m) => {
        const a = -Math.PI / 2 - theta / 2 + m / R;
        return { x: R * Math.cos(a), y: R * Math.sin(a), rotatie: graden(a) + 90 };
      });
      break;
    }
    case 'boog-omlaag': {
      const R = Math.max(grootte * 2, totaal / (Math.PI * 0.6));
      const theta = totaal / R;
      ruw = midden.map((m) => {
        const a = Math.PI / 2 + theta / 2 - m / R;
        return { x: R * Math.cos(a), y: R * Math.sin(a), rotatie: graden(a) - 90 };
      });
      break;
    }
  }

  const pad = grootte * 0.7;
  if (!ruw.length) return { posities: [], breedte: pad * 2, hoogte: pad * 2 };
  const minX = Math.min(...ruw.map((p) => p.x)) - pad, maxX = Math.max(...ruw.map((p) => p.x)) + pad;
  const minY = Math.min(...ruw.map((p) => p.y)) - pad, maxY = Math.max(...ruw.map((p) => p.y)) + pad;
  return {
    posities: ruw.map((p) => ({ x: p.x - minX, y: p.y - minY, rotatie: p.rotatie })),
    breedte: maxX - minX,
    hoogte: maxY - minY,
  };
}

const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0').toUpperCase();

export function mengKleur(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => hex(v + (pb[i] - v) * t)).join('');
}

export function letterKleur(v: WordArt['vulling'], i: number, n: number): string {
  switch (v.soort) {
    case 'kleur': return v.kleuren[0] ?? '#2D2A32';
    case 'regenboog': { const k = v.kleuren.length ? v.kleuren : REGENBOOG; return k[i % k.length]; }
    case 'verloop': return mengKleur(v.kleuren[0] ?? '#2D2A32', v.kleuren[1] ?? v.kleuren[0] ?? '#2D2A32', n <= 1 ? 0 : i / (n - 1));
  }
}
```

`src/assets/wordart-presets.ts`:
```ts
import type { WordArt } from '../document/types';

const wa = (w: Partial<WordArt> & Pick<WordArt, 'vorm' | 'vulling'>): WordArt => ({ omlijning: null, tweedeOmlijning: null, effect: 'geen', ...w });

export const WORDART_PRESETS: { id: string; naam: string; wordart: WordArt }[] = [
  { id: 'boog-zon', naam: 'Zonneboog', wordart: wa({ vorm: 'boog-omhoog', vulling: { soort: 'verloop', kleuren: ['#FFC94D', '#FF6B6B'] }, omlijning: { kleur: '#2D2A32', dikte: 4 } }) },
  { id: 'boog-zee', naam: 'Zeeboog', wordart: wa({ vorm: 'boog-omlaag', vulling: { soort: 'verloop', kleuren: ['#4ECDC4', '#5AA9F2'] }, omlijning: { kleur: '#FFFFFF', dikte: 4 } }) },
  { id: 'cirkel', naam: 'Rondje', wordart: wa({ vorm: 'cirkel', vulling: { soort: 'kleur', kleuren: ['#A78BFA'] }, omlijning: { kleur: '#FFFFFF', dikte: 3 } }) },
  { id: 'golf', naam: 'Golf', wordart: wa({ vorm: 'golf', vulling: { soort: 'regenboog', kleuren: [] }, omlijning: { kleur: '#2D2A32', dikte: 3 } }) },
  { id: 'regenboog', naam: 'Regenboog', wordart: wa({ vorm: 'recht', vulling: { soort: 'regenboog', kleuren: [] }, omlijning: { kleur: '#2D2A32', dikte: 3 } }) },
  { id: 'zon', naam: 'Zon', wordart: wa({ vorm: 'recht', vulling: { soort: 'verloop', kleuren: ['#FFE066', '#FF8C42'] }, omlijning: { kleur: '#7A3E00', dikte: 4 } }) },
  { id: 'zee', naam: 'Zee', wordart: wa({ vorm: 'recht', vulling: { soort: 'verloop', kleuren: ['#A0E7FF', '#2F6FDB'] }, omlijning: { kleur: '#FFFFFF', dikte: 4 } }) },
  { id: '3d', naam: '3D', wordart: wa({ vorm: 'recht', vulling: { soort: 'kleur', kleuren: ['#FF6B6B'] }, effect: '3d' }) },
  { id: 'neon-roze', naam: 'Neon roze', wordart: wa({ vorm: 'recht', vulling: { soort: 'kleur', kleuren: ['#FF4FD8'] }, effect: 'neon' }) },
  { id: 'neon-blauw', naam: 'Neon blauw', wordart: wa({ vorm: 'recht', vulling: { soort: 'kleur', kleuren: ['#38E1FF'] }, effect: 'neon' }) },
  { id: 'dubbel', naam: 'Dubbel', wordart: wa({ vorm: 'recht', vulling: { soort: 'kleur', kleuren: ['#FFC94D'] }, omlijning: { kleur: '#2D2A32', dikte: 4 }, tweedeOmlijning: { kleur: '#FFFFFF', dikte: 6 } }) },
  { id: 'strip', naam: 'Strip', wordart: wa({ vorm: 'recht', vulling: { soort: 'kleur', kleuren: ['#FFE14D'] }, omlijning: { kleur: '#2D2A32', dikte: 6 }, effect: 'schaduw' }) },
];

export function wordartPreset(id: string): WordArt {
  const p = WORDART_PRESETS.find((x) => x.id === id);
  if (!p) throw new Error(`Onbekende WordArt: ${id}`);
  return structuredClone(p.wordart);
}
```

- [ ] **Step 4: Renderer**

`src/elements/wordart.ts`:
```ts
import Konva from 'konva';
import type { TekstElement } from '../document/types';
import { familie, fontStijl, meet } from '../assets/fonts';
import { baseGroup } from './base';
import { legLetters, letterKleur, mengKleur } from './wordart-layout';
import { wordartPreset } from '../assets/wordart-presets';
import { maakTekst } from '../document/create';

export function renderWordArt(el: TekstElement): Konva.Group {
  const wa = el.wordart!;
  const fam = familie(el.lettertype);
  const stijl = fontStijl(el);
  const letters = [...el.tekst.replace(/\n/g, ' ')];
  const breedtes = letters.map((ch) => meet(ch, fam, el.grootte, stijl));
  const { posities, breedte, hoogte } = legLetters(breedtes, wa.vorm, el.grootte);
  const g = baseGroup({ ...el, breedte, hoogte });
  g.add(new Konva.Rect({ name: 'raakvlak', width: breedte, height: hoogte, fill: 'rgba(0,0,0,0)' }));
  const zichtbaar = letters.filter((c) => c.trim()).length;
  let k = 0;
  const diepte = el.grootte * 0.025;
  letters.forEach((ch, i) => {
    if (!ch.trim()) return;
    const p = posities[i];
    const kleur = letterKleur(wa.vulling, k++, zichtbaar);
    const basis = { text: ch, fontFamily: fam, fontSize: el.grootte, fontStyle: stijl, x: p.x, y: p.y, rotation: p.rotatie, offsetX: breedtes[i] / 2, offsetY: el.grootte / 2, lineJoin: 'round' as const, listening: false };
    if (wa.effect === '3d') {
      for (let l = 6; l >= 1; l--) g.add(new Konva.Text({ ...basis, x: p.x + l * diepte, y: p.y + l * diepte, fill: mengKleur(kleur, '#000000', 0.45) }));
    }
    if (wa.tweedeOmlijning) {
      g.add(new Konva.Text({ ...basis, fill: wa.tweedeOmlijning.kleur, stroke: wa.tweedeOmlijning.kleur, strokeWidth: (wa.omlijning?.dikte ?? 0) * 2 + wa.tweedeOmlijning.dikte * 2 }));
    }
    const neon = wa.effect === 'neon';
    g.add(new Konva.Text({
      ...basis,
      fill: kleur,
      stroke: wa.omlijning?.kleur,
      strokeWidth: wa.omlijning?.dikte ?? 0,
      fillAfterStrokeEnabled: true,
      shadowEnabled: neon || wa.effect === 'schaduw',
      shadowColor: neon ? kleur : 'rgba(0,0,0,0.45)',
      shadowBlur: neon ? el.grootte * 0.35 : el.grootte * 0.08,
      shadowOffset: neon ? { x: 0, y: 0 } : { x: el.grootte * 0.07, y: el.grootte * 0.09 },
    }));
  });
  return g;
}

const voorbeeldCache = new Map<string, string>();

export function wordartVoorbeeld(id: string): string {
  const klaar = voorbeeldCache.get(id);
  if (klaar) return klaar;
  const el = { ...maakTekst({ x: 0, y: 0, tekst: 'Abc', grootte: 48, lettertype: 'luckiest' }), wordart: wordartPreset(id) };
  const g = renderWordArt(el);
  const r = g.getClientRect();
  const s = Math.min(150 / r.width, 70 / r.height);
  const div = document.createElement('div');
  const stage = new Konva.Stage({ container: div, width: 160, height: 80 });
  const laag = new Konva.Layer();
  g.setAttrs({ x: 80, y: 40, scaleX: s, scaleY: s, rotation: 0 });
  laag.add(g);
  stage.add(laag);
  const url = stage.toDataURL({ pixelRatio: 2 });
  stage.destroy();
  voorbeeldCache.set(id, url);
  return url;
}
```

In `src/elements/tekst.ts`, voeg bovenaan in `renderTekst` toe:
```ts
  if (el.wordart) return renderWordArt(el);
```
en importeer `import { renderWordArt } from './wordart';`.

- [ ] **Step 5: Run tests — moeten slagen**

Run: `npx vitest run src/elements src/assets`
Expected: PASS.

- [ ] **Step 6: WordArt in het tekstpaneel**

In `src/ui/TekstPaneel.svelte`, voeg imports toe:
```ts
  import { WORDART_PRESETS, wordartPreset } from '../assets/wordart-presets';
  import { wordartVoorbeeld } from '../elements/wordart';
  import type { WordArt, WordArtVorm } from '../document/types';
```
Voeg toe aan het script:
```ts
  const VORMEN: { vorm: WordArtVorm; naam: string }[] = [
    { vorm: 'recht', naam: 'Recht' }, { vorm: 'boog-omhoog', naam: 'Boog' }, { vorm: 'boog-omlaag', naam: 'Lach' },
    { vorm: 'cirkel', naam: 'Rond' }, { vorm: 'golf', naam: 'Golf' },
  ];
  function zetWordArt(patch: Partial<WordArt>) {
    if (tekst?.wordart) zet({ wordart: { ...tekst.wordart, ...patch } });
  }
```
Vervang `<!-- wordart-opties -->` door:
```svelte
  <h3>WordArt</h3>
  <div class="wordart">
    <button id="wordart-geen" class:actief={!tekst.wordart} onclick={() => zet({ wordart: null })}>Geen</button>
    {#each WORDART_PRESETS as p}
      <button id="wordart-{p.id}" aria-label={p.naam} onclick={() => zet({ wordart: wordartPreset(p.id) })}>
        <img src={wordartVoorbeeld(p.id)} alt="" />
      </button>
    {/each}
  </div>
  {#if tekst.wordart}
    <h3>Vorm</h3>
    <div class="rij">
      {#each VORMEN as v}
        <button id="wordart-vorm-{v.vorm}" class:actief={tekst.wordart.vorm === v.vorm} onclick={() => zetWordArt({ vorm: v.vorm })}>{v.naam}</button>
      {/each}
    </div>
    <h3>Letterkleur</h3>
    <KleurPalet waarde={tekst.wordart.vulling.kleuren[0] ?? null} onKies={(k) => k && zetWordArt({ vulling: { soort: tekst.wordart!.vulling.soort === 'regenboog' ? 'kleur' : tekst.wordart!.vulling.soort, kleuren: [k, ...tekst.wordart!.vulling.kleuren.slice(1)] } })} />
    {#if tekst.wordart.vulling.soort === 'verloop'}
      <h3>Tweede kleur</h3>
      <KleurPalet waarde={tekst.wordart.vulling.kleuren[1] ?? null} onKies={(k) => k && zetWordArt({ vulling: { soort: 'verloop', kleuren: [tekst.wordart!.vulling.kleuren[0], k] } })} />
    {/if}
  {/if}
```
Voeg CSS toe:
```css
  .wordart { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
  .wordart button { background: var(--creme); padding: 4px; min-height: 64px; }
  .wordart img { width: 100%; height: auto; }
```

Voeg toe aan `e2e/tekst.spec.ts`:
```ts
test('WordArt kiezen en vorm wijzigen', async ({ page }) => {
  await openNieuweCollage(page);
  await page.click('#tool-tekst');
  await page.click('#tekst-nieuw');
  await page.fill('#tekst-veld', 'Super');
  await page.click('#tekst-klaar');
  await page.click('#wordart-regenboog');
  await page.click('#wordart-vorm-boog-omhoog');
  const [t] = await elementen(page);
  expect(t.wordart.vulling.soort).toBe('regenboog');
  expect(t.wordart.vorm).toBe('boog-omhoog');
  await page.click('#wordart-geen');
  expect((await elementen(page))[0].wordart).toBeNull();
});
```

Run: `npx playwright test e2e/tekst.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add WordArt with curved layouts, gradients, rainbow, 3D and neon presets"
```

---

### Task 16: Tekenen met pen, stift, krijt en gum

**Files:**
- Create: `src/elements/tekening.ts`, `src/document/streek.test.ts`, `src/ui/TekenPaneel.svelte`, `e2e/tekenen.spec.ts`
- Modify: `src/document/create.ts`, `src/elements/index.ts`, `src/elements/render.test.ts`, `src/editor/canvas.ts`, `src/ui/EditorScherm.svelte`

**Interfaces:**
- Produces:
  - `normaliseerStreek(punten: number[], dikte: number): { x: number; y: number; breedte: number; hoogte: number; punten: number[] }` (in `create.ts`; `x`/`y` = middelpunt, punten relatief t.o.v. linkerbovenhoek)
  - `maakTekening(punten: number[], gereedschap: TekenGereedschap, kleur: string, dikte: number): TekeningElement` (in `create.ts`)
  - `penStijl(gereedschap: TekenGereedschap, dikte: number): Partial<LineConfig>`
  - `renderTekening(el: TekeningElement): Konva.Group`
  - `type Gereedschap = 'selecteer' | 'teken' | 'gum'`
  - `CanvasController.setGereedschap(g: Gereedschap, pen?: Partial<{ gereedschap: TekenGereedschap; kleur: string; dikte: number }>): void`
  - DOM-id's: `#pen-pen`, `#pen-stift`, `#pen-krijt`, `#pen-gum`, `#dikte-klein`, `#dikte-middel`, `#dikte-groot`

- [ ] **Step 1: Failing tests schrijven**

`src/document/streek.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { maakTekening, normaliseerStreek } from './create';

describe('normaliseerStreek', () => {
  it('berekent middelpunt en kader inclusief halve dikte', () => {
    const r = normaliseerStreek([100, 100, 200, 150], 10);
    expect(r).toEqual({ x: 150, y: 125, breedte: 110, hoogte: 60, punten: [5, 5, 105, 55] });
  });

  it('een tik (één punt) wordt een stip', () => {
    const r = normaliseerStreek([50, 50], 20);
    expect(r.punten).toHaveLength(4);
    expect(r.breedte).toBeGreaterThanOrEqual(20);
  });
});

describe('maakTekening', () => {
  it('maakt een tekening-element met genormaliseerde punten', () => {
    const t = maakTekening([0, 0, 10, 10], 'krijt', '#FF0000', 8);
    expect(t).toMatchObject({ type: 'tekening', gereedschap: 'krijt', kleur: '#FF0000', dikte: 8, x: 5, y: 5 });
  });
});
```

Voeg toe aan `src/elements/render.test.ts`:
```ts
import { maakTekening } from '../document/create';

describe('renderTekening', () => {
  it('tekent een lijn met brede raakzone', () => {
    const t = maakTekening([0, 0, 100, 50], 'pen', '#000000', 6);
    const line = renderElement(t, leeg).findOne('Line') as Konva.Line;
    expect(line.points()).toEqual(t.punten);
    expect(line.hitStrokeWidth()).toBeGreaterThanOrEqual(30);
  });
});
```

Voeg toe aan `src/editor/canvas.test.ts`:
```ts
  it('tekenmodus: elementen niet versleepbaar en selectie gewist', () => {
    const { editor, ctrl } = opzet();
    const v = maakVorm({ x: 100, y: 100, vorm: 'rechthoek', breedte: 50, hoogte: 50 });
    editor.add(v);
    ctrl.setGereedschap('teken');
    expect(editor.get().selectedId).toBeNull();
    expect(ctrl.group(v.id)!.draggable()).toBe(false);
    editor.update(v.id, { x: 200 });
    expect(ctrl.group(v.id)!.draggable()).toBe(false);
    ctrl.setGereedschap('selecteer');
    expect(ctrl.group(v.id)!.draggable()).toBe(true);
  });
```

- [ ] **Step 2: Run tests — moeten falen**

Run: `npx vitest run src/document src/elements src/editor/canvas.test.ts`
Expected: FAIL — `normaliseerStreek is not exported`.

- [ ] **Step 3: Implementatie**

Voeg toe aan `src/document/create.ts` (en importeer `TekenGereedschap`, `TekeningElement` uit `./types`):
```ts
export function normaliseerStreek(punten: number[], dikte: number): { x: number; y: number; breedte: number; hoogte: number; punten: number[] } {
  const p = punten.length === 2 ? [punten[0], punten[1], punten[0] + 0.5, punten[1] + 0.5] : punten;
  const xs = p.filter((_, i) => i % 2 === 0), ys = p.filter((_, i) => i % 2 === 1);
  const half = dikte / 2;
  const minX = Math.min(...xs) - half, minY = Math.min(...ys) - half;
  const breedte = Math.max(...xs) + half - minX, hoogte = Math.max(...ys) + half - minY;
  return { x: minX + breedte / 2, y: minY + hoogte / 2, breedte, hoogte, punten: p.map((v, i) => v - (i % 2 === 0 ? minX : minY)) };
}

export function maakTekening(punten: number[], gereedschap: TekenGereedschap, kleur: string, dikte: number): TekeningElement {
  const n = normaliseerStreek(punten, dikte);
  return { ...basis(n.x, n.y, n.breedte, n.hoogte), type: 'tekening', gereedschap, punten: n.punten, kleur, dikte };
}
```

`src/elements/tekening.ts`:
```ts
import Konva from 'konva';
import type { LineConfig } from 'konva/lib/shapes/Line';
import type { TekenGereedschap, TekeningElement } from '../document/types';
import { baseGroup } from './base';

export function penStijl(gereedschap: TekenGereedschap, dikte: number): Partial<LineConfig> {
  switch (gereedschap) {
    case 'pen': return { tension: 0.4, lineCap: 'round', lineJoin: 'round' };
    case 'stift': return { tension: 0.3, lineCap: 'round', lineJoin: 'round', opacity: 0.75 };
    case 'krijt': return { tension: 0.2, lineCap: 'butt', lineJoin: 'round', dash: [dikte * 0.9, dikte * 0.35], opacity: 0.85 };
  }
}

export function renderTekening(el: TekeningElement): Konva.Group {
  const g = baseGroup(el);
  g.add(new Konva.Line({ points: el.punten, stroke: el.kleur, strokeWidth: el.dikte, hitStrokeWidth: Math.max(el.dikte, 30), ...penStijl(el.gereedschap, el.dikte) }));
  return g;
}
```

In `src/elements/index.ts`: `import { renderTekening } from './tekening';` en `tekening: renderTekening as Renderer,`.

In `src/editor/canvas.ts`:

Imports:
```ts
import type { TekenGereedschap } from '../document/types';
import { maakTekening } from '../document/create';
import { penStijl } from '../elements/tekening';
```
Exporteer het type:
```ts
export type Gereedschap = 'selecteer' | 'teken' | 'gum';
```
Velden:
```ts
  private gereedschap: Gereedschap = 'selecteer';
  private pen: { gereedschap: TekenGereedschap; kleur: string; dikte: number } = { gereedschap: 'pen', kleur: '#2D2A32', dikte: 14 };
  private streek: { lijn: Konva.Line; punten: number[]; pointerId: number } | null = null;
  private gumPointer: number | null = null;
```
Methodes:
```ts
  setGereedschap(g: Gereedschap, pen?: Partial<{ gereedschap: TekenGereedschap; kleur: string; dikte: number }>): void {
    this.gereedschap = g;
    if (pen) this.pen = { ...this.pen, ...pen };
    const tekenen = g !== 'selecteer';
    this.content.listening(g !== 'teken');
    for (const n of this.nodes.values()) n.group.draggable(!tekenen && !n.el.vergrendeld);
    if (tekenen && this.editor.get().selectedId) this.editor.select(null);
  }

  private gum(): void {
    const pos = this.stage.getPointerPosition();
    const shape = pos ? this.stage.getIntersection(pos) : null;
    const n = shape ? this.elementVan(shape) : undefined;
    if (n?.el.type === 'tekening') this.editor.remove(n.el.id);
  }
```
In `sync()`, direct na `this.nodes.set(el.id, { el, group });` toevoegen:
```ts
      if (this.gereedschap !== 'selecteer') group.draggable(false);
```
In `bindEvents()`: zet bovenaan de `click tap`-handler `if (this.gereedschap !== 'selecteer') return;` en voeg toe:
```ts
    this.stage.on('pointerdown', (e) => {
      if (this.gereedschap === 'selecteer') return;
      const evt = e.evt as PointerEvent;
      if (this.streek || this.gumPointer !== null) return;
      if (this.gereedschap === 'gum') { this.gumPointer = evt.pointerId; this.gum(); return; }
      const p = this.content.getRelativePointerPosition();
      if (!p) return;
      const lijn = new Konva.Line({ points: [p.x, p.y, p.x + 0.5, p.y + 0.5], stroke: this.pen.kleur, strokeWidth: this.pen.dikte, listening: false, ...penStijl(this.pen.gereedschap, this.pen.dikte) });
      this.ui.add(lijn);
      this.streek = { lijn, punten: [p.x, p.y], pointerId: evt.pointerId };
    });
    this.stage.on('pointermove', (e) => {
      const evt = e.evt as PointerEvent;
      if (this.gumPointer === evt.pointerId) { this.gum(); return; }
      if (!this.streek || this.streek.pointerId !== evt.pointerId) return;
      const p = this.content.getRelativePointerPosition();
      if (!p) return;
      const pts = this.streek.punten;
      if (Math.hypot(p.x - pts[pts.length - 2], p.y - pts[pts.length - 1]) < 2) return;
      pts.push(p.x, p.y);
      this.streek.lijn.points(pts.length === 2 ? [...pts, pts[0] + 0.5, pts[1] + 0.5] : pts);
      this.ui.batchDraw();
    });
    this.stage.on('pointerup pointercancel', (e) => {
      const evt = e.evt as PointerEvent;
      if (this.gumPointer === evt.pointerId) { this.gumPointer = null; return; }
      if (!this.streek || this.streek.pointerId !== evt.pointerId) return;
      const { lijn, punten } = this.streek;
      this.streek = null;
      lijn.destroy();
      this.editor.add(maakTekening(punten, this.pen.gereedschap, this.pen.kleur, this.pen.dikte));
      this.editor.select(null);
    });
```

- [ ] **Step 4: Run tests — moeten slagen**

Run: `npx vitest run`
Expected: PASS.

- [ ] **Step 5: Tekenpaneel en e2e**

`src/ui/TekenPaneel.svelte`:
```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  import KleurPalet from './KleurPalet.svelte';
  import type { CanvasController } from '../editor/canvas';
  import type { TekenGereedschap } from '../document/types';

  let { controller }: { controller: CanvasController | null } = $props();
  let gereedschap = $state<TekenGereedschap | 'gum'>('pen');
  let kleur = $state('#2D2A32');
  let dikte = $state(14);

  const PENNEN: { id: TekenGereedschap | 'gum'; naam: string; icoon: string }[] = [
    { id: 'pen', naam: 'Pen', icoon: 'pen' }, { id: 'stift', naam: 'Stift', icoon: 'highlighter-circle' },
    { id: 'krijt', naam: 'Krijt', icoon: 'paint-brush' }, { id: 'gum', naam: 'Gum', icoon: 'eraser' },
  ];
  const DIKTES = [{ id: 'klein', px: 6 }, { id: 'middel', px: 14 }, { id: 'groot', px: 28 }];

  function pasToe() {
    if (gereedschap === 'gum') controller?.setGereedschap('gum');
    else controller?.setGereedschap('teken', { gereedschap, kleur, dikte });
  }

  $effect(() => { void [gereedschap, kleur, dikte, controller]; pasToe(); });
</script>

<h2>Tekenen</h2>
<div class="rij">
  {#each PENNEN as p}
    <button id="pen-{p.id}" class:actief={gereedschap === p.id} onclick={() => (gereedschap = p.id)}><Icon name={p.icoon} size={30} /><span>{p.naam}</span></button>
  {/each}
</div>
{#if gereedschap !== 'gum'}
  <h3>Dikte</h3>
  <div class="rij">
    {#each DIKTES as d}
      <button id="dikte-{d.id}" aria-label={d.id} class:actief={dikte === d.px} onclick={() => (dikte = d.px)}>
        <span class="stip" style:width="{d.px}px" style:height="{d.px}px" style:background={kleur}></span>
      </button>
    {/each}
  </div>
  <h3>Kleur</h3>
  <KleurPalet waarde={kleur} onKies={(k) => k && (kleur = k)} />
{:else}
  <p>Tik of veeg over een tekening om ze weg te gummen.</p>
{/if}

<style>
  .rij { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
  .rij button { flex-direction: column; background: var(--creme); font-size: 0.85rem; min-height: 72px; }
  .rij button.actief { background: var(--zon); }
  .stip { display: block; border-radius: 50%; }
</style>
```

In `src/ui/EditorScherm.svelte`:

Import `import TekenPaneel from './TekenPaneel.svelte';`.

Wijzig `PANEEL_VOOR` en de selectie-effect:
```ts
  const PANEEL_VOOR: Record<Element['type'], Paneel | null> = { foto: 'foto', tekst: 'tekst', sticker: 'stickers', vorm: 'vormen', tekening: null };

  $effect(() => {
    const id = $editorState.selectedId;
    untrack(() => {
      const el = editor.get().collage.elementen.find((e) => e.id === id);
      const p = el ? PANEEL_VOOR[el.type] : null;
      if (p) paneel = p;
    });
  });

  $effect(() => {
    if (paneel !== 'tekenen') untrack(() => controller)?.setGereedschap('selecteer');
  });
```

Vervang `<!-- panelen -->` door:
```svelte
      {#if paneel === 'tekenen'}<TekenPaneel {controller} />{/if}
      <!-- panelen -->
```

`e2e/tekenen.spec.ts`:
```ts
import { test, expect, openNieuweCollage, elementen } from './helpers';

async function veeg(page: import('@playwright/test').Page, van: [number, number], naar: [number, number]) {
  const a = await page.evaluate(([x, y]) => window.__collage.controller.naarScherm(x, y), van);
  const b = await page.evaluate(([x, y]) => window.__collage.controller.naarScherm(x, y), naar);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(a.x + ((b.x - a.x) * i) / 10, a.y + ((b.y - a.y) * i) / 10);
  await page.mouse.up();
}

test('tekenen met krijt en weggummen', async ({ page }) => {
  await openNieuweCollage(page);
  await page.click('#tool-tekenen');
  await page.click('#pen-krijt');
  await page.click('#dikte-groot');
  await veeg(page, [300, 600], [900, 600]);
  let els = await elementen(page);
  expect(els).toHaveLength(1);
  expect(els[0]).toMatchObject({ type: 'tekening', gereedschap: 'krijt', dikte: 28 });

  await page.click('#pen-gum');
  await veeg(page, [600, 500], [600, 700]);
  expect(await elementen(page)).toHaveLength(0);

  await page.click('#tool-vormen');
  await page.click('#vorm-ster');
  expect(await elementen(page)).toHaveLength(1);
});
```

Run: `npx playwright test e2e/tekenen.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add freehand drawing with pen, marker, chalk and stroke eraser"
```

---

### Task 17: Achtergronden — kleur, verloop, patroon en foto

**Files:**
- Create: `src/elements/patronen.ts`, `src/elements/patronen.test.ts`, `src/ui/AchtergrondPaneel.svelte`, `e2e/achtergrond.spec.ts`
- Modify: `src/elements/achtergrond.ts`, `src/ui/EditorScherm.svelte`

**Interfaces:**
- Consumes: `mulberry32` (Task 11), `tracePad` (Task 5), `dekUitsnede` (Task 10), `verkleinAfbeelding` (Task 10)
- Produces:
  - `PATRONEN: { patroon: Patroon; naam: string }[]` (6)
  - `maakPatroon(p: Patroon, kleur: string, achtergrondkleur: string): HTMLCanvasElement` (80×80, deterministisch, gecachet)
  - `renderAchtergrond` ondersteunt nu alle vier soorten
  - `VERLOPEN: [string, string][]` (8 kleurparen, in `AchtergrondPaneel`)
  - DOM-id's: `#achtergrond-tabs`, `#tab-kleur`, `#tab-verloop`, `#tab-patroon`, `#tab-foto`, `#verloop-<i>`, `#hoek-<graden>`, `#patroon-<patroon>`, `#achtergrond-foto`

- [ ] **Step 1: Failing tests schrijven**

`src/elements/patronen.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import Konva from 'konva';
import { PATRONEN, maakPatroon } from './patronen';
import { renderAchtergrond } from './achtergrond';

describe('maakPatroon', () => {
  it.each(PATRONEN.map((p) => p.patroon))('%s geeft een 80x80 tegel die deterministisch is', (p) => {
    const a = maakPatroon(p, '#FF6B6B', '#FFFFFF');
    expect(a.width).toBe(80);
    expect(a.toDataURL()).toBe(maakPatroon(p, '#FF6B6B', '#FFFFFF').toDataURL());
  });
});

describe('renderAchtergrond', () => {
  const ctx = { image: () => undefined };

  it('patroon gebruikt een herhalende patroonvulling', () => {
    const r = renderAchtergrond({ soort: 'patroon', patroon: 'stippen', kleur: '#000000', achtergrondkleur: '#FFFFFF' }, 500, 400, ctx) as Konva.Rect;
    expect(r.fillPatternImage()).toBeInstanceOf(HTMLCanvasElement);
    expect(r.width()).toBe(500);
  });

  it('foto vult het hele canvas met een middenuitsnede', () => {
    const img = document.createElement('canvas');
    img.width = 1000; img.height = 500;
    const n = renderAchtergrond({ soort: 'foto', assetId: 'a' }, 400, 400, { image: () => img }) as Konva.Image;
    expect(n).toBeInstanceOf(Konva.Image);
    expect(n.crop()).toEqual({ x: 250, y: 0, width: 500, height: 500 });
    expect(n.name()).toBe('achtergrond');
  });

  it('foto zonder geladen afbeelding valt terug op wit', () => {
    const n = renderAchtergrond({ soort: 'foto', assetId: 'x' }, 400, 400, ctx) as Konva.Rect;
    expect(n.fill()).toBe('#FFFFFF');
  });
});
```

- [ ] **Step 2: Run tests — moeten falen**

Run: `npx vitest run src/elements/patronen.test.ts`
Expected: FAIL — `Failed to resolve import "./patronen"`.

- [ ] **Step 3: Implementatie**

`src/elements/patronen.ts`:
```ts
import type { Patroon } from '../document/types';
import { mulberry32 } from './patronen-rng';
import { tracePad, type PathCtx } from './paths';

export const PATRONEN: { patroon: Patroon; naam: string }[] = [
  { patroon: 'stippen', naam: 'Stippen' }, { patroon: 'strepen', naam: 'Strepen' }, { patroon: 'ruitjes', naam: 'Ruitjes' },
  { patroon: 'sterren', naam: 'Sterren' }, { patroon: 'papier', naam: 'Papier' }, { patroon: 'karton', naam: 'Karton' },
];

const cache = new Map<string, HTMLCanvasElement>();

export function maakPatroon(p: Patroon, kleur: string, achtergrondkleur: string): HTMLCanvasElement {
  const key = `${p}|${kleur}|${achtergrondkleur}`;
  const klaar = cache.get(key);
  if (klaar) return klaar;
  const t = 80;
  const c = document.createElement('canvas');
  c.width = c.height = t;
  const x = c.getContext('2d')!;
  x.fillStyle = achtergrondkleur;
  x.fillRect(0, 0, t, t);
  x.fillStyle = kleur;
  x.strokeStyle = kleur;
  const rnd = mulberry32(42);
  switch (p) {
    case 'stippen':
      for (const [cx, cy] of [[20, 20], [60, 60]]) { x.beginPath(); x.arc(cx, cy, 9, 0, Math.PI * 2); x.fill(); }
      break;
    case 'strepen':
      x.lineWidth = 12;
      for (let o = -t; o <= t * 2; o += 40) { x.beginPath(); x.moveTo(o, 0); x.lineTo(o - t, t); x.stroke(); }
      break;
    case 'ruitjes':
      for (const o of [0, 40]) { x.fillRect(o, 0, 3, t); x.fillRect(0, o, t, 3); }
      break;
    case 'sterren':
      for (const [cx, cy, s] of [[20, 20, 24], [60, 60, 18]]) {
        x.save(); x.translate(cx - s / 2, cy - s / 2); tracePad(x as unknown as PathCtx, 'ster', s, s); x.fill(); x.restore();
      }
      break;
    case 'papier':
      for (let i = 0; i < 900; i++) { x.globalAlpha = rnd() * 0.08; x.fillRect(rnd() * t, rnd() * t, 1.5, 1.5); }
      break;
    case 'karton':
      x.lineWidth = 1;
      for (let i = 0; i < 60; i++) {
        x.globalAlpha = 0.08 + rnd() * 0.1;
        const y0 = rnd() * t;
        x.beginPath(); x.moveTo(0, y0); x.lineTo(t, y0 + (rnd() - 0.5) * 6); x.stroke();
      }
      break;
  }
  x.globalAlpha = 1;
  cache.set(key, c);
  return c;
}
```

Vervang de `default`-tak in `renderAchtergrond` (`src/elements/achtergrond.ts`) door:
```ts
    case 'patroon':
      return new Konva.Rect({ ...basis, fillPatternImage: maakPatroon(a.patroon, a.kleur, a.achtergrondkleur) as unknown as HTMLImageElement, fillPatternRepeat: 'repeat' });
    case 'foto': {
      const img = ctx.image(a.assetId);
      if (!img) return new Konva.Rect({ ...basis, fill: '#FFFFFF' });
      const bw = (img as HTMLImageElement).naturalWidth || (img as HTMLCanvasElement).width;
      const bh = (img as HTMLImageElement).naturalHeight || (img as HTMLCanvasElement).height;
      const u = dekUitsnede(bw, bh, breedte, hoogte);
      return new Konva.Image({ ...basis, image: img as HTMLImageElement, crop: { x: u.x, y: u.y, width: u.breedte, height: u.hoogte } });
    }
```
Hernoem de parameter `_ctx` naar `ctx` en voeg imports toe:
```ts
import { maakPatroon } from './patronen';
import { dekUitsnede } from '../editor/uitsnede';
```

- [ ] **Step 4: Run tests — moeten slagen**

Run: `npx vitest run src/elements`
Expected: PASS.

- [ ] **Step 5: Paneel en e2e**

`src/ui/AchtergrondPaneel.svelte`:
```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  import KleurPalet from './KleurPalet.svelte';
  import { PATRONEN, maakPatroon } from '../elements/patronen';
  import type { Achtergrond } from '../document/types';
  import type { Editor } from '../editor/store';
  import type { AssetStore } from '../assets/store';
  import { verkleinAfbeelding, FOUTTEKST, ImportFout } from '../import/afbeelding';
  import { toon } from './toast';

  let { editor, assets, achtergrond }: { editor: Editor; assets: AssetStore; achtergrond: Achtergrond } = $props();
  let tab = $state<'kleur' | 'verloop' | 'patroon' | 'foto'>('kleur');
  let invoer: HTMLInputElement;

  const VERLOPEN: [string, string][] = [
    ['#A0E7FF', '#FFF3C4'], ['#FFD1DC', '#FFF8EE'], ['#FFC94D', '#FF6B6B'], ['#4ECDC4', '#5AA9F2'],
    ['#A78BFA', '#FF4FD8'], ['#8BD450', '#3BB273'], ['#2F6FDB', '#1E1B4B'], ['#FFE14D', '#FF9F1C'],
  ];
  const HOEKEN = [0, 45, 90, 135];

  const verloop = $derived(achtergrond.soort === 'verloop' ? achtergrond : null);
  const patroon = $derived(achtergrond.soort === 'patroon' ? achtergrond : null);

  async function kiesFoto() {
    const f = invoer.files?.[0];
    if (!f) return;
    try {
      const id = await assets.addBlob(await verkleinAfbeelding(f));
      editor.setAchtergrond({ soort: 'foto', assetId: id });
    } catch (e) {
      toon(e instanceof ImportFout ? FOUTTEKST[e.code] : 'Er ging iets mis.', 'warning');
    }
  }
</script>

<h2>Achtergrond</h2>
<div class="tabs" id="achtergrond-tabs" role="tablist">
  <button id="tab-kleur" role="tab" aria-selected={tab === 'kleur'} class:actief={tab === 'kleur'} onclick={() => (tab = 'kleur')}><Icon name="palette" /><span>Kleur</span></button>
  <button id="tab-verloop" role="tab" aria-selected={tab === 'verloop'} class:actief={tab === 'verloop'} onclick={() => (tab = 'verloop')}><Icon name="gradient" /><span>Verloop</span></button>
  <button id="tab-patroon" role="tab" aria-selected={tab === 'patroon'} class:actief={tab === 'patroon'} onclick={() => (tab = 'patroon')}><Icon name="dots-nine" /><span>Patroon</span></button>
  <button id="tab-foto" role="tab" aria-selected={tab === 'foto'} class:actief={tab === 'foto'} onclick={() => (tab = 'foto')}><Icon name="image" /><span>Foto</span></button>
</div>

{#if tab === 'kleur'}
  <KleurPalet waarde={achtergrond.soort === 'kleur' ? achtergrond.kleur : null} onKies={(k) => k && editor.setAchtergrond({ soort: 'kleur', kleur: k })} />
{:else if tab === 'verloop'}
  <div class="tegels">
    {#each VERLOPEN as [van, naar], i}
      <button id="verloop-{i}" aria-label="Verloop {i + 1}" style:background="linear-gradient(135deg, {van}, {naar})" onclick={() => editor.setAchtergrond({ soort: 'verloop', van, naar, hoek: verloop?.hoek ?? 90 })}></button>
    {/each}
  </div>
  {#if verloop}
    <h3>Richting</h3>
    <div class="rij">
      {#each HOEKEN as h}
        <button id="hoek-{h}" aria-label="Richting {h} graden" class:actief={verloop.hoek === h} onclick={() => editor.setAchtergrond({ ...verloop, hoek: h })}>
          <span class="pijl" style:transform="rotate({h}deg)"><Icon name="arrow-right" /></span>
        </button>
      {/each}
    </div>
  {/if}
{:else if tab === 'patroon'}
  <div class="tegels">
    {#each PATRONEN as p}
      <button id="patroon-{p.patroon}" aria-label={p.naam}
        style:background-image="url({maakPatroon(p.patroon, patroon?.kleur ?? '#FF6B6B', patroon?.achtergrondkleur ?? '#FFF8EE').toDataURL()})"
        onclick={() => editor.setAchtergrond({ soort: 'patroon', patroon: p.patroon, kleur: patroon?.kleur ?? '#FF6B6B', achtergrondkleur: patroon?.achtergrondkleur ?? '#FFF8EE' })}></button>
    {/each}
  </div>
  {#if patroon}
    <h3>Kleur patroon</h3>
    <KleurPalet waarde={patroon.kleur} onKies={(k) => k && editor.setAchtergrond({ ...patroon, kleur: k })} />
    <h3>Kleur ondergrond</h3>
    <KleurPalet waarde={patroon.achtergrondkleur} onKies={(k) => k && editor.setAchtergrond({ ...patroon, achtergrondkleur: k })} />
  {/if}
{:else}
  <button id="achtergrond-foto" class="hoofd breed" onclick={() => { invoer.value = ''; invoer.click(); }}><Icon name="image" /> Kies een foto</button>
  <input class="visueel-verborgen" type="file" accept="image/*" bind:this={invoer} onchange={kiesFoto} />
{/if}

<style>
  .tabs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 16px; }
  .tabs button { flex-direction: column; font-size: 0.8rem; background: var(--creme); min-height: 64px; }
  .tabs button.actief, .rij button.actief { background: var(--zon); }
  .tegels { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
  .tegels button { aspect-ratio: 1; border: 3px solid var(--rand); background-size: 40px; }
  .rij { display: flex; gap: 8px; margin-bottom: 16px; }
  .rij button { background: var(--creme); }
  .pijl { display: inline-flex; }
  .breed { width: 100%; }
</style>
```

In `src/ui/EditorScherm.svelte`: import `import AchtergrondPaneel from './AchtergrondPaneel.svelte';` en vervang `<!-- panelen -->` door:
```svelte
      {#if paneel === 'achtergrond'}<AchtergrondPaneel {editor} {assets} achtergrond={$editorState.collage.achtergrond} />{/if}
      <!-- panelen -->
```

`e2e/achtergrond.spec.ts`:
```ts
import { test, expect, openNieuweCollage } from './helpers';

const achtergrond = (page: import('@playwright/test').Page) => page.evaluate(() => window.__collage.editor.get().collage.achtergrond);

test('achtergrond: kleur, verloop met richting en patroon', async ({ page }) => {
  await openNieuweCollage(page);
  await page.click('#tool-achtergrond');
  await page.locator('#paneel-achtergrond .palet').getByRole('button', { name: '#FFE14D' }).click();
  expect(await achtergrond(page)).toEqual({ soort: 'kleur', kleur: '#FFE14D' });

  await page.click('#tab-verloop');
  await page.click('#verloop-3');
  await page.click('#hoek-45');
  expect(await achtergrond(page)).toMatchObject({ soort: 'verloop', van: '#4ECDC4', hoek: 45 });

  await page.click('#tab-patroon');
  await page.click('#patroon-sterren');
  expect(await achtergrond(page)).toMatchObject({ soort: 'patroon', patroon: 'sterren' });

  await page.click('#knop-ongedaan');
  expect((await achtergrond(page)).soort).toBe('verloop');
});
```

Run: `npx playwright test e2e/achtergrond.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add background colors, gradients, patterns and photo backgrounds"
```

---

### Task 18: Templates met voorbeeldplaatjes en fotovakken

**Files:**
- Create: `src/assets/templates.ts`, `src/assets/templates.test.ts`, `src/export/voorbeeld.ts`, `src/ui/TemplateKiezer.svelte`, `e2e/templates.spec.ts`
- Modify: `src/ui/StartScherm.svelte`

**Interfaces:**
- Consumes: `maakFoto`, `maakTekst`, `maakSticker`, `nieuweCollage` (Task 3), `wordartPreset` (Task 15), `STICKER_PACKS` (Task 2), `renderElement`, `renderAchtergrond`, `AssetStore`, `laadLettertypes`
- Produces:
  - `interface TemplateDef { id: string; naam: string; formaat: Formaat; maak(): Collage }`
  - `TEMPLATES: TemplateDef[]` (12), `template(id: string): TemplateDef` (gooit bij onbekend id)
  - `maakVoorbeeld(c: Collage, assets: AssetStore, breedte?: number): Promise<string>` (data-URL)
  - Template-id's: `raster-2`, `raster-3`, `raster-4`, `raster-6`, `vakantie`, `verjaardag`, `over-mij`, `huisdier`, `seizoen`, `strip`, `poster`, `kaart`
  - DOM-id's: `#start-template`, `#template-<id>`

- [ ] **Step 1: Failing tests schrijven**

`src/assets/templates.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { TEMPLATES, template } from './templates';
import { STICKER_PACKS } from './stickers';
import { FORMATEN } from '../document/formats';
import { maakVoorbeeld } from '../export/voorbeeld';
import { AssetStore } from './store';

const alleStickers = new Set(STICKER_PACKS.flatMap((p) => p.stickers.map((s) => `${p.id}/${s}`)));

describe('templates', () => {
  it('heeft 12 templates met unieke id', () => {
    expect(TEMPLATES).toHaveLength(12);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(12);
  });

  it.each(TEMPLATES.map((t) => t.id))('%s: geldige collage', (id) => {
    const t = template(id);
    const c = t.maak();
    expect(c.formaat).toBe(t.formaat);
    const ids = c.elementen.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(c.elementen.some((e) => e.type === 'foto' && e.assetId === null)).toBe(true);
    const f = FORMATEN[c.formaat];
    for (const e of c.elementen) {
      expect(e.x).toBeGreaterThanOrEqual(0); expect(e.x).toBeLessThanOrEqual(f.breedte);
      expect(e.y).toBeGreaterThanOrEqual(0); expect(e.y).toBeLessThanOrEqual(f.hoogte);
      if (e.type === 'sticker') expect(alleStickers.has(e.sticker), e.sticker).toBe(true);
    }
  });

  it('maak() geeft elke keer nieuwe id\'s', () => {
    expect(template('raster-4').maak().elementen[0].id).not.toBe(template('raster-4').maak().elementen[0].id);
  });

  it('maakVoorbeeld geeft een PNG', async () => {
    const url = await maakVoorbeeld(template('verjaardag').maak(), new AssetStore(), 200);
    expect(url).toMatch(/^data:image\/png/);
  });
});
```

- [ ] **Step 2: Run tests — moeten falen**

Run: `npx vitest run src/assets/templates.test.ts`
Expected: FAIL — `Failed to resolve import "./templates"`.

- [ ] **Step 3: Implementatie**

`src/assets/templates.ts`:
```ts
import { maakFoto, maakSticker, maakTekst, nieuweCollage } from '../document/create';
import { FORMATEN } from '../document/formats';
import type { Achtergrond, Collage, Element, Formaat, FotoElement, TekstElement } from '../document/types';
import { wordartPreset } from './wordart-presets';

export interface TemplateDef { id: string; naam: string; formaat: Formaat; maak(): Collage }

const vak = (x: number, y: number, b: number, h: number, extra: Partial<FotoElement> = {}): FotoElement =>
  ({ ...maakFoto({ x: x + b / 2, y: y + h / 2, breedte: b, hoogte: h, assetId: null }), ...extra });

const titel = (tekst: string, x: number, y: number, breedte: number, grootte: number, preset: string, lettertype = 'luckiest'): TekstElement =>
  ({ ...maakTekst({ x, y, tekst, breedte, grootte, lettertype }), wordart: wordartPreset(preset) });

const tekst = (t: string, x: number, y: number, breedte: number, grootte: number, lettertype: string, extra: Partial<TekstElement> = {}): TekstElement =>
  ({ ...maakTekst({ x, y, tekst: t, breedte, grootte, lettertype }), ...extra });

const sticker = (s: string, x: number, y: number, grootte: number, kleur: string, rotatie = 0) =>
  ({ ...maakSticker({ x, y, sticker: s, kleur, grootte }), rotatie });

function raster(formaat: Formaat, kol: number, rij: number, marge = 40): FotoElement[] {
  const { breedte: W, hoogte: H } = FORMATEN[formaat];
  const b = (W - marge * (kol + 1)) / kol, h = (H - marge * (rij + 1)) / rij;
  const uit: FotoElement[] = [];
  for (let r = 0; r < rij; r++) for (let c = 0; c < kol; c++) uit.push(vak(marge + c * (b + marge), marge + r * (h + marge), b, h));
  return uit;
}

function collage(formaat: Formaat, naam: string, achtergrond: Achtergrond, elementen: Element[]): Collage {
  return { ...nieuweCollage(formaat, naam), achtergrond, elementen };
}

const wit: Achtergrond = { soort: 'kleur', kleur: '#FFFFFF' };
const polaroid = { kader: { stijl: 'polaroid' as const, kleur: '#FFFFFF' } };

export const TEMPLATES: TemplateDef[] = [
  { id: 'raster-2', naam: '2 foto\'s', formaat: 'a4-liggend', maak: () => collage('a4-liggend', '2 foto\'s', wit, raster('a4-liggend', 2, 1)) },
  { id: 'raster-3', naam: '3 foto\'s', formaat: 'a4-liggend', maak: () => collage('a4-liggend', '3 foto\'s', wit, [vak(40, 40, 1040, 1160), vak(1120, 40, 594, 560), vak(1120, 640, 594, 560)]) },
  { id: 'raster-4', naam: '4 foto\'s', formaat: 'vierkant', maak: () => collage('vierkant', '4 foto\'s', wit, raster('vierkant', 2, 2)) },
  { id: 'raster-6', naam: '6 foto\'s', formaat: 'a4-staand', maak: () => collage('a4-staand', '6 foto\'s', wit, raster('a4-staand', 2, 3)) },
  {
    id: 'vakantie', naam: 'Vakantie', formaat: 'a4-liggend',
    maak: () => collage('a4-liggend', 'Mijn vakantie', { soort: 'verloop', van: '#A0E7FF', naar: '#FFF3C4', hoek: 90 }, [
      vak(150, 380, 440, 440, { ...polaroid, rotatie: -6 }), vak(657, 360, 440, 440, { ...polaroid, rotatie: 3 }), vak(1164, 380, 440, 440, { ...polaroid, rotatie: -3 }),
      titel('Mijn vakantie', 877, 170, 1200, 130, 'boog-zon'),
      sticker('seizoenen/sun', 1580, 150, 200, '#FFC94D'), sticker('voertuigen/sailboat', 180, 1080, 180, '#5AA9F2'), sticker('natuur/tree-palm', 1600, 1050, 200, '#3BB273'),
    ]),
  },
  {
    id: 'verjaardag', naam: 'Verjaardag', formaat: 'vierkant',
    maak: () => collage('vierkant', 'Verjaardag', { soort: 'patroon', patroon: 'stippen', kleur: '#FFC94D', achtergrondkleur: '#FFF8EE' }, [
      vak(350, 330, 500, 500, { masker: 'rond', kader: { stijl: 'effen', kleur: '#FF6B6B' } }),
      titel('Hoera!', 600, 170, 1000, 160, '3d'),
      tekst('Ik word ... jaar', 600, 950, 900, 80, 'chewy', { ballon: '#FFFFFF' }),
      sticker('feest/cake', 180, 1020, 220, '#FF6B6B'), sticker('feest/gift', 1020, 1020, 220, '#A78BFA'), sticker('feest/confetti', 1030, 380, 200, '#FF9F1C', 15),
    ]),
  },
  {
    id: 'over-mij', naam: 'Over mij', formaat: 'a4-staand',
    maak: () => collage('a4-staand', 'Dit ben ik', { soort: 'kleur', kleur: '#FFF8EE' }, [
      vak(320, 330, 600, 600, { masker: 'hart' }),
      titel('Dit ben ik', 620, 180, 1100, 150, 'regenboog'),
      tekst('Ik hou van ...', 620, 1100, 1000, 70, 'baloo', { ballon: '#FFE14D' }),
      tekst('Later word ik ...', 620, 1300, 1000, 70, 'baloo', { ballon: '#4ECDC4' }),
      tekst('Mijn lievelingskleur is ...', 620, 1500, 1000, 70, 'baloo', { ballon: '#A78BFA' }),
      sticker('vormen/star', 1080, 300, 160, '#FFC94D', 12),
    ]),
  },
  {
    id: 'huisdier', naam: 'Huisdier', formaat: 'vierkant',
    maak: () => collage('vierkant', 'Mijn huisdier', { soort: 'kleur', kleur: '#E8F7F5' }, [
      vak(300, 260, 600, 600, { masker: 'blob', kader: { stijl: 'golf', kleur: '#4ECDC4' } }),
      titel('Mijn huisdier', 600, 150, 1100, 120, 'zon'),
      tekst('Naam: ...', 600, 1000, 800, 80, 'fredoka'),
      sticker('dieren/paw-print', 150, 1050, 150, '#A0522D', -20), sticker('dieren/paw-print', 1050, 1050, 150, '#A0522D', 20), sticker('dieren/bone', 1060, 250, 150, '#9CA3AF', 30),
    ]),
  },
  {
    id: 'seizoen', naam: 'Seizoenen', formaat: 'a4-liggend',
    maak: () => {
      const v = raster('a4-liggend', 2, 2, 60);
      const kleuren = ['#8BD450', '#FFC94D', '#FF9F1C', '#5AA9F2'];
      const labels = ['Lente', 'Zomer', 'Herfst', 'Winter'].map((t, i) => tekst(t, v[i].x, v[i].y + v[i].hoogte / 2 - 50, 300, 60, 'sniglet', { ballon: kleuren[i] }));
      return collage('a4-liggend', 'Vier seizoenen', wit, [...v, ...labels]);
    },
  },
  {
    id: 'strip', naam: 'Strip', formaat: 'a4-liggend',
    maak: () => {
      const rand = { kader: { stijl: 'effen' as const, kleur: '#2D2A32' } };
      return collage('a4-liggend', 'Mijn strip', wit, [
        vak(40, 160, 540, 1040, rand), vak(607, 160, 540, 1040, rand), vak(1174, 160, 540, 1040, rand),
        titel('Mijn strip', 877, 80, 800, 90, 'strip'),
        sticker('tekstballonnen/chat-circle', 380, 330, 200, '#2D2A32'), sticker('tekstballonnen/chat-circle', 940, 330, 200, '#2D2A32'), sticker('tekstballonnen/chat-circle', 1500, 330, 200, '#2D2A32'),
      ]);
    },
  },
  {
    id: 'poster', naam: 'Poster', formaat: 'poster',
    maak: () => collage('poster', 'Mijn poster', { soort: 'kleur', kleur: '#1E1B4B' }, [
      vak(100, 100, 1000, 1000, { kader: { stijl: 'effen', kleur: '#FFFFFF' } }),
      titel('MIJN POSTER', 600, 1250, 1100, 150, 'neon-roze', 'bangers'),
      tekst('Schrijf hier iets over je poster', 600, 1450, 1000, 60, 'nunito', { kleur: '#FFFFFF' }),
      sticker('ruimte/star-four', 1080, 1650, 120, '#FFE14D'), sticker('ruimte/star-four', 120, 1650, 90, '#FFE14D'),
    ]),
  },
  {
    id: 'kaart', naam: 'Kaart', formaat: 'a4-liggend',
    maak: () => collage('a4-liggend', 'Voor jou', { soort: 'verloop', van: '#FFD1DC', naar: '#FFF8EE', hoek: 135 }, [
      vak(120, 170, 700, 900, { masker: 'wolk', kader: { stijl: 'effen', kleur: '#FFFFFF' } }),
      titel('Voor jou', 1300, 350, 800, 160, 'dubbel', 'pacifico'),
      tekst('Schrijf hier je boodschap', 1300, 700, 700, 64, 'caveat'),
      sticker('vormen/heart', 1500, 1000, 180, '#FF6B6B', -10), sticker('vormen/heart', 1150, 1050, 120, '#FF4FD8', 12),
    ]),
  },
];

export function template(id: string): TemplateDef {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`Onbekende template: ${id}`);
  return t;
}
```

`src/export/voorbeeld.ts`:
```ts
import Konva from 'konva';
import type { Collage } from '../document/types';
import { FORMATEN } from '../document/formats';
import { renderElement } from '../elements/index';
import { renderAchtergrond } from '../elements/achtergrond';
import { laadLettertypes } from '../assets/fonts';
import type { AssetStore } from '../assets/store';

export async function maakVoorbeeld(c: Collage, assets: AssetStore, breedte = 320): Promise<string> {
  await Promise.all([assets.preload(c), laadLettertypes()]);
  const f = FORMATEN[c.formaat];
  const s = breedte / f.breedte;
  const div = document.createElement('div');
  const stage = new Konva.Stage({ container: div, width: breedte, height: Math.round(f.hoogte * s) });
  const laag = new Konva.Layer({ scaleX: s, scaleY: s });
  laag.add(renderAchtergrond(c.achtergrond, f.breedte, f.hoogte, assets));
  for (const el of c.elementen) laag.add(renderElement(el, assets));
  stage.add(laag);
  const url = stage.toDataURL({ pixelRatio: 1 });
  stage.destroy();
  return url;
}
```

- [ ] **Step 4: Run tests — moeten slagen**

Run: `npx vitest run src/assets/templates.test.ts`
Expected: PASS (15 tests).

- [ ] **Step 5: Templatekiezer en startscherm**

`src/ui/TemplateKiezer.svelte`:
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { TEMPLATES, type TemplateDef } from '../assets/templates';
  import { AssetStore } from '../assets/store';
  import { maakVoorbeeld } from '../export/voorbeeld';

  let { onKies }: { onKies: (t: TemplateDef) => void } = $props();
  let voorbeelden = $state<Record<string, string>>({});

  onMount(async () => {
    const assets = new AssetStore();
    for (const t of TEMPLATES) voorbeelden[t.id] = await maakVoorbeeld(t.maak(), assets, 280);
  });
</script>

<div class="templates">
  {#each TEMPLATES as t}
    <button id="template-{t.id}" class="kaart" onclick={() => onKies(t)}>
      {#if voorbeelden[t.id]}<img src={voorbeelden[t.id]} alt="" />{:else}<span class="laden"></span>{/if}
      <span>{t.naam}</span>
    </button>
  {/each}
</div>

<style>
  .templates { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; width: min(1100px, 100%); }
  .kaart { flex-direction: column; padding: 14px; border-radius: 24px; box-shadow: var(--schaduw); background: var(--paneel); }
  img { width: 100%; height: 170px; object-fit: contain; }
  .laden { display: block; width: 100%; height: 170px; background: var(--creme); border-radius: 12px; }
</style>
```

In `src/ui/StartScherm.svelte`:

Imports: `import TemplateKiezer from './TemplateKiezer.svelte';`
Wijzig `stap` naar `$state<'menu' | 'formaat' | 'templates'>('menu')`.
Vervang `<!-- startkaarten -->` door:
```svelte
      <button id="start-template" class="kaart" style:--kleur="var(--hemel)" onclick={() => (stap = 'templates')}>
        <Icon name="puzzle-piece" size={64} /><span>Template</span>
      </button>
      <!-- startkaarten -->
```
Voeg vóór `{/if}` toe:
```svelte
  {:else if stap === 'templates'}
    <button class="terug" onclick={() => (stap = 'menu')}><Icon name="arrow-left" /> Terug</button>
    <h2>Kies een template</h2>
    <TemplateKiezer onKies={(t) => onStart(t.maak())} />
```

`e2e/templates.spec.ts`:
```ts
import { test, expect, elementen, tikOpCanvas, maakPng } from './helpers';

test('template kiezen en een fotovak vullen', async ({ page }) => {
  await page.goto('/');
  await page.click('#start-template');
  await page.click('#template-raster-4');
  await page.waitForFunction(() => window.__collage?.controller);
  let els = await elementen(page);
  expect(els).toHaveLength(4);
  const vak = els[0];
  const chooser = page.waitForEvent('filechooser');
  await tikOpCanvas(page, vak.x, vak.y);
  await (await chooser).setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: await maakPng(page) });
  await page.waitForFunction((id) => window.__collage.editor.get().collage.elementen.find((e: any) => e.id === id).assetId, vak.id);
  els = await elementen(page);
  expect(els[0].uitsnede).not.toBeNull();
});
```

Run: `npx playwright test e2e/templates.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add 12 templates with thumbnails and tappable photo slots"
```

---

### Task 19: Uitdagingen

**Files:**
- Create: `src/assets/uitdagingen.ts`, `src/assets/uitdagingen.test.ts`, `src/ui/UitdagingKiezer.svelte`, `e2e/uitdagingen.spec.ts`
- Modify: `src/ui/StartScherm.svelte`, `src/ui/EditorScherm.svelte`

**Interfaces:**
- Produces:
  - `interface Uitdaging { id: string; titel: string; opdracht: string; templateId: string; pakket: string }`
  - `UITDAGINGEN: Uitdaging[]` (20)
  - DOM-id's: `#start-uitdaging`, `#uitdaging-<id>`, `#opdracht`, `#opdracht-sluit`
  - Gedrag: kiezen opent de template, toont de opdracht bovenaan de editor en opent het stickerpaneel op het passende pakket.

- [ ] **Step 1: Failing test schrijven**

`src/assets/uitdagingen.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { UITDAGINGEN } from './uitdagingen';
import { TEMPLATES } from './templates';
import { STICKER_PACKS } from './stickers';

describe('uitdagingen', () => {
  it('heeft 20 uitdagingen met unieke id', () => {
    expect(UITDAGINGEN).toHaveLength(20);
    expect(new Set(UITDAGINGEN.map((u) => u.id)).size).toBe(20);
  });

  it('verwijst alleen naar bestaande templates en pakketten', () => {
    for (const u of UITDAGINGEN) {
      expect(TEMPLATES.some((t) => t.id === u.templateId), u.id).toBe(true);
      expect(STICKER_PACKS.some((p) => p.id === u.pakket), u.id).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test — moet falen**

Run: `npx vitest run src/assets/uitdagingen.test.ts`
Expected: FAIL — `Failed to resolve import "./uitdagingen"`.

- [ ] **Step 3: Implementatie**

`src/assets/uitdagingen.ts`:
```ts
export interface Uitdaging { id: string; titel: string; opdracht: string; templateId: string; pakket: string }

export const UITDAGINGEN: Uitdaging[] = [
  { id: 'vakantie', titel: 'Mijn vakantie', opdracht: 'Maak een collage over je leukste vakantie.', templateId: 'vakantie', pakket: 'natuur' },
  { id: 'feest', titel: 'Feest!', opdracht: 'Maak een uitnodiging voor je verjaardagsfeest.', templateId: 'verjaardag', pakket: 'feest' },
  { id: 'dit-ben-ik', titel: 'Dit ben ik', opdracht: 'Vertel met foto\'s en woorden wie je bent.', templateId: 'over-mij', pakket: 'vormen' },
  { id: 'huisdier', titel: 'Mijn huisdier', opdracht: 'Laat je huisdier zien, of het huisdier dat je graag zou hebben.', templateId: 'huisdier', pakket: 'dieren' },
  { id: 'nieuw-dier', titel: 'Nieuw dier', opdracht: 'Verzin een nieuw dier. Hoe heet het en wat eet het?', templateId: 'huisdier', pakket: 'dieren' },
  { id: 'ruimtereis', titel: 'Ruimtereis', opdracht: 'Je reist naar een andere planeet. Wat zie je daar?', templateId: 'poster', pakket: 'ruimte' },
  { id: 'seizoenen', titel: 'Vier seizoenen', opdracht: 'Wat doe je graag in de lente, zomer, herfst en winter?', templateId: 'seizoen', pakket: 'seizoenen' },
  { id: 'strip', titel: 'Stripverhaal', opdracht: 'Vertel een kort verhaal in drie plaatjes.', templateId: 'strip', pakket: 'tekstballonnen' },
  { id: 'droomhuis', titel: 'Mijn droomhuis', opdracht: 'Ontwerp je droomhuis met alle kamers die je wil.', templateId: 'raster-4', pakket: 'vormen' },
  { id: 'lievelingseten', titel: 'Lievelingseten', opdracht: 'Wat eet je het liefst? Maak er een menu van.', templateId: 'raster-3', pakket: 'eten' },
  { id: 'sportdag', titel: 'Sportdag', opdracht: 'Toon je favoriete sport.', templateId: 'poster', pakket: 'sport' },
  { id: 'bedankt', titel: 'Bedankkaart', opdracht: 'Maak een kaart om iemand te bedanken.', templateId: 'kaart', pakket: 'vormen' },
  { id: 'mijn-klas', titel: 'Mijn klas', opdracht: 'Laat zien wat je klas zo leuk maakt.', templateId: 'raster-6', pakket: 'feest' },
  { id: 'op-reis', titel: 'Op reis', opdracht: 'Met welk voertuig wil je de wereld rond?', templateId: 'raster-2', pakket: 'voertuigen' },
  { id: 'bos', titel: 'In het bos', opdracht: 'Maak een collage over de natuur in het bos.', templateId: 'raster-4', pakket: 'natuur' },
  { id: 'superheld', titel: 'Superheld', opdracht: 'Verzin een superheld. Wat is de superkracht?', templateId: 'poster', pakket: 'vormen' },
  { id: 'weerbericht', titel: 'Weerbericht', opdracht: 'Maak het weerbericht voor morgen.', templateId: 'seizoen', pakket: 'seizoenen' },
  { id: 'hobby', titel: 'Mijn hobby', opdracht: 'Wat doe je graag in je vrije tijd?', templateId: 'raster-3', pakket: 'sport' },
  { id: 'onder-water', titel: 'Onder water', opdracht: 'Wat leeft er allemaal in de zee?', templateId: 'raster-4', pakket: 'dieren' },
  { id: 'toekomst', titel: 'De toekomst', opdracht: 'Hoe ziet de wereld eruit over 100 jaar?', templateId: 'poster', pakket: 'ruimte' },
];
```

`src/ui/UitdagingKiezer.svelte`:
```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  import { UITDAGINGEN, type Uitdaging } from '../assets/uitdagingen';
  let { onKies }: { onKies: (u: Uitdaging) => void } = $props();
  const KLEUREN = ['var(--koraal)', 'var(--zon)', 'var(--mint)', 'var(--hemel)', 'var(--lavendel)'];
</script>

<div class="uitdagingen">
  {#each UITDAGINGEN as u, i}
    <button id="uitdaging-{u.id}" class="kaart" style:--accent={KLEUREN[i % KLEUREN.length]} onclick={() => onKies(u)}>
      <Icon name="trophy" size={40} />
      <strong>{u.titel}</strong>
      <span>{u.opdracht}</span>
    </button>
  {/each}
</div>

<style>
  .uitdagingen { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; width: min(1100px, 100%); }
  .kaart { flex-direction: column; align-items: flex-start; text-align: left; gap: 6px; padding: 18px; border-radius: 24px; box-shadow: var(--schaduw); background: var(--paneel); border-top: 8px solid var(--accent); }
  strong { font-size: 1.2rem; }
  span { font-weight: 400; line-height: 1.4; }
</style>
```

In `src/ui/StartScherm.svelte`:

Imports:
```ts
  import UitdagingKiezer from './UitdagingKiezer.svelte';
  import { template } from '../assets/templates';
```
Wijzig `stap` naar `$state<'menu' | 'formaat' | 'templates' | 'uitdagingen'>('menu')`.
Vervang `<!-- startkaarten -->` door:
```svelte
      <button id="start-uitdaging" class="kaart" style:--kleur="var(--lavendel)" onclick={() => (stap = 'uitdagingen')}>
        <Icon name="trophy" size={64} /><span>Uitdaging</span>
      </button>
```
Voeg vóór `{/if}` toe:
```svelte
  {:else if stap === 'uitdagingen'}
    <button class="terug" onclick={() => (stap = 'menu')}><Icon name="arrow-left" /> Terug</button>
    <h2>Kies een uitdaging</h2>
    <UitdagingKiezer onKies={(u) => onStart(template(u.templateId).maak(), u.opdracht, u.pakket)} />
```

In `src/ui/EditorScherm.svelte`:

Import `import Icon from './Icon.svelte';`.
Script:
```ts
  let toonOpdracht = $state(true);
```
Wijzig de declaratie van `paneel`:
```ts
  let paneel = $state<Paneel | null>(untrack(() => startPakket) ? 'stickers' : null);
```
Vervang `<!-- opdrachtbalk -->` door:
```svelte
  {#if opdracht && toonOpdracht}
    <div class="vak-opdracht" id="opdracht">
      <Icon name="trophy" size={28} />
      <p>{opdracht}</p>
      <button id="opdracht-sluit" aria-label="Opdracht verbergen" onclick={() => (toonOpdracht = false)}><Icon name="x" /></button>
    </div>
  {/if}
```
Voeg CSS toe:
```css
  .vak-opdracht { grid-area: opdracht; display: flex; align-items: center; gap: 12px; padding: 6px 12px 6px 16px; background: var(--zon); font-weight: 700; }
  .vak-opdracht p { flex: 1; margin: 0; font-size: 1.1rem; }
  .vak-opdracht button { background: transparent; }
```

`e2e/uitdagingen.spec.ts`:
```ts
import { test, expect } from './helpers';

test('uitdaging kiezen toont opdracht en juiste stickers', async ({ page }) => {
  await page.goto('/');
  await page.click('#start-uitdaging');
  await page.click('#uitdaging-ruimtereis');
  await expect(page.locator('#opdracht')).toContainText('andere planeet');
  await expect(page.locator('#pakket-ruimte')).toHaveAttribute('aria-selected', 'true');
  await page.click('#opdracht-sluit');
  await expect(page.locator('#opdracht')).toHaveCount(0);
});
```

- [ ] **Step 4: Run tests — moeten slagen**

Run: `npx vitest run src/assets && npx playwright test e2e/uitdagingen.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add 20 creative challenges with prompt banner"
```

---

### Task 20: Exporteren naar PNG en PDF

**Files:**
- Create: `src/export/pdf.ts`, `src/export/bewaar.ts`, `src/export/export.test.ts`, `src/ui/ExportDialoog.svelte`, `e2e/export.spec.ts`
- Modify: `src/editor/canvas.ts`, `src/editor/canvas.test.ts`, `src/ui/EditorScherm.svelte`

**Interfaces:**
- Produces:
  - `CanvasController.exportPng(pixelRatio?: number): string` — PNG-data-URL van precies het canvas (`breedte × pixelRatio`), zonder `ui`-laag en zonder lege fotovakken
  - `maakPdf(png: string, formaat: Formaat): Promise<Blob>`
  - `dataUrlNaarBlob(url: string): Promise<Blob>`
  - `bestandsnaam(naam: string, ext: 'png' | 'pdf', datum?: Date): string`
  - `bewaarBestand(blob: Blob, naam: string): Promise<'gedeeld' | 'gedownload' | 'geannuleerd'>`
  - DOM-id's: `#export-png`, `#export-pdf`, `#export-bewaar`, `#export-sluit`

- [ ] **Step 1: jsPDF installeren**

Run: `npm install jspdf`

- [ ] **Step 2: Failing tests schrijven**

`src/export/export.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { bestandsnaam, dataUrlNaarBlob } from './bewaar';
import { maakPdf } from './pdf';

describe('bestandsnaam', () => {
  it('maakt een veilige naam met datum', () => {
    expect(bestandsnaam('Mijn vakantie!', 'png', new Date(2026, 9, 8))).toBe('mijn-vakantie-2026-10-08.png');
    expect(bestandsnaam('Café Één', 'pdf', new Date(2026, 0, 2))).toBe('cafe-een-2026-01-02.pdf');
    expect(bestandsnaam('***', 'png', new Date(2026, 0, 2))).toBe('collage-2026-01-02.png');
  });
});

describe('maakPdf', () => {
  it('maakt een PDF-blob', async () => {
    const c = document.createElement('canvas');
    c.width = 100; c.height = 70;
    const blob = await maakPdf(c.toDataURL('image/png'), 'a4-liggend');
    expect(blob.type).toBe('application/pdf');
    const kop = await blob.slice(0, 5).text();
    expect(kop).toBe('%PDF-');
  });
});

describe('dataUrlNaarBlob', () => {
  it('zet een data-URL om', async () => {
    const c = document.createElement('canvas');
    expect((await dataUrlNaarBlob(c.toDataURL('image/png'))).type).toBe('image/png');
  });
});
```

Voeg toe aan `src/editor/canvas.test.ts` (met extra import `import { maakFoto } from '../document/create';`):
```ts
  async function pixel(url: string, x: number, y: number) {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    return { w: img.width, h: img.height, rgb: [...ctx.getImageData(x, y, 1, 1).data.slice(0, 3)] };
  }

  it('exportPng: exact canvasformaat, zonder selectie en zonder lege vakken', async () => {
    const { editor, ctrl } = opzet();
    editor.add(maakFoto({ x: 600, y: 600, breedte: 800, hoogte: 800, assetId: null }));
    expect(editor.get().selectedId).not.toBeNull();
    const url = ctrl.exportPng(1);
    const p = await pixel(url, 600, 600);
    expect(Math.abs(p.w - 1200)).toBeLessThanOrEqual(1);
    expect(Math.abs(p.h - 1200)).toBeLessThanOrEqual(1);
    expect(p.rgb).toEqual([255, 255, 255]);
    expect(p.rgb).toEqual((await pixel(url, 210, 210)).rgb);
    expect(ctrl.stage.findOne('Transformer')!.isVisible()).toBe(true);
    expect(ctrl.stage.findOne('.leeg-vak')!.isVisible()).toBe(true);
  });

  it('exportPng met pixelRatio 2 verdubbelt de maat', async () => {
    const { ctrl } = opzet();
    expect(Math.abs((await pixel(ctrl.exportPng(2), 0, 0)).w - 2400)).toBeLessThanOrEqual(1);
  });
```

- [ ] **Step 3: Run tests — moeten falen**

Run: `npx vitest run src/export src/editor/canvas.test.ts`
Expected: FAIL — `Failed to resolve import "./bewaar"` en `ctrl.exportPng is not a function`.

- [ ] **Step 4: Implementatie**

Voeg toe aan `CanvasController` (`src/editor/canvas.ts`):
```ts
  exportPng(pixelRatio = 2): string {
    const s = this.stage.scaleX();
    const verborgen = this.content.find('.leeg-vak').filter((n) => n.visible());
    verborgen.forEach((n) => n.hide());
    this.ui.hide();
    try {
      return this.stage.toDataURL({ x: this.stage.x(), y: this.stage.y(), width: this.maat.breedte * s, height: this.maat.hoogte * s, pixelRatio: pixelRatio / s, mimeType: 'image/png' });
    } finally {
      verborgen.forEach((n) => n.show());
      this.ui.show();
      this.stage.batchDraw();
    }
  }
```

`src/export/pdf.ts`:
```ts
import type { Formaat } from '../document/types';
import { FORMATEN } from '../document/formats';

export async function maakPdf(png: string, formaat: Formaat): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const f = FORMATEN[formaat];
  const pdf = new jsPDF({ orientation: f.breedte > f.hoogte ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
  const marge = formaat.startsWith('a4') ? 0 : 8;
  const s = Math.min((pw - 2 * marge) / f.breedte, (ph - 2 * marge) / f.hoogte);
  const w = f.breedte * s, h = f.hoogte * s;
  pdf.addImage(png, 'PNG', (pw - w) / 2, (ph - h) / 2, w, h, undefined, 'FAST');
  return pdf.output('blob');
}
```

`src/export/bewaar.ts`:
```ts
export async function dataUrlNaarBlob(url: string): Promise<Blob> {
  return (await fetch(url)).blob();
}

export function bestandsnaam(naam: string, ext: 'png' | 'pdf', datum = new Date()): string {
  const slug = naam.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'collage';
  const d = `${datum.getFullYear()}-${String(datum.getMonth() + 1).padStart(2, '0')}-${String(datum.getDate()).padStart(2, '0')}`;
  return `${slug}-${d}.${ext}`;
}

export async function bewaarBestand(blob: Blob, naam: string): Promise<'gedeeld' | 'gedownload' | 'geannuleerd'> {
  const file = new File([blob], naam, { type: blob.type });
  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'gedeeld';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'geannuleerd';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = naam;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'gedownload';
}
```

- [ ] **Step 5: Run tests — moeten slagen**

Run: `npx vitest run src/export src/editor/canvas.test.ts`
Expected: PASS.

- [ ] **Step 6: Exportdialoog**

`src/ui/ExportDialoog.svelte`:
```svelte
<script lang="ts">
  import Icon from './Icon.svelte';
  import type { CanvasController } from '../editor/canvas';
  import type { Collage } from '../document/types';
  import { maakPdf } from '../export/pdf';
  import { bestandsnaam, bewaarBestand, dataUrlNaarBlob } from '../export/bewaar';
  import { toon } from './toast';

  let { controller, collage, onSluit }: { controller: CanvasController; collage: Collage; onSluit: () => void } = $props();
  let klaar = $state.raw<{ blob: Blob; naam: string; voorbeeld: string } | null>(null);
  let bezig = $state(false);

  async function maak(soort: 'png' | 'pdf') {
    bezig = true;
    try {
      const png = controller.exportPng(2);
      const blob = soort === 'png' ? await dataUrlNaarBlob(png) : await maakPdf(png, collage.formaat);
      klaar = { blob, naam: bestandsnaam(collage.naam, soort), voorbeeld: png };
    } catch {
      toon('Bewaren lukte niet. Probeer het nog eens.', 'warning');
    } finally {
      bezig = false;
    }
  }

  // Tweede tik: delen moet direct vanuit een tik gebeuren (iPad).
  async function bewaar() {
    if (!klaar) return;
    const r = await bewaarBestand(klaar.blob, klaar.naam);
    if (r !== 'geannuleerd') { toon('Bewaard!', 'check-circle'); onSluit(); }
  }
</script>

<div class="scherm" role="presentation">
  <div class="dialoog" role="dialog" aria-modal="true" aria-labelledby="export-titel">
    <h2 id="export-titel">Bewaar je collage</h2>
    {#if !klaar}
      <div class="keuze">
        <button id="export-png" disabled={bezig} onclick={() => maak('png')}><Icon name="file-png" size={56} /><span>Als foto</span></button>
        <button id="export-pdf" disabled={bezig} onclick={() => maak('pdf')}><Icon name="file-pdf" size={56} /><span>Als PDF</span></button>
      </div>
      {#if bezig}<p>Even geduld...</p>{/if}
    {:else}
      <img src={klaar.voorbeeld} alt="Voorbeeld van je collage" />
      <button id="export-bewaar" class="hoofd breed" onclick={bewaar}><Icon name="download-simple" /> Bewaar op dit toestel</button>
    {/if}
    <button id="export-sluit" class="breed" onclick={onSluit}>Sluiten</button>
  </div>
</div>

<style>
  .scherm { position: fixed; inset: 0; background: rgba(45, 42, 50, 0.45); display: grid; place-items: center; z-index: 90; padding: 16px; }
  .dialoog { background: var(--paneel); border-radius: 28px; padding: 24px; width: min(520px, 100%); box-shadow: var(--schaduw); display: grid; gap: 14px; }
  .keuze { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .keuze button { flex-direction: column; min-height: 150px; background: var(--creme); font-size: 1.2rem; }
  img { width: 100%; max-height: 50dvh; object-fit: contain; background: var(--werkvlak); border-radius: 16px; }
  .breed { width: 100%; }
</style>
```

In `src/ui/EditorScherm.svelte`:

Import `import ExportDialoog from './ExportDialoog.svelte';`.
Script: `let toonExport = $state(false);`
Voeg aan `<BovenBalk ... />` de prop toe: `onBewaar={() => { editor.select(null); toonExport = true; }}`
Voeg na het `{#if vraagTerug}`-blok toe:
```svelte
{#if toonExport && controller}
  <ExportDialoog {controller} collage={$editorState.collage} onSluit={() => (toonExport = false)} />
{/if}
```

`e2e/export.spec.ts`:
```ts
import { test, expect, openNieuweCollage } from './helpers';

test('collage bewaren als PNG en als PDF', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromebook', 'Downloaden testen we op Chromebook; iPad gebruikt het deelmenu.');
  await openNieuweCollage(page);
  await page.evaluate(() => {
    const { editor, maakVorm } = window.__collage;
    editor.add(maakVorm({ x: 600, y: 600, vorm: 'ster', breedte: 400, hoogte: 400 }));
  });

  await page.click('#knop-bewaar');
  await page.click('#export-png');
  const png = page.waitForEvent('download');
  await page.click('#export-bewaar');
  expect((await png).suggestedFilename()).toMatch(/^mijn-collage-\d{4}-\d{2}-\d{2}\.png$/);

  await page.click('#knop-bewaar');
  await page.click('#export-pdf');
  const pdf = page.waitForEvent('download');
  await page.click('#export-bewaar');
  expect((await pdf).suggestedFilename()).toMatch(/\.pdf$/);
});
```

Run: `npx playwright test e2e/export.spec.ts`
Expected: PASS (chromebook), SKIP (ipad).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: export collage as PNG or A4 PDF with share sheet on touch devices"
```

---

### Task 21: Offline werken (PWA) en installeerbaar maken

**Files:**
- Create: `public/logo.svg`, `pwa-assets.config.ts`, `e2e/offline.spec.ts`
- Modify: `vite.config.ts`, `src/main.ts`, `src/vite-env.d.ts`

**Interfaces:**
- Produces: service worker die alle app-bestanden, lettertypes (woff2), iconen en stickers vooraf cachet; webmanifest met naam "Collagemaker".

- [ ] **Step 1: Installeren**

Run: `npm install -D vite-plugin-pwa @vite-pwa/assets-generator`

- [ ] **Step 2: Failing e2e-test schrijven**

`e2e/offline.spec.ts`:
```ts
import { test, expect, elementen } from './helpers';

test('werkt offline na het eerste bezoek', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'chromebook', 'Service worker testen we in Chromium.');
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Collagemaker' })).toBeVisible();

  await page.click('#start-nieuw');
  await page.click('#formaat-vierkant');
  await page.waitForFunction(() => window.__collage?.controller);
  await page.click('#tool-stickers');
  await page.locator('.sticker-knop').first().click();
  await page.waitForFunction(() => window.__collage.editor.get().collage.elementen.length === 1);
  const [s] = await elementen(page);
  const geladen = await page.evaluate(([st, k]) => !!window.__collage.assets.image(`sticker:${st}:${k}`), [s.sticker, s.kleur]);
  expect(geladen).toBe(true);
  await context.setOffline(false);
});

test('heeft een webmanifest', async ({ page }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const m = await (await page.request.get(href!)).json();
  expect(m.name).toBe('Collagemaker');
  expect(m.icons.length).toBeGreaterThan(0);
});
```

Run: `npx playwright test e2e/offline.spec.ts --project=chromebook`
Expected: FAIL — geen service worker / geen manifest.

- [ ] **Step 3: Logo en configuratie**

`public/logo.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#FF6B6B"/>
  <rect x="96" y="120" width="220" height="250" rx="16" fill="#FFFFFF" transform="rotate(-8 206 245)"/>
  <rect x="116" y="140" width="180" height="170" rx="8" fill="#5AA9F2" transform="rotate(-8 206 225)"/>
  <rect x="210" y="150" width="210" height="240" rx="16" fill="#FFFFFF" transform="rotate(7 315 270)"/>
  <rect x="228" y="168" width="174" height="164" rx="8" fill="#4ECDC4" transform="rotate(7 315 250)"/>
  <path d="M370 360l14 30 33 4-24 23 6 33-29-16-29 16 6-33-24-23 33-4z" fill="#FFC94D" stroke="#2D2A32" stroke-width="8" stroke-linejoin="round"/>
</svg>
```

`pwa-assets.config.ts`:
```ts
import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/logo.svg'],
});
```

`vite.config.ts` (vervangen):
```ts
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { playwright } from '@vitest/browser-playwright';
import { VitePWA } from 'vite-plugin-pwa';

const pwa = VitePWA({
  registerType: 'autoUpdate',
  pwaAssets: { config: true },
  manifest: {
    name: 'Collagemaker',
    short_name: 'Collage',
    description: 'Maak je eigen collages met foto\'s, stickers en tekst.',
    lang: 'nl',
    start_url: '.',
    display: 'standalone',
    orientation: 'any',
    background_color: '#FFF8EE',
    theme_color: '#FF6B6B',
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,woff2,png,ico,webmanifest}'],
    maximumFileSizeToCacheInBytes: 5_000_000,
    cleanupOutdatedCaches: true,
  },
});

export default defineConfig({
  plugins: [svelte(), ...(process.env.VITEST ? [] : [pwa])],
  test: {
    include: ['src/**/*.test.ts'],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
    },
  },
});
```

Voeg toe aan `src/vite-env.d.ts`:
```ts
/// <reference types="vite-plugin-pwa/client" />
```

Voeg toe aan `src/main.ts`:
```ts
import { registerSW } from 'virtual:pwa-register';
registerSW({ immediate: true });
```

- [ ] **Step 4: Run tests — moeten slagen**

Run: `npm run build` — Expected: build slaagt, uitvoer noemt `sw.js` en een precache met honderden items (stickers en lettertypes).
Run: `npx playwright test e2e/offline.spec.ts`
Expected: PASS (chromebook), offline-test SKIP op ipad, manifest-test PASS op beide.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: make the app installable and fully offline with a precaching service worker"
```

---

### Task 22: Rondleiding met Driver.js

**Files:**
- Create: `src/tour/tour.ts`, `src/tour/tour.test.ts`, `e2e/tour.spec.ts`
- Modify: `src/ui/EditorScherm.svelte`, `src/app.css`, `e2e/helpers.ts`

**Interfaces:**
- Produces:
  - `type TourId = 'editor' | Paneel`
  - `TOURS: Record<TourId, DriveStep[]>`
  - `tourGezien(id: TourId): boolean`, `markeerGezien(id: TourId): void` (localStorage-sleutel `collage-tours-gezien`, altijd in try/catch)
  - `startTour(id: TourId): void` (slaat stappen over waarvan het element niet bestaat)
  - Gedrag: de editor-tour start automatisch bij de eerste keer; de help-knop start de tour van het open paneel, of anders de editor-tour.

- [ ] **Step 1: Installeren**

Run: `npm install driver.js`

- [ ] **Step 2: Failing tests schrijven**

`src/tour/tour.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TOURS, markeerGezien, tourGezien } from './tour';

beforeEach(() => localStorage.clear());

describe('tour', () => {
  it('heeft een tour voor de editor en voor elk paneel', () => {
    for (const id of ['editor', 'foto', 'tekst', 'stickers', 'vormen', 'tekenen', 'achtergrond'] as const) {
      expect(TOURS[id].length, id).toBeGreaterThan(0);
    }
    expect(TOURS.editor).toHaveLength(5);
  });

  it('onthoudt welke tours gezien zijn', () => {
    expect(tourGezien('editor')).toBe(false);
    markeerGezien('editor');
    expect(tourGezien('editor')).toBe(true);
    expect(tourGezien('foto')).toBe(false);
  });

  it('kapotte opslag geeft geen fout', () => {
    localStorage.setItem('collage-tours-gezien', '{kapot');
    expect(tourGezien('editor')).toBe(false);
  });
});
```

`e2e/tour.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('rondleiding start de eerste keer en via de help-knop', async ({ page }) => {
  await page.goto('/');
  await page.click('#start-nieuw');
  await page.click('#formaat-vierkant');
  await expect(page.locator('.driver-popover')).toBeVisible();
  await expect(page.locator('.driver-popover-title')).toHaveText("Foto's");
  await page.keyboard.press('Escape');
  await expect(page.locator('.driver-popover')).toHaveCount(0);

  await page.click('#knop-terug');
  await page.getByRole('button', { name: 'Stoppen' }).click();
  await page.click('#start-nieuw');
  await page.click('#formaat-vierkant');
  await page.waitForTimeout(500);
  await expect(page.locator('.driver-popover')).toHaveCount(0);

  await page.click('#tool-stickers');
  await page.click('#knop-help');
  await expect(page.locator('.driver-popover-title')).toHaveText('Stickerpakketten');
});
```

`e2e/helpers.ts`: vervang `export const test = base;` door:
```ts
const ALLE_TOURS = ['editor', 'foto', 'tekst', 'stickers', 'vormen', 'tekenen', 'achtergrond'];

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript((tours) => {
      try { localStorage.setItem('collage-tours-gezien', JSON.stringify(tours)); } catch { /* opslag geblokkeerd */ }
    }, ALLE_TOURS);
    await use(page);
  },
});
```

- [ ] **Step 3: Run tests — moeten falen**

Run: `npx vitest run src/tour && npx playwright test e2e/tour.spec.ts --project=chromebook`
Expected: FAIL — `Failed to resolve import "./tour"` en geen `.driver-popover`.

- [ ] **Step 4: Implementatie**

`src/tour/tour.ts`:
```ts
import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import type { Paneel } from '../ui/types';

export type TourId = 'editor' | Paneel;

const stap = (element: string, title: string, description: string): DriveStep => ({ element, popover: { title, description } });

export const TOURS: Record<TourId, DriveStep[]> = {
  editor: [
    stap('#tool-foto', "Foto's", 'Tik hier om een foto toe te voegen. Je kan ook een foto op je collage slepen.'),
    stap('#tool-stickers', 'Stickers', 'Kies leuke stickers. Maak ze groter of kleiner met twee vingers of met de hoekjes.'),
    stap('#canvas-vlak', 'Je collage', 'Tik op iets om het te kiezen. Sleep om het te verplaatsen.'),
    stap('#knop-ongedaan', 'Oeps?', 'Foutje gemaakt? Tik hier en het is weer weg.'),
    stap('#knop-bewaar', 'Bewaren', 'Klaar? Bewaar je collage als foto of als PDF.'),
  ],
  foto: [
    stap('#foto-kiezen', 'Foto kiezen', 'Kies een foto van dit toestel.'),
    stap('#foto-bijsnijden', 'Bijsnijden', 'Knip een stukje uit je foto.'),
    stap('#masker-hart', 'Vormen', 'Maak je foto rond, of een hart, of een ster.'),
    stap('#kader-polaroid', 'Kaders', 'Zet een kader rond je foto.'),
    stap('#filter-sepia', 'Filters', 'Geef je foto een andere kleur.'),
  ],
  tekst: [
    stap('#tekst-nieuw', 'Nieuwe tekst', 'Tik hier en typ je tekst.'),
    stap('#font-bangers', 'Letters', 'Kies een lettertype dat bij je collage past.'),
    stap('#wordart-regenboog', 'WordArt', 'Maak je tekst extra mooi: in een boog, als regenboog of met neon.'),
  ],
  stickers: [
    stap('#pakket-dieren', 'Stickerpakketten', 'Kies een pakket: dieren, ruimte, sport en nog veel meer.'),
    stap('.sticker-knop', 'Sticker plakken', 'Tik op een sticker om hem op je collage te zetten.'),
  ],
  vormen: [
    stap('#vorm-hart', 'Vormen', 'Tik op een vorm om hem toe te voegen.'),
  ],
  tekenen: [
    stap('#pen-pen', 'Pennen', 'Kies een pen, stift of krijt.'),
    stap('#pen-gum', 'Gum', 'Met de gum veeg je een tekening weer weg.'),
    stap('#canvas-vlak', 'Tekenen', 'Teken met je vinger of met de muis op je collage.'),
  ],
  achtergrond: [
    stap('#achtergrond-tabs', 'Achtergrond', 'Kies een kleur, een verloop, een patroon of een foto voor de achtergrond.'),
  ],
};

const SLEUTEL = 'collage-tours-gezien';

function gelezen(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(SLEUTEL) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function tourGezien(id: TourId): boolean {
  return gelezen().includes(id);
}

export function markeerGezien(id: TourId): void {
  try {
    localStorage.setItem(SLEUTEL, JSON.stringify([...new Set([...gelezen(), id])]));
  } catch { /* opslag geblokkeerd: tour komt dan opnieuw */ }
}

export function startTour(id: TourId): void {
  const steps = TOURS[id].filter((s) => typeof s.element !== 'string' || document.querySelector(s.element));
  if (!steps.length) return;
  const d = driver({
    showProgress: steps.length > 1,
    progressText: '{{current}} van {{total}}',
    nextBtnText: 'Verder',
    prevBtnText: 'Terug',
    doneBtnText: 'Klaar',
    popoverClass: 'kind-popover',
    allowClose: true,
    steps,
    onDestroyed: () => markeerGezien(id),
  });
  d.drive();
}
```

Voeg toe aan `src/app.css`:
```css
.driver-popover.kind-popover { border-radius: 24px; padding: 20px; font-family: 'Nunito', system-ui, sans-serif; max-width: 340px; }
.kind-popover .driver-popover-title { font-size: 1.4rem; font-weight: 800; }
.kind-popover .driver-popover-description { font-size: 1.1rem; line-height: 1.45; }
.kind-popover .driver-popover-footer button { min-height: 48px; min-width: 48px; padding: 0 18px; font-size: 1rem; font-weight: 700; border-radius: 14px; text-shadow: none; }
.kind-popover .driver-popover-next-btn { background: var(--koraal); color: #fff; border: 0; }
.kind-popover .driver-popover-close-btn { width: 44px; height: 44px; font-size: 1.6rem; }
```

In `src/ui/EditorScherm.svelte`:

Import: `import { startTour, tourGezien } from '../tour/tour';`
Aan het einde van `onMount` (na het aanmaken van `controller` en de test-haak):
```ts
    if (!tourGezien('editor')) setTimeout(() => startTour('editor'), 300);
```
Voeg aan `<BovenBalk ... />` de prop toe: `onHelp={() => startTour(paneel ?? 'editor')}`

- [ ] **Step 5: Run alle tests**

Run: `npm test`
Expected: PASS (alle unit-tests).
Run: `npm run test:e2e`
Expected: PASS op beide projecten (export- en offline-tests SKIP op ipad).
Run: `npm run check`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Driver.js guided tours for the editor and every panel"
```

---

### Task 23: Handmatige controle op echte toestellen

**Files:** geen codewijzigingen tenzij er fouten gevonden worden.

- [ ] **Step 1: Build serveren op het lokale netwerk**

Run: `npm run build && npx vite preview --host --port 4173`
Open op de iPad en op een Chromebook `http://<ip-van-pc>:4173`. (Service workers werken alleen via https of localhost; voor de offline-controle op de iPad: zet de build op Cloudflare Pages of een andere https-host.)

- [ ] **Step 2: Checklist doorlopen en resultaat noteren in de commit-boodschap of een issue**

iPad (Safari, liggend en staand):
- Foto uit de fotogalerij (ook een HEIC-foto) toevoegen. Knijpen en draaien met twee vingers. Bijsnijden.
- Tekst typen: toetsenbord verschijnt meteen na "Nieuwe tekst".
- Foto slepen vanuit Foto's in Split View naar de collage.
- Pagina zoomt niet bij knijpen naast het canvas. Geen blauwe tik-flits.
- Bewaren als PNG opent het deelmenu; "Bewaar afbeelding" zet hem in Foto's.
- Toevoegen aan beginscherm; daarna in vliegtuigmodus openen en een collage maken.

Chromebook (Chrome):
- Muis: slepen, hoekjes, rechtermuisknop opent de contextbalk, Ctrl+Z, Delete, pijltjes.
- Touchscreen (indien aanwezig): zelfde als iPad.
- Afbeelding uit een andere tab slepen. Bij een site die het blokkeert verschijnt de melding.
- Ctrl+V van een gekopieerde afbeelding.
- Bewaren als PNG en PDF downloadt bestanden.

- [ ] **Step 3: Gevonden fouten**

Voor elke fout: schrijf eerst een falende test (unit of e2e) die de fout aantoont, los op, commit met `fix: ...`.
