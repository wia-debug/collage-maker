import { test, expect, openLeerkrachtMenu } from './helpers';

test('privacyknop en onderschrift op het startscherm', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Gemaakt door Claude and Me')).toBeVisible();
  await page.click('#knop-privacy');
  await expect(page.locator('#privacy')).toContainText('geen cookies');
  await page.click('#privacy-sluit');
  await expect(page.locator('#privacy')).toHaveCount(0);
});

test('uitleg in het leerkrachtmenu', async ({ page }) => {
  await page.goto('/');
  await openLeerkrachtMenu(page);
  await page.click('#uitleg-open');
  await expect(page.locator('#uitleg')).toContainText('Klas ontvangen');
  await page.keyboard.press('Escape');
  await expect(page.locator('#uitleg')).toHaveCount(0);
});
