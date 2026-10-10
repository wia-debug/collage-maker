import { test, expect, metInstellingen, openNieuweCollage } from './helpers';
import type { Page } from '@playwright/test';

async function zaaiCollage(page: Page, naam: string, dagenOud: number) {
  await page.evaluate(async ([n, dagen]) => {
    const db = (window as any).__opslag.db;
    const nu = Date.now();
    const id = crypto.getRandomValues(new Uint32Array(4)).join('-');
    const data = { id, versie: 1, naam: n, profielId: null, formaat: 'vierkant', achtergrond: { soort: 'kleur', kleur: '#FFFFFF' }, elementen: [], aangemaakt: nu, gewijzigd: nu - (dagen as number) * 86_400_000 };
    await db.collages.put({ id, profielId: '', naam: n, gewijzigd: data.gewijzigd, data, voorbeeld: null });
  }, [naam, dagenOud] as const);
}

const voegVormToe = (page: Page) => page.evaluate(() => {
  const { editor, maakVorm } = window.__collage;
  editor.add(maakVorm({ x: 600, y: 600, vorm: 'ster', breedte: 300, hoogte: 300 }));
});

const laatPutMislukken = (page: Page) => page.evaluate(() => {
  const t = (window as any).__opslag.db.collages;
  t.__origineel ??= t.put.bind(t);
  t.put = () => Promise.reject(new Error('vol'));
});
const herstelPut = (page: Page) => page.evaluate(() => {
  const t = (window as any).__opslag.db.collages;
  t.put = t.__origineel;
});

test('I1: opslag geblokkeerd geeft een vriendelijk scherm met Opnieuw proberen', async ({ page }) => {
  await page.addInitScript(() => {
    IDBFactory.prototype.open = () => { throw new Error('geblokkeerd'); };
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Er ging iets mis' })).toBeVisible();
  await expect(page.getByText('Ik kan niets bewaren op dit toestel.')).toBeVisible();
  await expect(page.locator('#opnieuw-proberen')).toBeVisible();
});

test('I2: mislukte autosave + Terug blijft in de editor tot je kiest', async ({ page }) => {
  await openNieuweCollage(page);
  await laatPutMislukken(page);
  await voegVormToe(page);
  await page.click('#knop-terug');
  const dialoog = page.getByRole('alertdialog');
  await expect(dialoog).toContainText('Je collage is niet bewaard');
  await dialoog.getByRole('button', { name: 'Verder werken' }).click();
  await expect(page.locator('#knop-terug')).toBeVisible();
  await page.click('#knop-terug');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Bewaren', exact: true }).click();
  await expect(page.locator('#export-png')).toBeVisible();
  await page.click('#export-sluit');
  await page.click('#knop-terug');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Toch stoppen' }).click();
  await expect(page.locator('#start-nieuw')).toBeVisible();
});

test('I2/M4: een latere bewaarfout wordt opnieuw gemeld nadat bewaren weer lukte', async ({ page }) => {
  await openNieuweCollage(page);
  const melding = page.getByText('Bewaren lukte niet. Bewaar je collage als foto.');
  await laatPutMislukken(page);
  await voegVormToe(page);
  await expect(melding).toHaveCount(1);
  await herstelPut(page);
  await voegVormToe(page);
  await expect.poll(() => page.evaluate(() => (window as any).__opslag.db.collages.count())).toBe(1);
  await laatPutMislukken(page);
  await voegVormToe(page);
  await expect(melding).toHaveCount(2);
});

test('M3: dubbel tikken op Terug sluit maar één keer af', async ({ page }) => {
  await openNieuweCollage(page);
  await page.evaluate(() => {
    const t = (window as any).__opslag.db.collages;
    const put = t.put.bind(t);
    (window as any).__puts = 0;
    t.put = (...a: unknown[]) => { (window as any).__puts++; return put(...a); };
  });
  await voegVormToe(page);
  await page.dblclick('#knop-terug');
  await expect(page.locator('#start-nieuw')).toBeVisible();
  // één keer de autosave en één keer het voorbeeld
  expect(await page.evaluate(() => (window as any).__puts)).toBe(2);
});

test('M1: de opruimvraag verschijnt niet op de profielkiezer', async ({ page }) => {
  await metInstellingen(page, { toestel: 'ipad' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Wie ben jij?' })).toBeVisible();
  await zaaiCollage(page, 'Oud', 40);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Wie ben jij?' })).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test('M5: op iPad staat "Om verder te werken" niet in het bewaar-scherm', async ({ page }) => {
  await metInstellingen(page, { toestel: 'ipad' });
  await page.goto('/');
  await page.click('#profiel-nieuw');
  await page.fill('#profiel-naam', 'Mila');
  await page.click('#avatar-rocket');
  await page.click('#profiel-verder');
  for (const s of ['star', 'heart', 'cloud']) await page.click(`#symbool-${s}`);
  for (const s of ['star', 'heart', 'cloud']) await page.click(`#symbool-${s}`);
  await page.click('#start-nieuw');
  await page.click('#formaat-vierkant');
  await page.waitForFunction(() => window.__collage?.controller);
  await page.click('#knop-bewaar');
  await expect(page.locator('#export-png')).toBeVisible();
  await expect(page.locator('#export-collage')).toHaveCount(0);
});

test('M8: een collage die niet meer bestaat geeft een melding en verdwijnt uit de lijst', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#start-nieuw')).toBeVisible();
  await zaaiCollage(page, 'Spook', 1);
  await page.reload();
  const knop = page.getByRole('button', { name: 'Spook', exact: true });
  await expect(knop).toBeVisible();
  await page.evaluate(() => (window as any).__opslag.db.collages.clear());
  await knop.click();
  await expect(page.getByText('Deze collage bestaat niet meer.')).toBeVisible();
  await expect(knop).toHaveCount(0);
});
