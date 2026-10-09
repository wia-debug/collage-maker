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
