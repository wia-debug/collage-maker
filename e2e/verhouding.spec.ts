import { test, expect, openNieuweCollage, elementen, maakPng } from './helpers';

test('verhouding vast en los via de contextbalk', async ({ page }) => {
  await openNieuweCollage(page);
  await page.click('#tool-foto');
  const chooser = page.waitForEvent('filechooser');
  await page.click('#foto-kiezen');
  await (await chooser).setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: await maakPng(page) });
  await page.waitForFunction(() => window.__collage.editor.get().collage.elementen.length === 1);
  const knop = page.locator('#ctx-verhouding');
  await expect(knop).toHaveAttribute('aria-pressed', 'true');
  await expect(knop).toContainText('Verhouding los');
  expect(await page.evaluate(() => window.__collage.controller.stage.findOne('Transformer').keepRatio())).toBe(true);
  await knop.click();
  await expect(knop).toHaveAttribute('aria-pressed', 'false');
  await expect(knop).toContainText('Verhouding vast');
  expect((await elementen(page))[0].verhoudingVast).toBe(false);
  expect(await page.evaluate(() => window.__collage.controller.stage.findOne('Transformer').enabledAnchors().length)).toBe(8);
});
