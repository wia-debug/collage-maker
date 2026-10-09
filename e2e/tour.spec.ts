import { test, expect } from '@playwright/test';

test('rondleiding start de eerste keer en via de help-knop', async ({ page }) => {
  // Bewust zonder tour-onderdrukking; wel de instellingen zaaien zodat de eerste-startschermen overgeslagen worden.
  await page.addInitScript(() => { (window as any).__e2eInstellingen = { toestel: 'pc', profielenAan: false, mastercode: '123456' }; });
  await page.goto('/');
  await page.click('#start-nieuw');
  await page.click('#formaat-vierkant');
  await expect(page.locator('.driver-popover')).toBeVisible();
  await expect(page.locator('.driver-popover-title')).toHaveText("Foto's");
  await page.keyboard.press('Escape');
  await expect(page.locator('.driver-popover')).toHaveCount(0);

  await page.click('#knop-terug');
  await page.getByRole('button', { name: 'Stoppen' }).click();
  await page.click('#start-nieuw');
  await page.click('#formaat-vierkant');
  await page.waitForTimeout(500);
  await expect(page.locator('.driver-popover')).toHaveCount(0);

  await page.click('#tool-stickers');
  await page.click('#knop-help');
  await expect(page.locator('.driver-popover-title')).toHaveText('Stickerpakketten');
});
