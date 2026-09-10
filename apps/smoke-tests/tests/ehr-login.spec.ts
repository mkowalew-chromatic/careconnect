import { test, expect } from '@playwright/test';

const EHR_URL = (process.env.EHR_URL ?? '').replace(/\/$/, '');
if (!EHR_URL) {
  throw new Error('EHR_URL env var is required to run smoke tests');
}

test('staff can log into the EHR app', async ({ page }) => {
  await page.goto(`${EHR_URL}/login`);
  await page.getByLabel('Email address').fill('admin@se-tools.net');
  await page.getByLabel('Password', { exact: true }).fill('CareConnect1!');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/visits/);
  await expect(page.getByRole('button', { name: 'Sign In' })).not.toBeVisible();
  // Positive assertion that the authenticated EHR chrome actually rendered
  // (URL/form-unmount checks above would also pass if the route crashed to a
  // blank page). The "Tracking Board" nav link is real AppLayout chrome and
  // is the active item on the post-login /visits route.
  await expect(page.getByRole('button', { name: 'Tracking Board' })).toBeVisible();
});
