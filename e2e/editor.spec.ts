import { test, expect, openNieuweCollage, elementen, tikOpCanvas } from './helpers';

test('nieuwe collage openen en terugkeren', async ({ page }) => {
  await openNieuweCollage(page, 'a4-liggend');
  await expect(page.locator('#canvas-vlak canvas').first()).toBeVisible();
  await page.click('#knop-terug');
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Stoppen' }).click();
  await expect(page.locator('#start-nieuw')).toBeVisible();
});

test('selecteren, contextbalk, ongedaan maken en sneltoetsen', async ({ page }) => {
  await openNieuweCollage(page);
  await page.evaluate(() => {
    const { editor, maakVorm } = window.__collage;
    editor.add(maakVorm({ x: 600, y: 600, vorm: 'rechthoek', breedte: 300, hoogte: 300 }));
    editor.select(null);
  });
  await tikOpCanvas(page, 600, 600);
  await expect(page.locator('#ctx-wissen')).toBeVisible();

  await page.click('#ctx-kopie');
  expect(await elementen(page)).toHaveLength(2);

  await page.click('#knop-ongedaan');
  expect(await elementen(page)).toHaveLength(1);
  await page.click('#knop-opnieuw');
  expect(await elementen(page)).toHaveLength(2);

  // De kopie ligt bovenaan (630, 630); tikken op (700, 700) selecteert de kopie.
  await tikOpCanvas(page, 700, 700);
  await page.keyboard.press('Delete');
  expect(await elementen(page)).toHaveLength(1);
  await page.keyboard.press('Control+z');
  expect(await elementen(page)).toHaveLength(2);

  await tikOpCanvas(page, 700, 700);
  await page.keyboard.press('ArrowRight');
  const els = await elementen(page);
  expect(els[1].x).toBe(635);
});

test('vergrendeld element toont alleen de slot-knop', async ({ page }) => {
  await openNieuweCollage(page);
  await page.evaluate(() => {
    const { editor, maakVorm } = window.__collage;
    editor.add(maakVorm({ x: 600, y: 600, vorm: 'rechthoek', breedte: 300, hoogte: 300 }));
  });
  await page.click('#ctx-slot');
  await expect(page.locator('#ctx-wissen')).toHaveCount(0);
  await page.click('#ctx-slot');
  await expect(page.locator('#ctx-wissen')).toBeVisible();
});
