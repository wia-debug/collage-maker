import { test, expect } from './helpers';

test('app laadt', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Collagemaker' })).toBeVisible();
});
