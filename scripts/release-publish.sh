#!/usr/bin/env bash
# Tag and GitHub Release for private monorepo (no npm publish).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

node scripts/sync-root-version.mjs

VERSION=$(node -p "require('./apps/api/package.json').version")
TAG="v${VERSION}"

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Tag ${TAG} already exists — skipping."
  exit 0
fi

NOTES_FILE=$(mktemp)
trap 'rm -f "$NOTES_FILE"' EXIT

if grep -q "## \\[${VERSION}\\]" CHANGELOG.md 2>/dev/null; then
  awk "/^## \\[${VERSION}\\]/,/^## \\[/{ if (/^## \\[/ && !/^## \\[${VERSION}\\]/) exit; print }" CHANGELOG.md >"$NOTES_FILE"
fi

if [[ ! -s "$NOTES_FILE" && -f apps/api/CHANGELOG.md ]]; then
  awk "/^## ${VERSION}/,/^## /{ if (/^## / && !/^## ${VERSION}/) exit; print }" apps/api/CHANGELOG.md >"$NOTES_FILE"
fi

if [[ ! -s "$NOTES_FILE" ]]; then
  echo "CareConnect ${TAG}" >"$NOTES_FILE"
fi

git tag -a "$TAG" -m "CareConnect ${TAG}"
git push origin "$TAG"

if command -v gh >/dev/null 2>&1; then
  gh release create "$TAG" --title "CareConnect ${TAG}" --notes-file "$NOTES_FILE"
else
  echo "gh CLI not found — tag ${TAG} pushed; create GitHub Release manually."
fi

echo "Released ${TAG}"
