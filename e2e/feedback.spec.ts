import { test, expect } from './helpers';

test('leerkracht zet geluid en beweging uit', async ({ page }) => {
  await page.goto('/');
  await page.click('#knop-leerkracht');
  for (const c of '123456') await page.click(`#cijfer-${c}`);
  await expect(page.locator('#geluid-aan')).toHaveAttribute('aria-pressed', 'true');
  await page.click('#geluid-aan');
  await page.click('#animatie-aan');
  await expect(page.locator('#geluid-aan')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#animatie-aan')).toHaveAttribute('aria-pressed', 'false');
  await page.reload();
  await page.click('#knop-leerkracht');
  for (const c of '123456') await page.click(`#cijfer-${c}`);
  await expect(page.locator('#geluid-aan')).toHaveAttribute('aria-pressed', 'false');
});
