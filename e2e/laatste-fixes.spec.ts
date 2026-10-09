import { test, expect, openNieuweCollage, elementen, maakPng, metInstellingen } from './helpers';

const voegVormToe = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const { editor, maakVorm } = window.__collage;
    editor.add(maakVorm({ x: 600, y: 600, vorm: 'ster', breedte: 400, hoogte: 400 }));
  });

test('herladen vraagt bevestiging alleen na een wijziging', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromebook', 'beforeunload testen we op Chromebook');
  await metInstellingen(page, { toestel: 'chromebook' });
  await openNieuweCollage(page);
  const dialogen: string[] = [];
  page.on('dialog', (d) => { dialogen.push(d.type()); void d.accept(); });
  await page.reload();
  expect(dialogen).toEqual([]);
  await openNieuweCollage(page);
  await voegVormToe(page);
  // beforeunload vraagt alleen na een gebruikersgebaar
  await page.click('#canvas-vlak');
  await page.reload();
  expect(dialogen).toEqual(['beforeunload']);
});

test('Stoppen-dialoog blokkeert Delete', async ({ page }) => {
  await metInstellingen(page, { toestel: 'chromebook' });
  await openNieuweCollage(page);
  await voegVormToe(page);
  await page.click('#knop-terug');
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.keyboard.press('Delete');
  expect(await elementen(page)).toHaveLength(1);
});

test('Delete en Ctrl+D doen niets bij een vergrendeld element', async ({ page }) => {
  await openNieuweCollage(page);
  await voegVormToe(page);
  await page.click('#ctx-slot');
  await page.keyboard.press('Delete');
  await page.keyboard.press('Control+d');
  expect(await elementen(page)).toHaveLength(1);
});

test('selectie komt terug na het sluiten van de exportdialoog', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromebook');
  await openNieuweCollage(page);
  await voegVormToe(page);
  await expect(page.locator('#ctx-wissen')).toBeVisible();
  await page.click('#knop-bewaar');
  await page.click('#export-sluit');
  await expect(page.locator('#ctx-wissen')).toBeVisible();
});

test('meerdere foto\'s tegelijk liggen niet precies op elkaar', async ({ page }) => {
  await openNieuweCollage(page);
  const buffer = await maakPng(page);
  await page.click('#tool-foto');
  const chooser = page.waitForEvent('filechooser');
  await page.click('#foto-kiezen');
  await (await chooser).setFiles([
    { name: 'a.png', mimeType: 'image/png', buffer },
    { name: 'b.png', mimeType: 'image/png', buffer },
  ]);
  await page.waitForFunction(() => window.__collage.editor.get().collage.elementen.length === 2);
  const [a, b] = await elementen(page);
  expect(b.x).not.toBe(a.x);
});
