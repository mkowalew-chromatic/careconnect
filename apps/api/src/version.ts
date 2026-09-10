import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** CareConnect monorepo version from apps/api/package.json (kept in sync via Changesets). */
const apiRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
export const APP_VERSION = JSON.parse(
  readFileSync(join(apiRoot, 'package.json'), 'utf8'),
).version as string;
