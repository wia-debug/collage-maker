import { test, expect, openNieuweCollage, elementen } from './helpers';

test('tekst toevoegen, opmaken en leegmaken', async ({ page }) => {
  await openNieuweCollage(page);
  await page.click('#tool-tekst');
  await page.click('#tekst-nieuw');
  await page.fill('#tekst-veld', 'Hallo');
  await page.click('#tekst-klaar');
  let els = await elementen(page);
  expect(els).toHaveLength(1);
  expect(els[0]).toMatchObject({ type: 'tekst', tekst: 'Hallo' });

  await page.click('#font-bangers');
  await page.click('#tekst-vet');
  els = await elementen(page);
  expect(els[0]).toMatchObject({ lettertype: 'bangers', vet: true });

  await page.click('#ctx-tekst');
  await page.fill('#tekst-veld', '');
  await page.click('#tekst-klaar');
  expect(await elementen(page)).toHaveLength(0);
});
