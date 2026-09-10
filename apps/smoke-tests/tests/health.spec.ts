import { test, expect } from '@playwright/test';

const EHR_URL = (process.env.EHR_URL ?? '').replace(/\/$/, '');
if (!EHR_URL) {
  throw new Error('EHR_URL env var is required to run smoke tests');
}

test('API health endpoint reports healthy', async ({ request }) => {
  // Assumes DEPLOY_MODE=subdomain or DEPLOY_MODE=ports, where nginx proxies
  // /api/ at the origin root — not true for DEPLOY_MODE=path.
  const response = await request.get(`${EHR_URL}/api/health`);
  expect(response.ok()).toBe(true);
  const body = await response.json();
  expect(body.status).toBe('ok');
  expect(body.service).toBe('careconnect-api');
});
