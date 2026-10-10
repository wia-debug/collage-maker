import { test as base, expect, type Page } from '@playwright/test';

const ALLE_TOURS = ['editor', 'foto', 'tekst', 'stickers', 'vormen', 'tekenen', 'achtergrond', 'leerkracht'];

export interface E2eInstellingen { toestel: 'ipad' | 'chromebook' | 'pc'; profielenAan?: boolean; mastercode?: string }

export async function richtIn(page: Page): Promise<void> {
  await page.addInitScript((tours) => {
    try { localStorage.setItem('collage-tours-gezien', JSON.stringify(tours)); } catch { /* opslag geblokkeerd */ }
  }, ALLE_TOURS);
  await page.addInitScript(() => {
    (window as any).__e2eInstellingen = { toestel: 'pc', profielenAan: false, mastercode: '123456' };
  });
  // Zonder nepRelay is er geen relay: nooit de HTML-terugval van vite preview laten antwoorden.
  await page.route('**/__relay/**', (route) => route.fulfill({ status: 404 }));
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await richtIn(page);
    await use(page);
  },
});

// Init-scripts lopen in volgorde: deze overschrijft de standaard. Roep aan vóór de eerste page.goto.
export async function metInstellingen(page: Page, cfg: E2eInstellingen): Promise<void> {
  await page.addInitScript((c) => { (window as any).__e2eInstellingen = c; }, cfg);
}
export { expect };

export async function nieuwToestel(browser: import('@playwright/test').Browser, cfg?: E2eInstellingen): Promise<Page> {
  const context = await browser.newContext({ serviceWorkers: 'block', baseURL: 'http://localhost:4173' });
  const p = await context.newPage();
  await richtIn(p);
  if (cfg) await metInstellingen(p, cfg);
  return p;
}

// Nagebootste relay met brievenbussen, zoals de Worker; beide toestellen delen dezelfde opslag in het testproces.
// POST opent een brievenbus (token), PUT kan alleen in een open lege brievenbus, GET vraagt het token.
// Later geregistreerde routes gaan voor, dus dit overschrijft de standaard-404 uit richtIn.
export async function nepRelay(pages: Page[]): Promise<Map<string, Buffer>> {
  const opslag = new Map<string, Buffer>();
  const bussen = new Map<string, string>();
  let teller = 0;
  for (const p of pages) {
    await p.route('**/__relay/relay/*', async (route) => {
      const verzoek = route.request();
      const sleutel = verzoek.url().split('/').pop()!;
      const methode = verzoek.method();
      if (methode === 'POST') {
        if (bussen.has(sleutel)) { await route.fulfill({ status: 409 }); return; }
        const token = `token${++teller}`.padEnd(32, '0');
        bussen.set(sleutel, token);
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ token }) });
        return;
      }
      if (methode === 'PUT') {
        if (!bussen.has(sleutel)) { await route.fulfill({ status: 404 }); return; }
        if (opslag.has(sleutel)) { await route.fulfill({ status: 409 }); return; }
        opslag.set(sleutel, verzoek.postDataBuffer() ?? Buffer.alloc(0));
        await route.fulfill({ status: 201 });
        return;
      }
      const token = bussen.get(sleutel);
      if (token && (await verzoek.headerValue('x-sleutel')) !== token) { await route.fulfill({ status: 403 }); return; }
      const d = opslag.get(sleutel);
      if (!token || !d) { await route.fulfill({ status: 404 }); return; }
      opslag.delete(sleutel);
      bussen.delete(sleutel);
      await route.fulfill({ status: 200, body: d, contentType: 'application/octet-stream' });
    });
  }
  return opslag;
}

export async function leesKlasCode(p: Page): Promise<string[]> {
  await expect(p.locator('#klas-code [data-symbool]')).toHaveCount(4, { timeout: 15_000 });
  return p.locator('#klas-code [data-symbool]').evaluateAll((els) => els.map((e) => e.getAttribute('data-symbool')!));
}

export async function openLeerkrachtMenu(p: Page, code = '123456'): Promise<void> {
  await p.click('#knop-leerkracht');
  for (const c of code) await p.click(`#cijfer-${c}`);
}

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

export async function tikOpCanvas(page: Page, x: number, y: number): Promise<void> {
  // Konva tekent (ook de hit-laag) via batchDraw in een animatieframe; wacht tot dat gebeurd is.
  await page.evaluate(() => new Promise<void>((klaar) => requestAnimationFrame(() => requestAnimationFrame(() => klaar()))));
  const p = await page.evaluate(([cx, cy]) => window.__collage.controller.naarScherm(cx, cy), [x, y]);
  await page.mouse.click(p.x, p.y);
}
