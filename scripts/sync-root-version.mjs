#!/usr/bin/env node
/**
 * Keep root package.json and README version in sync with unified workspace version (@careconnect/api).
 * Run via `npm run version-packages` after `changeset version`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const apiPkg = JSON.parse(readFileSync(join(rootDir, 'apps/api/package.json'), 'utf8'));
const version = apiPkg.version;

const rootPath = join(rootDir, 'package.json');
const rootPkg = JSON.parse(readFileSync(rootPath, 'utf8'));

if (rootPkg.version !== version) {
  rootPkg.version = version;
  writeFileSync(rootPath, `${JSON.stringify(rootPkg, null, 2)}\n`);
  console.log(`Synced root package.json version → ${version}`);
}

const readmePath = join(rootDir, 'README.md');
const readme = readFileSync(readmePath, 'utf8');
const versionLine = `**Current version:** ${version} — see [CHANGELOG.md](CHANGELOG.md) and [Release process](docs/RELEASE.md).`;
const pattern = /^\*\*Current version:\*\* .*$/m;
const currentLine = readme.match(pattern)?.[0];

if (!currentLine) {
  console.warn('README: could not find **Current version:** line to sync');
} else if (currentLine !== versionLine) {
  writeFileSync(readmePath, readme.replace(pattern, versionLine));
  console.log(`Synced README version → ${version}`);
}
