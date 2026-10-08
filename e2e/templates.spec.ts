import { test, expect, elementen, tikOpCanvas, maakPng } from './helpers';

test('template kiezen en een fotovak vullen', async ({ page }) => {
  await page.goto('/');
  await page.click('#start-template');
  await page.click('#template-raster-4');
  await page.waitForFunction(() => window.__collage?.controller);
  let els = await elementen(page);
  expect(els).toHaveLength(4);
  const vak = els[0];
  const chooser = page.waitForEvent('filechooser');
  await tikOpCanvas(page, vak.x, vak.y);
  await (await chooser).setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: await maakPng(page) });
  await page.waitForFunction((id) => window.__collage.editor.get().collage.elementen.find((e: any) => e.id === id).assetId, vak.id);
  els = await elementen(page);
  expect(els[0].uitsnede).not.toBeNull();
});
