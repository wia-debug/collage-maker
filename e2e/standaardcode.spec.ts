import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Bewust zonder voorinstellingen: de echte eerste start van de app.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { localStorage.setItem('collage-tours-gezien', JSON.stringify(['editor', 'foto', 'tekst', 'stickers', 'vormen', 'tekenen', 'achtergrond', 'leerkracht'])); } catch { /* opslag geblokkeerd */ }
  });
});

const typ = async (page: Page, code: string) => { for (const c of code) await page.click(`#cijfer-${c}`); };

const WAARSCHUWING = 'Wijzig de standaardcode 000000, anders kunnen kinderen hier ook in.';

test('eerste start: geen instelscherm, meteen tabletmodus met profielkeuze', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Wie ben jij?' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Welkom bij Collagemaker' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Wie ben jij?' })).toBeVisible();
});

test('leerkrachtmenu opent met 000000 en waarschuwt voor de standaardcode', async ({ page }) => {
  await page.goto('/');
  await page.click('#knop-leerkracht');
  await typ(page, '123456');
  await expect(page.getByText('Dat is niet de juiste code.')).toBeVisible();
  await typ(page, '000000');
  await expect(page.locator('#code-wijzigen')).toBeVisible();
  await expect(page.getByText(WAARSCHUWING)).toBeVisible();
});

test('code wijzigen: oude code geweigerd, nieuwe code werkt, waarschuwing weg', async ({ page }) => {
  await page.goto('/');
  await page.click('#knop-leerkracht');
  await typ(page, '000000');
  await page.click('#code-wijzigen');
  await typ(page, '000000');
  await expect(page.getByText('Kies een andere code dan 000000.')).toBeVisible();
  await typ(page, '111111');
  await typ(page, '222222');
  await expect(page.getByText('De codes zijn niet gelijk. Probeer opnieuw.')).toBeVisible();
  await typ(page, '135790');
  await typ(page, '135790');
  await expect(page.getByText('Nieuwe code bewaard.')).toBeVisible();
  await expect(page.getByText(WAARSCHUWING)).toHaveCount(0);
  await page.click('#leerkracht-sluit');

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Wie ben jij?' })).toBeVisible();
  await page.click('#knop-leerkracht');
  await typ(page, '000000');
  await expect(page.getByText('Dat is niet de juiste code.')).toBeVisible();
  await typ(page, '135790');
  await expect(page.locator('#code-wijzigen')).toBeVisible();
  await expect(page.getByText(WAARSCHUWING)).toHaveCount(0);
});

test('code wijzigen toont een melding als bewaren mislukt en blijft bruikbaar', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__opslag);
  await page.click('#knop-leerkracht');
  await typ(page, '000000');
  await page.click('#code-wijzigen');
  await page.evaluate(() => {
    (window as any).__opslag.db.instellingen.put = () => Promise.reject(new Error('vol'));
  });
  await typ(page, '135790');
  await typ(page, '135790');
  await expect(page.getByText('Bewaren lukte niet. Probeer het nog eens.')).toBeVisible();
  await expect(page.locator('#cijfer-1')).toBeEnabled();
});

test('Chromebook-link: meteen het startscherm en de code 000000', async ({ page }) => {
  await page.goto('/?toestel=chromebook');
  await expect(page.locator('#start-nieuw')).toBeVisible();
  await page.click('#knop-leerkracht');
  await typ(page, '000000');
  await expect(page.locator('#alles-wissen')).toBeVisible();
});
