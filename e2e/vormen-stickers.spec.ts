import { test, expect, openNieuweCollage, elementen } from './helpers';

test('vorm toevoegen en kleur wijzigen', async ({ page }) => {
  await openNieuweCollage(page);
  await page.click('#tool-vormen');
  await page.click('#vorm-hart');
  let els = await elementen(page);
  expect(els).toHaveLength(1);
  expect(els[0]).toMatchObject({ type: 'vorm', vorm: 'hart' });
  await page.locator('#paneel-vormen .palet').first().getByRole('button', { name: '#5AA9F2' }).click();
  els = await elementen(page);
  expect(els[0].vulling).toBe('#5AA9F2');
});

test('sticker toevoegen uit een ander pakket en herkleuren', async ({ page }) => {
  await openNieuweCollage(page);
  await page.click('#tool-stickers');
  await page.click('#pakket-ruimte');
  await page.locator('.sticker-knop').first().click();
  await page.waitForFunction(() => window.__collage.editor.get().collage.elementen.length === 1);
  let els = await elementen(page);
  expect(els[0].type).toBe('sticker');
  expect(els[0].sticker.startsWith('ruimte/')).toBe(true);
  await page.locator('#paneel-stickers .palet').getByRole('button', { name: '#3BB273' }).click();
  await page.waitForFunction(() => window.__collage.editor.get().collage.elementen[0].kleur === '#3BB273');
});

test('sticker doorzichtigheid met de schuif Zichtbaar', async ({ page }) => {
  await openNieuweCollage(page);
  await page.click('#tool-stickers');
  await page.locator('.sticker-knop').first().click();
  await page.waitForFunction(() => window.__collage.editor.get().collage.elementen.length === 1);
  await page.$eval('#schuif-zichtbaar', (el: HTMLInputElement) => {
    el.value = '40';
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const [st] = await elementen(page);
  expect(st.doorzichtigheid).toBeCloseTo(0.4);
});

for (const [id, vorm, breedte, hoogte] of [['ruit', 'ruit', 300, 300], ['vijfhoek', 'vijfhoek', 300, 300], ['zeshoek', 'zeshoek', 300, 300], ['rechthoek-breed', 'rechthoek', 420, 260]] as const) {
  test(`vorm ${id} toevoegen`, async ({ page }) => {
    await openNieuweCollage(page);
    await page.click('#tool-vormen');
    await page.click(`#vorm-${id}`);
    const els = await elementen(page);
    expect(els).toHaveLength(1);
    expect(els[0]).toMatchObject({ type: 'vorm', vorm, breedte, hoogte });
  });
}
