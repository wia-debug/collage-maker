import { test, expect, openNieuweCollage, elementen, nieuwToestel, nepRelay } from './helpers';
import type { Page } from '@playwright/test';

test.beforeEach(({}, info) => test.skip(info.project.name !== 'chromebook', 'WebRTC tussen twee contexten testen we in Chromium'));

async function leesCode(p: Page): Promise<string[]> {
  await expect(p.locator('#ontvang-code [data-symbool]')).toHaveCount(4);
  return p.locator('#ontvang-code [data-symbool]').evaluateAll((els) => els.map((e) => e.getAttribute('data-symbool')!));
}

async function maakEnDeel(zender: Page, code: string[]) {
  await zender.evaluate(() => {
    const { editor, maakVorm } = window.__collage;
    editor.add(maakVorm({ x: 600, y: 600, vorm: 'ster', breedte: 300, hoogte: 300 }));
  });
  await zender.click('#knop-deel');
  for (const s of code) await zender.click(`#symbool-${s}`);
}

test('rechtstreeks delen en openen als kopie', async ({ page, browser }) => {
  const ontvanger = await nieuwToestel(browser);
  await ontvanger.goto('/');
  await ontvanger.click('#start-ontvang');
  const code = await leesCode(ontvanger);

  await openNieuweCollage(page);
  await maakEnDeel(page, code);
  await expect(page.locator('#deel-klaar')).toContainText('Verstuurd!');

  await expect(ontvanger.locator('#ontvang-open')).toBeVisible({ timeout: 15_000 });
  await ontvanger.click('#ontvang-open');
  await ontvanger.waitForFunction(() => window.__collage?.controller);
  const els = await elementen(ontvanger);
  expect(els).toHaveLength(1);
  expect(els[0].vorm).toBe('ster');
});

test('verkeerde code: niemand gevonden', async ({ page }) => {
  await openNieuweCollage(page);
  await maakEnDeel(page, ['tree', 'tree', 'tree', 'tree']);
  await expect(page.getByRole('alert')).toContainText('Ik vind niemand met deze code.');
});

test('geblokkeerd netwerk: kind geeft toestemming, collage gaat via de server', async ({ page, browser }) => {
  const ontvanger = await nieuwToestel(browser);
  await nepRelay([page, ontvanger]);
  await ontvanger.goto('/');
  await ontvanger.click('#start-ontvang');
  const code = await leesCode(ontvanger);

  // Zender kan de PeerServer niet bereiken; korte time-out; regel "kind".
  await page.addInitScript(() => {
    (window as any).__peerOpties = { host: 'localhost', port: 9, path: '/', secure: false, debug: 0 };
    (window as any).__deelTimeoutMs = 1500;
  });
  await page.goto('/');
  await page.click('#knop-leerkracht');
  for (const c of '123456') await page.click(`#cijfer-${c}`);
  await page.click('#cloud-kind');
  await page.click('#leerkracht-sluit');
  await page.click('#start-nieuw');
  await page.click('#formaat-vierkant');
  await page.waitForFunction(() => window.__collage?.controller);
  await maakEnDeel(page, code);

  await expect(page.getByText('Mag je collage via onze server gaan?')).toBeVisible({ timeout: 10_000 });
  await page.click('#toestemming-ja');
  await expect(page.locator('#deel-klaar')).toContainText('Verstuurd via de server.');
  await expect(ontvanger.locator('#ontvang-open')).toBeVisible({ timeout: 10_000 });
});

test('geblokkeerd netwerk met regel "leerkracht": verkeerde code weigert, juiste code verstuurt', async ({ page, browser }) => {
  const ontvanger = await nieuwToestel(browser);
  await nepRelay([page, ontvanger]);
  await ontvanger.goto('/');
  await ontvanger.click('#start-ontvang');
  const code = await leesCode(ontvanger);
  await page.addInitScript(() => {
    (window as any).__peerOpties = { host: 'localhost', port: 9, path: '/', secure: false, debug: 0 };
    (window as any).__deelTimeoutMs = 1500;
  });
  await openNieuweCollage(page);
  await maakEnDeel(page, code);
  await expect(page.getByText('Vraag het aan je leerkracht.')).toBeVisible({ timeout: 10_000 });
  for (const c of '111111') await page.click(`#cijfer-${c}`);
  await expect(page.getByText('Dat is niet de juiste code.')).toBeVisible();
  for (const c of '123456') await page.click(`#cijfer-${c}`);
  await expect(page.locator('#deel-klaar')).toContainText('Verstuurd via de server.');
});

test('regel "nooit": melding, niets naar de server', async ({ page }) => {
  const opslag = await nepRelay([page]);
  await page.addInitScript(() => {
    (window as any).__peerOpties = { host: 'localhost', port: 9, path: '/', secure: false, debug: 0 };
    (window as any).__deelTimeoutMs = 1500;
  });
  await page.goto('/');
  await page.click('#knop-leerkracht');
  for (const c of '123456') await page.click(`#cijfer-${c}`);
  await page.click('#cloud-nooit');
  await page.click('#leerkracht-sluit');
  await page.click('#start-nieuw');
  await page.click('#formaat-vierkant');
  await page.waitForFunction(() => window.__collage?.controller);
  await maakEnDeel(page, ['star', 'star', 'star', 'star']);
  await expect(page.getByRole('alert')).toContainText('Delen lukt niet op dit netwerk.', { timeout: 10_000 });
  expect(opslag.size).toBe(0);
});

test('alleen bekijken en weggooien', async ({ page, browser }) => {
  const ontvanger = await nieuwToestel(browser);
  await ontvanger.goto('/');
  await ontvanger.click('#start-ontvang');
  const code = await leesCode(ontvanger);
  await openNieuweCollage(page);
  await maakEnDeel(page, code);
  await expect(ontvanger.locator('#ontvang-bekijk')).toBeVisible({ timeout: 15_000 });
  await ontvanger.click('#ontvang-bekijk');
  await expect(ontvanger.locator('img[alt="Ontvangen collage"]')).toBeVisible();
  await ontvanger.click('#bekijk-sluit');
  await ontvanger.click('#ontvang-weg');
  await expect(ontvanger.locator('#start-nieuw')).toBeVisible();
  await expect(ontvanger.locator('#mijn-collages')).toHaveCount(0);
});
