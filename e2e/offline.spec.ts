import { test, expect, elementen } from './helpers';

test.use({ serviceWorkers: 'allow' });

test('werkt offline na het eerste bezoek', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'chromebook', 'Service worker testen we in Chromium.');
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Collagemaker' })).toBeVisible();

  await page.click('#start-nieuw');
  await page.click('#formaat-vierkant');
  await page.waitForFunction(() => window.__collage?.controller);
  await page.click('#tool-stickers');
  await page.locator('.sticker-knop').first().click();
  await page.waitForFunction(() => window.__collage.editor.get().collage.elementen.length === 1);
  const [s] = await elementen(page);
  const geladen = await page.evaluate(([st, k]) => !!window.__collage.assets.image(`sticker:${st}:${k}`), [s.sticker, s.kleur]);
  expect(geladen).toBe(true);
  await context.setOffline(false);
});

test('heeft een webmanifest', async ({ page }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const m = await (await page.request.get(href!)).json();
  expect(m.name).toBe('Collagemaker');
  expect(m.icons.length).toBeGreaterThan(0);
});
