# Contributing — Design System

This package lives inside the [CareConnect monorepo](../../README.md). Repo-wide
release rules are in [docs/RELEASE.md](../../docs/RELEASE.md) and
[AGENTS.md](../../AGENTS.md); this file covers what is specific to the component
library.

## Versioning

The library follows [Semantic Versioning](https://semver.org/) and uses
[Changesets](https://github.com/changesets/changesets), configured once at the
repo root.

Every change that affects consumers (new component, prop change, bug fix, visual
change) needs a changeset. From the repo root:

```bash
npm run changeset
```

Select `@careconnect/design-system`, pick a bump type, and commit the generated
`.changeset/*.md` alongside your change.

Nothing is published to a registry — every workspace here is private. `changeset
version` bumps `package.json` and rewrites `CHANGELOG.md`; the apps pick the
change up through the workspace link immediately, with no publish or dependency
bump in between.

`@careconnect/design-system` versions independently of the app workspaces,
which form a Changesets `fixed` group and share the "CareConnect version"
(`vX.Y.Z` tags). This package is deliberately left out of that group so a
component change shows up as a component-library bump, not an app release. To
fold it into the unified version instead, add it to the `fixed` group in
[`.changeset/config.json`](../../.changeset/config.json).

## Release process

1. Open a PR with your change + changeset. [CI](../../.github/workflows/ci.yml)
   typechecks, runs the unit tests, and builds every workspace — so a component
   change that breaks the EHR or Portal build fails on the PR rather than after
   a release.
2. Cut a release from the repo root with `npm run version-packages`, then
   `npm run release:publish`. Note that `release:publish` tags the *app*
   version; a design-system-only release bumps this package's `package.json`
   and `CHANGELOG.md` but creates no git tag (see
   [docs/RELEASE.md](../../docs/RELEASE.md#how-releases-are-cut)).

## Visual review

Every PR touching `packages/design-system/**` runs
[Chromatic](https://www.chromatic.com/) for visual regression review against the
component Storybook — see [chromatic.yml](../../.github/workflows/chromatic.yml).
It runs with `--working-dir packages/design-system` so Chromatic builds this
package's Storybook from the monorepo root.

It needs one repository secret, added under **Settings → Secrets and variables →
Actions**:

| Name | Kind | Notes |
| --- | --- | --- |
| `CHROMATIC_PROJECT_TOKEN` | repository secret | Until it is set, the job skips rather than failing red. |

## Node version

The repo root `.nvmrc` (currently Node 24) is the single source of truth: the
workflows read it via `node-version-file`, so local and CI cannot drift. It
must stay at 22.22 or newer — `jsdom` and `undici` in the test toolchain
require it, and older Node fails with
`webidl.util.markAsUncloneable is not a function`.

This is deliberately stricter than `engines.node` in `package.json`, which is
the contract for apps consuming the library at runtime, not for building it.

## Component conventions

- One directory per component under `src/components/`, holding the component,
  its `.css`, its `.stories.tsx`, and any `.test.tsx`.
- Export it from [`src/index.ts`](src/index.ts) — that barrel is the package's
  only public surface.
- Style with the `--cc-*` design tokens from `src/styles/` rather than literal
  colors or sizes, so themes and the Chromatic baselines stay coherent.
- Every component needs at least one story; stories double as browser smoke
  tests via `npm run test:stories`.
