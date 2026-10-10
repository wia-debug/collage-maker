import { test, expect, openNieuweCollage, elementen, maakPng } from './helpers';

test('uitknipsel bewaren als sticker en weer gebruiken en wissen', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromebook', 'Playwright-WebKit op Windows kan geen Blob in IndexedDB bewaren; getest in Chromium.');
  await page.addInitScript(() => {
    (window as any).__achtergrondWeg = async (blob: Blob) => {
      const bmp = await createImageBitmap(blob);
      // Gewoon canvas i.p.v. OffscreenCanvas: Playwright-WebKit (ipad) kent OffscreenCanvas niet.
      const c = document.createElement('canvas');
      c.width = bmp.width;
      c.height = bmp.height;
      const x = c.getContext('2d')!;
      x.drawImage(bmp, 0, 0);
      x.clearRect(0, 0, bmp.width / 2, bmp.height);
      return new Promise<Blob>((klaar) => c.toBlob((b) => klaar(b!), 'image/png'));
    };
  });
  await openNieuweCollage(page);
  await page.click('#tool-foto');
  const chooser = page.waitForEvent('filechooser');
  await page.click('#foto-kiezen');
  await (await chooser).setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: await maakPng(page) });
  await page.waitForFunction(() => window.__collage.editor.get().collage.elementen.length === 1);
  await expect(page.locator('#ctx-maak-sticker')).toHaveCount(0);
  await page.click('#ctx-achtergrond-weg');
  await page.click('#ctx-maak-sticker');
  await expect(page.getByText('Bewaard in Mijn stickers')).toBeVisible();

  await page.click('#tool-stickers');
  await page.click('#pakket-mijn');
  await expect(page.locator('.eigen-sticker')).toHaveCount(1);
  await page.locator('.eigen-sticker').first().click();
  await page.waitForFunction(() => window.__collage.editor.get().collage.elementen.length === 2);
  const nieuw = (await elementen(page))[1];
  expect(nieuw).toMatchObject({ type: 'foto', uitknipsel: true, verhoudingVast: true });
  // De linkerhelft van de 400x300-PNG is transparant: bijgesneden blijft 200x300.
  expect(nieuw.breedte / nieuw.hoogte).toBeCloseTo(200 / 300, 2);

  // Een toegevoegde foto wordt geselecteerd en opent het Foto-paneel: Mijn stickers opnieuw openen.
  await page.click('#tool-stickers');
  await page.click('#pakket-mijn');
  await page.click('#mijn-bewerk');
  await page.locator('.eigen-wis').first().click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Wissen', exact: true }).click();
  await expect(page.locator('#mijn-leeg')).toBeVisible();
});
