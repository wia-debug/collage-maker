import { test, expect } from './helpers';
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

test('oude collages: 40 dagen = vraag, 70 dagen = stil gewist', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#start-nieuw')).toBeVisible();
  await zaaiCollage(page, 'Vers', 2);
  await zaaiCollage(page, 'Oud', 40);
  await zaaiCollage(page, 'Heel oud', 70);
  await page.reload();
  await expect(page.getByRole('alertdialog')).toContainText('Deze oude collages wissen?');
  await expect(page.getByRole('alertdialog')).toContainText('Oud');
  await expect(page.getByRole('alertdialog')).not.toContainText('Heel oud');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Ja, wissen' }).click();
  await expect(page.getByRole('button', { name: 'Vers', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Oud', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Heel oud', exact: true })).toHaveCount(0);
});

test('Later houdt de collages en vraagt deze sessie niet opnieuw', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#start-nieuw')).toBeVisible();
  await zaaiCollage(page, 'Oud', 40);
  await page.reload();
  await page.getByRole('button', { name: 'Later' }).click();
  await expect(page.getByRole('button', { name: 'Oud', exact: true })).toBeVisible();
  await page.click('#start-nieuw');
  await page.click('#formaat-vierkant');
  await page.waitForFunction(() => window.__collage?.controller);
  await page.click('#knop-terug');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});
