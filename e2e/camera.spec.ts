import { test, expect, openNieuweCollage, elementen } from './helpers';

test.use({ launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } });

test.describe('camera met nep-camera', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'chromebook', 'nep-camera bestaat alleen in Chromium'));

  test('foto nemen en gebruiken', async ({ page }) => {
    await openNieuweCollage(page);
    await page.click('#tool-foto');
    await page.click('#foto-camera');
    await page.waitForFunction(() => (document.querySelector('#camera-video') as HTMLVideoElement)?.videoWidth > 0);
    await page.click('#camera-neem');
    await page.click('#camera-gebruik');
    await page.waitForFunction(() => window.__collage.editor.get().collage.elementen.length === 1);
    expect((await elementen(page))[0].type).toBe('foto');
  });
});

test('camera geweigerd: melding en bestand kiezen', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.reject(new DOMException('nee', 'NotAllowedError')), enumerateDevices: async () => [] } });
  });
  await openNieuweCollage(page);
  await page.click('#tool-foto');
  await page.click('#foto-camera');
  await expect(page.locator('#camera-fout')).toContainText('De camera mag niet aan.');
  const chooser = page.waitForEvent('filechooser');
  await page.click('#camera-kies-foto');
  await chooser;
});
