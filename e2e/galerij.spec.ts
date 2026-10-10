import { test, expect, openLeerkrachtMenu, metInstellingen, elementen } from './helpers';
import type { Page } from '@playwright/test';

async function zaai(page: Page, namen: string[]) {
  await page.waitForFunction(() => (window as any).__opslag?.db);
  await page.evaluate(async (lijst) => {
    const o = (window as any).__opslag;
    for (const [i, n] of lijst.entries()) await o.bewaarInzending(o.db, n, await o.testPakket(), Date.now() + i);
  }, namen);
}

test('galerij: bekijken, wissen, ZIP en PDF downloaden', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromebook', 'Playwright-WebKit op Windows kan geen Blob in IndexedDB bewaren; getest in Chromium.');

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
  await page.getByRole('alertdialog').getByRole('button', { name: 'Alles wissen', exact: true }).click();
  await expect(page.locator('#galerij-leeg')).toBeVisible();
});

test('diavoorstelling: bladeren, naam, pauze en sluiten', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromebook', 'Playwright-WebKit op Windows kan geen Blob in IndexedDB bewaren; getest in Chromium.');

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

test('diavoorstelling speelt automatisch verder', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromebook', 'Playwright-WebKit op Windows kan geen Blob in IndexedDB bewaren; getest in Chromium.');

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

test('open als kopie: met profielen eerst een profiel kiezen', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromebook', 'Playwright-WebKit op Windows kan geen Blob in IndexedDB bewaren; getest in Chromium.');

  await metInstellingen(page, { toestel: 'pc', profielenAan: true, mastercode: '123456' });
  await page.goto('/');
  await zaai(page, ['Lies']);
  await openLeerkrachtMenu(page);
  await page.click('#galerij-open');
  await page.locator('.inzending-open').first().click();
  await expect(page.getByText('Kies eerst een profiel. Dan kan je de collage openen.')).toBeVisible();
  await expect(page.locator('#galerij')).toBeVisible();
  await page.click('#galerij-sluit');

  await page.click('#profiel-nieuw');
  await page.fill('#profiel-naam', 'Mila');
  await page.click('#profiel-verder');
  for (const s of ['star', 'heart', 'cloud', 'star', 'heart', 'cloud']) await page.click(`#symbool-${s}`);
  await expect(page.locator('#start-nieuw')).toBeVisible();
  await openLeerkrachtMenu(page);
  await page.click('#galerij-open');
  await page.locator('.inzending-open').first().click();
  await expect(page.locator('#galerij')).toHaveCount(0);
  await page.waitForFunction(() => window.__collage?.controller);
  expect(await elementen(page)).toHaveLength(1);
});
