import { test, expect, openNieuweCollage, elementen, metInstellingen } from './helpers';

test('Chromebook: bewaren als .collage en later weer openen', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromebook', 'Downloaden testen we op Chromebook');
  await metInstellingen(page, { toestel: 'chromebook' });
  await openNieuweCollage(page);
  await page.evaluate(() => {
    const { editor, maakVorm } = window.__collage;
    editor.add(maakVorm({ x: 600, y: 600, vorm: 'ster', breedte: 300, hoogte: 300 }));
  });
  await page.click('#knop-bewaar');
  await page.click('#export-collage');
  const download = page.waitForEvent('download');
  await page.click('#export-bewaar');
  const d = await download;
  expect(d.suggestedFilename()).toMatch(/\.collage$/);
  const pad = info.outputPath('mijn.collage');
  await d.saveAs(pad);

  await page.click('#knop-terug');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.locator('#start-open')).toBeVisible();

  const kiezer = page.waitForEvent('filechooser');
  await page.click('#start-open');
  await (await kiezer).setFiles(pad);
  await page.waitForFunction(() => window.__collage?.controller);
  const els = await elementen(page);
  expect(els).toHaveLength(1);
  expect(els[0].vorm).toBe('ster');
});

test('kapot bestand geeft een melding', async ({ page }) => {
  await page.goto('/');
  const kiezer = page.waitForEvent('filechooser');
  await page.click('#start-open');
  await (await kiezer).setFiles({ name: 'kapot.collage', mimeType: 'application/zip', buffer: Buffer.from('geen zip') });
  await expect(page.getByText('Dit bestand kan ik niet openen.')).toBeVisible();
  await expect(page.locator('#start-nieuw')).toBeVisible();
});

test('Chromebook: Stoppen-dialoog biedt bewaren als bestand aan', async ({ page }) => {
  await metInstellingen(page, { toestel: 'chromebook' });
  await openNieuweCollage(page);
  await page.evaluate(() => {
    const { editor, maakVorm } = window.__collage;
    editor.add(maakVorm({ x: 600, y: 600, vorm: 'ster', breedte: 300, hoogte: 300 }));
  });
  await page.click('#knop-terug');
  await page.getByRole('button', { name: 'Bewaar als bestand' }).click();
  await expect(page.locator('#export-collage')).toBeVisible();
});

test('iPad toont geen knop om een bestand te openen', async ({ page }) => {
  await metInstellingen(page, { toestel: 'ipad' });
  await page.goto('/');
  await page.click('#profiel-nieuw');
  await page.fill('#profiel-naam', 'Kim');
  await page.click('#profiel-verder');
  for (let i = 0; i < 6; i++) await page.click('#symbool-heart');
  await expect(page.locator('#start-nieuw')).toBeVisible();
  await expect(page.locator('#start-open')).toHaveCount(0);
});
