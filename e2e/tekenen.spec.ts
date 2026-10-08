import { test, expect, openNieuweCollage, elementen } from './helpers';

async function veeg(page: import('@playwright/test').Page, van: [number, number], naar: [number, number]) {
  const a = await page.evaluate(([x, y]) => window.__collage.controller.naarScherm(x, y), van);
  const b = await page.evaluate(([x, y]) => window.__collage.controller.naarScherm(x, y), naar);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(a.x + ((b.x - a.x) * i) / 10, a.y + ((b.y - a.y) * i) / 10);
  await page.mouse.up();
}

test('tekenen met krijt en weggummen', async ({ page }) => {
  await openNieuweCollage(page);
  await page.click('#tool-tekenen');
  await page.click('#pen-krijt');
  await page.click('#dikte-groot');
  await veeg(page, [300, 600], [900, 600]);
  let els = await elementen(page);
  expect(els).toHaveLength(1);
  expect(els[0]).toMatchObject({ type: 'tekening', gereedschap: 'krijt', dikte: 28 });

  await page.click('#pen-gum');
  await veeg(page, [600, 500], [600, 700]);
  expect(await elementen(page)).toHaveLength(0);

  await page.click('#tool-vormen');
  await page.click('#vorm-ster');
  expect(await elementen(page)).toHaveLength(1);
});
