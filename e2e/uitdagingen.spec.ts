import { test, expect } from './helpers';

test('uitdaging kiezen toont opdracht en juiste stickers', async ({ page }) => {
  await page.goto('/');
  await page.click('#start-uitdaging');
  await page.click('#uitdaging-ruimtereis');
  await expect(page.locator('#opdracht')).toContainText('andere planeet');
  await expect(page.locator('#pakket-ruimte')).toHaveAttribute('aria-selected', 'true');
  await page.click('#opdracht-sluit');
  await expect(page.locator('#opdracht')).toHaveCount(0);
});
