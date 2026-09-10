import { test, expect } from '@playwright/test';

const PORTAL_URL = (process.env.PORTAL_URL ?? '').replace(/\/$/, '');
if (!PORTAL_URL) {
  throw new Error('PORTAL_URL env var is required to run smoke tests');
}

test('a patient can log into the Portal app', async ({ page }) => {
  await page.goto(`${PORTAL_URL}/login`);
  await page.getByLabel('Email address').fill('alice.smith@se-tools.net');
  await page.getByLabel('Password', { exact: true }).fill('CareConnect1!');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(new URL('/', PORTAL_URL).toString());
  await expect(page.getByRole('button', { name: 'Sign In' })).not.toBeVisible();
  // Positive assertion that the authenticated Portal home page actually
  // rendered (URL/form-unmount checks above would also pass if the route
  // crashed to a blank page). This heading is real HomePage content.
  await expect(page.getByRole('heading', { name: 'Welcome to CareConnect' })).toBeVisible();
});
