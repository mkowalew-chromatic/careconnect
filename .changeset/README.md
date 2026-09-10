# Changesets

This folder holds [changesets](https://github.com/changesets/changesets) — one
markdown file per pending, unreleased change.

Add one with `npm run changeset`, commit it alongside your PR, and the release
flow (`npm run version-packages`, then `npm run release:publish`) turns the
accumulated changesets into version bumps, CHANGELOG entries, and a tag.

Every workspace here is private, so `changeset version` bumps versions and
writes changelogs but nothing is published to a registry.
