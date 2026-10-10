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
