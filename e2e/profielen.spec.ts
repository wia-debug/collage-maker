import { test, expect, metInstellingen } from './helpers';
import type { Page } from '@playwright/test';

async function maakProfielAan(page: Page, naam: string, pin: string[]) {
  await page.click('#profiel-nieuw');
  await page.fill('#profiel-naam', naam);
  await page.click('#avatar-rocket');
  await page.click('#profiel-verder');
  for (const s of pin) await page.click(`#symbool-${s}`);
  for (const s of pin) await page.click(`#symbool-${s}`);
}

test('iPad: profiel aanmaken, wisselen en met pincode terugkomen', async ({ page }) => {
  await metInstellingen(page, { toestel: 'ipad' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Wie ben jij?' })).toBeVisible();
  await maakProfielAan(page, 'Mila', ['star', 'heart', 'cloud']);
  await expect(page.locator('#start-nieuw')).toBeVisible();
  await expect(page.getByText('Mila')).toBeVisible();

  await page.click('#knop-wissel');
  await page.getByRole('button', { name: 'Mila' }).click();
  for (const s of ['star', 'star', 'star']) await page.click(`#symbool-${s}`);
  await expect(page.getByText('Dat is niet je code. Probeer opnieuw.')).toBeVisible();
  for (const s of ['star', 'heart', 'cloud']) await page.click(`#symbool-${s}`);
  await expect(page.locator('#start-nieuw')).toBeVisible();
});

test('nieuw profiel: twee verschillende pincodes worden geweigerd, lege naam kan niet verder', async ({ page }) => {
  await metInstellingen(page, { toestel: 'ipad' });
  await page.goto('/');
  await page.click('#profiel-nieuw');
  await expect(page.locator('#profiel-verder')).toBeDisabled();
  await page.fill('#profiel-naam', 'Noor');
  await page.click('#profiel-verder');
  for (const s of ['car', 'car', 'car']) await page.click(`#symbool-${s}`);
  for (const s of ['cake', 'car', 'car']) await page.click(`#symbool-${s}`);
  await expect(page.getByText('De codes zijn niet gelijk. Probeer opnieuw.')).toBeVisible();
});

test('PC zonder profielen gaat meteen naar het startscherm', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#start-nieuw')).toBeVisible();
  await expect(page.locator('#knop-wissel')).toHaveCount(0);
});

test('PC met profielen toont de profielkeuze', async ({ page }) => {
  await metInstellingen(page, { toestel: 'pc', profielenAan: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Wie ben jij?' })).toBeVisible();
});
