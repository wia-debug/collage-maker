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

test('WordArt kiezen en vorm wijzigen', async ({ page }) => {
  await openNieuweCollage(page);
  await page.click('#tool-tekst');
  await page.click('#tekst-nieuw');
  await page.fill('#tekst-veld', 'Super');
  await page.click('#tekst-klaar');
  await page.click('#wordart-regenboog');
  await page.click('#wordart-vorm-boog-omhoog');
  const [t] = await elementen(page);
  expect(t.wordart.vulling.soort).toBe('regenboog');
  expect(t.wordart.vorm).toBe('boog-omhoog');
  await page.click('#wordart-geen');
  expect((await elementen(page))[0].wordart).toBeNull();
});
