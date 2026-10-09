import { test, expect, openNieuweCollage, elementen, metInstellingen } from './helpers';
import type { Page } from '@playwright/test';

async function voegVormToe(page: Page) {
  await page.evaluate(() => {
    const { editor, maakVorm } = window.__collage;
    editor.add(maakVorm({ x: 600, y: 600, vorm: 'hart', breedte: 300, hoogte: 300 }));
  });
}

async function wachtTotBewaard(page: Page, aantal = 1) {
  await expect.poll(() => page.evaluate(() => (window as any).__opslag.db.collages.count())).toBe(aantal);
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
