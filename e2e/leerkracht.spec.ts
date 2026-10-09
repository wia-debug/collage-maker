import { test, expect, metInstellingen } from './helpers';
import type { Page } from '@playwright/test';

async function openMenu(page: Page, code = '123456') {
  await page.click('#knop-leerkracht');
  for (const c of code) await page.click(`#cijfer-${c}`);
}

test('verkeerde code geeft geen toegang', async ({ page }) => {
  await page.goto('/');
  await openMenu(page, '111111');
  await expect(page.getByText('Dat is niet de juiste code.')).toBeVisible();
  await expect(page.locator('#alles-wissen')).toHaveCount(0);
});

test('toestel wisselen naar iPad toont de profielkeuze', async ({ page }) => {
  await page.goto('/');
  await openMenu(page);
  await page.click('#toestel-ipad');
  await page.click('#leerkracht-sluit');
  await expect(page.getByRole('heading', { name: 'Wie ben jij?' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Wie ben jij?' })).toBeVisible();
});

test('PC: profielen aanzetten', async ({ page }) => {
  await page.goto('/');
  await openMenu(page);
  await page.click('#profielen-aan');
  await expect(page.locator('#profielen-aan')).toHaveAttribute('aria-pressed', 'true');
  await page.click('#leerkracht-sluit');
  await expect(page.getByRole('heading', { name: 'Wie ben jij?' })).toBeVisible();
});

test('profiel: pincode resetten en profiel wissen', async ({ page }) => {
  await metInstellingen(page, { toestel: 'ipad' });
  await page.goto('/');
  await page.click('#profiel-nieuw');
  await page.fill('#profiel-naam', 'Sem');
  await page.click('#profiel-verder');
  for (let i = 0; i < 6; i++) await page.click('#symbool-star');
  await page.click('#knop-wissel');
  await openMenu(page);
  await page.locator('[id^="pin-reset-"]').click();
  for (let i = 0; i < 6; i++) await page.click('#symbool-car');
  await expect(page.getByText('Nieuwe code bewaard.')).toBeVisible();
  await page.click('#leerkracht-sluit');
  await page.getByRole('button', { name: 'Sem' }).click();
  for (let i = 0; i < 3; i++) await page.click('#symbool-car');
  await expect(page.locator('#start-nieuw')).toBeVisible();

  await page.click('#knop-wissel');
  await openMenu(page);
  await page.locator('[id^="profiel-wis-"]').click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Wissen', exact: true }).click();
  await page.click('#leerkracht-sluit');
  await expect(page.getByRole('button', { name: 'Sem' })).toHaveCount(0);
});

test('alles wissen begint opnieuw', async ({ page }) => {
  await page.goto('/');
  await page.click('#start-nieuw');
  await page.click('#formaat-vierkant');
  await page.waitForFunction(() => window.__collage?.controller);
  await page.evaluate(() => {
    const { editor, maakVorm } = window.__collage;
    editor.add(maakVorm({ x: 600, y: 600, vorm: 'ster', breedte: 300, hoogte: 300 }));
  });
  await page.click('#knop-terug');
  await expect(page.locator('#mijn-collages')).toBeVisible();
  await openMenu(page);
  await page.click('#alles-wissen');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Alles wissen', exact: true }).click();
  await expect(page.locator('#start-nieuw')).toBeVisible();
  await expect(page.locator('#mijn-collages')).toHaveCount(0);
});

test('actief profiel wissen brengt terug naar de profielkeuze', async ({ page }) => {
  await metInstellingen(page, { toestel: 'ipad' });
  await page.goto('/');
  await page.click('#profiel-nieuw');
  await page.fill('#profiel-naam', 'Sem');
  await page.click('#profiel-verder');
  for (let i = 0; i < 6; i++) await page.click('#symbool-star');
  await expect(page.locator('#start-nieuw')).toBeVisible();
  await openMenu(page);
  await page.locator('[id^="profiel-wis-"]').click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Wissen', exact: true }).click();
  await page.click('#leerkracht-sluit');
  await expect(page.getByRole('heading', { name: 'Wie ben jij?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sem' })).toHaveCount(0);
});
