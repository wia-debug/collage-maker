import { test, expect } from './helpers';

test('leerkracht kiest de regel voor delen via de server', async ({ page }) => {
  await page.goto('/');
  await page.click('#knop-leerkracht');
  for (const c of '123456') await page.click(`#cijfer-${c}`);
  await expect(page.locator('#cloud-leerkracht')).toHaveAttribute('aria-pressed', 'true');
  await page.click('#cloud-kind');
  await expect(page.locator('#cloud-kind')).toHaveAttribute('aria-pressed', 'true');
  await page.click('#leerkracht-sluit');
  await page.reload();
  await page.click('#knop-leerkracht');
  for (const c of '123456') await page.click(`#cijfer-${c}`);
  await expect(page.locator('#cloud-kind')).toHaveAttribute('aria-pressed', 'true');
});
