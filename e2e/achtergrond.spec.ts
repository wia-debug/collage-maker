import { test, expect, openNieuweCollage } from './helpers';

const achtergrond = (page: import('@playwright/test').Page) => page.evaluate(() => window.__collage.editor.get().collage.achtergrond);

test('achtergrond: kleur, verloop met richting en patroon', async ({ page }) => {
  await openNieuweCollage(page);
  await page.click('#tool-achtergrond');
  await page.locator('#paneel-achtergrond .palet').getByRole('button', { name: '#FFE14D' }).click();
  expect(await achtergrond(page)).toEqual({ soort: 'kleur', kleur: '#FFE14D' });

  await page.click('#tab-verloop');
  await page.click('#verloop-3');
  await page.click('#hoek-45');
  expect(await achtergrond(page)).toMatchObject({ soort: 'verloop', van: '#4ECDC4', hoek: 45 });

  await page.click('#tab-patroon');
  await page.click('#patroon-sterren');
  expect(await achtergrond(page)).toMatchObject({ soort: 'patroon', patroon: 'sterren' });

  await page.click('#knop-ongedaan');
  expect((await achtergrond(page)).soort).toBe('verloop');
});

test('het achtergrondgereedschap haalt de selectie weg', async ({ page }) => {
  await openNieuweCollage(page);
  await page.click('#tool-vormen');
  await page.click('#vorm-hart');
  await expect(page.locator('#ctx-wissen')).toHaveCount(1);
  await page.click('#tool-achtergrond');
  await expect(page.locator('#ctx-wissen')).toHaveCount(0);
});
