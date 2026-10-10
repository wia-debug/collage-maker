import { test, expect, openNieuweCollage, elementen, tikOpCanvas } from './helpers';
import type { Page } from '@playwright/test';

async function tweeVormen(page: Page) {
  await page.evaluate(() => {
    const { editor, maakVorm } = window.__collage;
    editor.add(maakVorm({ x: 300, y: 300, vorm: 'ster', breedte: 100, hoogte: 100 }));
    editor.add(maakVorm({ x: 500, y: 300, vorm: 'hart', breedte: 100, hoogte: 100 }));
    editor.select(null);
  });
}

async function sleepKader(page: Page, van: [number, number], naar: [number, number]) {
  await page.evaluate(() => new Promise<void>((k) => requestAnimationFrame(() => requestAnimationFrame(() => k()))));
  const a = await page.evaluate(([x, y]) => window.__collage.controller.naarScherm(x, y), van);
  const b = await page.evaluate(([x, y]) => window.__collage.controller.naarScherm(x, y), naar);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2);
  await page.mouse.move(b.x, b.y);
  await page.mouse.up();
}

test('kader slepen, groeperen, samen verplaatsen, bewaard na opnieuw openen', async ({ page }) => {
  await openNieuweCollage(page);
  await tweeVormen(page);
  // Begint buiten het blad, op de grijze rand (Review Focus 3).
  await sleepKader(page, [-20, -20], [650, 450]);
  await expect.poll(() => page.evaluate(() => window.__collage.editor.get().selectedIds.length)).toBe(2);
  await page.click('#ctx-groepeer');
  const [a, b] = await elementen(page);
  expect(a.groep).toBeTruthy();
  expect(a.groep).toBe(b.groep);
  await page.keyboard.press('ArrowRight');
  expect((await elementen(page)).map((e: any) => e.x)).toEqual([305, 505]);
  await page.click('#knop-terug');
  await page.getByRole('button', { name: 'Mijn collage', exact: true }).click();
  await page.waitForFunction(() => window.__collage?.controller);
  const na = await elementen(page);
  expect(na[0].groep).toBe(na[1].groep);
  await tikOpCanvas(page, 305, 300);
  await expect.poll(() => page.evaluate(() => window.__collage.editor.get().selectedIds.length)).toBe(2);
  await expect(page.locator('#ctx-groep-los')).toBeVisible();
});

test('meer kiezen met tikken, dan alles weg', async ({ page }) => {
  await openNieuweCollage(page);
  await tweeVormen(page);
  await page.click('#knop-meer');
  await expect(page.locator('#knop-meer')).toHaveAttribute('aria-pressed', 'true');
  await tikOpCanvas(page, 300, 300);
  await tikOpCanvas(page, 500, 300);
  await expect.poll(() => page.evaluate(() => window.__collage.editor.get().selectedIds.length)).toBe(2);
  await page.click('#ctx-wissen');
  expect(await elementen(page)).toHaveLength(0);
  await expect(page.locator('#knop-meer')).toHaveAttribute('aria-pressed', 'false');
});

test('groep los, daarna één element apart', async ({ page }) => {
  await openNieuweCollage(page);
  await tweeVormen(page);
  await page.evaluate(() => {
    const { editor } = window.__collage;
    editor.groepeer(editor.get().collage.elementen.map((e: any) => e.id));
  });
  await tikOpCanvas(page, 300, 300);
  await page.click('#ctx-groep-los');
  expect((await elementen(page)).every((e: any) => !e.groep)).toBe(true);
  await page.keyboard.press('Escape');
  await tikOpCanvas(page, 300, 300);
  await expect.poll(() => page.evaluate(() => window.__collage.editor.get().selectedIds.length)).toBe(1);
});

test('vastgezet element in een groep blijft staan bij wissen', async ({ page }) => {
  await openNieuweCollage(page);
  await tweeVormen(page);
  await page.evaluate(() => {
    const { editor } = window.__collage;
    const [a, b] = editor.get().collage.elementen;
    editor.update(a.id, { vergrendeld: true });
    editor.groepeer([a.id, b.id]);
    editor.selectMany([a.id, b.id]);
  });
  await page.click('#ctx-wissen');
  expect(await elementen(page)).toHaveLength(1);
});

test('een niet-gekozen groepslid slepen verplaatst de hele groep', async ({ page }) => {
  await openNieuweCollage(page);
  await tweeVormen(page);
  await page.evaluate(() => {
    const { editor } = window.__collage;
    editor.groepeer(editor.get().collage.elementen.map((e: any) => e.id));
    editor.select(null);
  });
  await page.evaluate(() => new Promise<void>((k) => requestAnimationFrame(() => requestAnimationFrame(() => k()))));
  const a = await page.evaluate(() => window.__collage.controller.naarScherm(300, 300));
  const b = await page.evaluate(() => window.__collage.controller.naarScherm(300, 500));
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x, (a.y + b.y) / 2, { steps: 5 });
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
  const els = await elementen(page);
  expect(els[0].y).toBeGreaterThan(400);
  expect(els[1].y).toBeCloseTo(els[0].y, 0);
});

test('na een selectiekader dat op een element eindigt, werkt de volgende tik', async ({ page }) => {
  await openNieuweCollage(page);
  await tweeVormen(page);
  await sleepKader(page, [-20, -20], [300, 300]);
  await tikOpCanvas(page, 500, 300);
  await expect.poll(() => page.evaluate(() => window.__collage.editor.get().selectedIds.length)).toBe(1);
  const gekozen = await page.evaluate(() => window.__collage.editor.get().selectedId);
  const tweede = (await elementen(page))[1].id;
  expect(gekozen).toBe(tweede);
});
