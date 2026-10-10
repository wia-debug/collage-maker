import { test, expect, openNieuweCollage, elementen, maakPng } from './helpers';

async function voegFotoToe(page: import('@playwright/test').Page) {
  await page.click('#tool-foto');
  const chooser = page.waitForEvent('filechooser');
  await page.click('#foto-kiezen');
  await (await chooser).setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: await maakPng(page) });
  await page.waitForFunction(() => window.__collage.editor.get().collage.elementen.length === 1);
}

test('achtergrond weg maakt een uitknipsel; ongedaan maken zet het terug', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__achtergrondWeg = async (blob: Blob, voortgang: (d: number) => void) => {
      voortgang(1);
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
  await voegFotoToe(page);
  const voor = (await elementen(page))[0].assetId;
  await page.click('#ctx-achtergrond-weg');
  await page.waitForFunction((id) => window.__collage.editor.get().collage.elementen[0].assetId !== id, voor);
  const [f] = await elementen(page);
  expect(f.uitknipsel).toBe(true);
  expect(f.masker).toBe('rechthoek');
  await page.click('#knop-ongedaan');
  expect((await elementen(page))[0].assetId).toBe(voor);
});

test('model niet bereikbaar: melding, foto ongewijzigd', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__achtergrondWeg = async () => { throw new TypeError('Failed to fetch'); }; });
  await openNieuweCollage(page);
  await voegFotoToe(page);
  const voor = await elementen(page);
  await page.click('#ctx-achtergrond-weg');
  await expect(page.getByText('Dit lukt nu niet. Probeer opnieuw met internet.')).toBeVisible();
  expect(await elementen(page)).toEqual(voor);
});
