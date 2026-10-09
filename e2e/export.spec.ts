import { test, expect, openNieuweCollage } from './helpers';

test('collage bewaren als PNG en als PDF', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromebook', 'Downloaden testen we op Chromebook; iPad gebruikt het deelmenu.');
  await openNieuweCollage(page);
  await page.evaluate(() => {
    const { editor, maakVorm } = window.__collage;
    editor.add(maakVorm({ x: 600, y: 600, vorm: 'ster', breedte: 400, hoogte: 400 }));
  });

  await page.click('#knop-bewaar');
  await page.click('#export-png');
  const png = page.waitForEvent('download');
  await page.click('#export-bewaar');
  expect((await png).suggestedFilename()).toMatch(/^mijn-collage-\d{4}-\d{2}-\d{2}\.png$/);

  await page.click('#knop-bewaar');
  await page.click('#export-pdf');
  const pdf = page.waitForEvent('download');
  await page.click('#export-bewaar');
  expect((await pdf).suggestedFilename()).toMatch(/\.pdf$/);
});

test('toetsen doen niets zolang de exportdialoog open staat', async ({ page }) => {
  await openNieuweCollage(page);
  await page.evaluate(() => {
    const { editor, maakVorm } = window.__collage;
    editor.add(maakVorm({ x: 600, y: 600, vorm: 'ster', breedte: 400, hoogte: 400 }));
  });
  await page.click('#knop-bewaar');
  await expect(page.locator('#export-sluit')).toBeVisible();
  await page.evaluate(() => window.__collage.editor.select(window.__collage.editor.get().collage.elementen[0].id));
  await page.keyboard.press('Delete');
  expect(await page.evaluate(() => window.__collage.editor.get().collage.elementen.length)).toBe(1);
  await page.click('#export-sluit');
  await page.keyboard.press('Delete');
  expect(await page.evaluate(() => window.__collage.editor.get().collage.elementen.length)).toBe(0);
});
