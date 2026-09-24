# Contributing — Design System

This package lives inside the [CareConnect monorepo](../../README.md). Repo-wide
release rules are in [docs/RELEASE.md](../../docs/RELEASE.md) and
[AGENTS.md](../../AGENTS.md); this file covers what is specific to the component
library.

## Versioning

The library is one of the repo's four independently released units, owned by
the design-system team (see [`.github/CODEOWNERS`](../../.github/CODEOWNERS)
and [`scripts/release-units.mjs`](../../scripts/release-units.mjs)). It
follows [Semantic Versioning](https://semver.org/) on its own timeline and
uses [Changesets](https://github.com/changesets/changesets), configured once
at the repo root.

Every change that affects consumers (new component, prop change, bug fix,
visual change) needs a changeset. From the repo root:

```bash
npm run changeset
```

Select `@careconnect/design-system` **only** — not the EHR or Portal, even if
you had to update them in the same PR. Changesets patch-bumps every workspace
that depends on the library automatically, because their built bundles
change. Pick a bump type and commit the generated `.changeset/*.md` alongside
your change.

Nothing is published to a registry — every workspace here is private. The
apps consume the library **at HEAD** through the workspace link, so:

- a component change is picked up by the apps immediately, with no publish or
  dependency bump in between;
- a change that breaks the EHR or Portal build fails on *your* PR (their CI
  jobs run whenever the design system changes) — fix the consumers in the same
  PR, or coordinate with their teams before merging.

Removing or renaming a public prop is a **major** bump for the library, even
though the in-repo consumers are updated in the same PR.

## Release process

1. Open a PR with your change + changeset. CI runs the `design-system` job
   (typecheck, unit tests, story tests, build) and, because the apps depend on
   it, the `ehr` and `portal` jobs too. Chromatic posts a visual review.
2. Merge. `release.yml` opens (or refreshes) the repo's **Version Packages**
   PR with the library's bump and changelog entry, plus the automatic patch
   bumps of `ehr`/`portal`.
3. When that PR merges, the library is tagged
   `@careconnect/design-system@X.Y.Z`, gets a GitHub Release with its
   changelog section as the notes, and the `main` Chromatic run auto-accepts
   the new Storybook as the baseline. `ehr` and `portal` are tagged, released
   and deployed with the new components at the same time.

There is no deploy step for the library itself. See
[docs/RELEASE.md](../../docs/RELEASE.md) for the full train and the manual
fallbacks.

## Visual review

Every PR runs [Chromatic](https://www.chromatic.com/) for visual regression
review against the component Storybook — see
[chromatic.yml](../../.github/workflows/chromatic.yml). It uses the official
`chromaui/action` with `workingDir: packages/design-system` so Chromatic builds
this package's Storybook from the monorepo root and, on pull requests, reports
the build against the PR's head commit — the bare CLI would report the synthetic
merge commit and the UI Tests / UI Review statuses would never reach the PR.

**Every PR, not just the ones that touch this package.** That is deliberate. A
`paths:` filter stops the workflow from triggering at all, and GitHub leaves a
required check that never started pending forever — so with a filter in place,
requiring **UI Tests** or **UI Review** in branch protection would deadlock every
PR that happened not to touch `packages/design-system/**`. (A job skipped by an
`if:` condition is different: it reports a conclusion, which branch protection
accepts. That is why the missing-token guard is safe and a path filter is not.)

**TurboSnap** (`onlyChanged: true`) is what keeps that affordable. Chromatic
traces the commit's changed files through Vite's module graph and snapshots only
the stories they affect: a PR that touches no story costs one Storybook build
and zero snapshots. It falls back to a full snapshot run when it cannot trace a
change — a dependency bump, a lockfile change, or the first build on a branch.
TurboSnap needs the full git history, which is why the job checks out with
`fetch-depth: 0`.

If your team turns on GitHub's **merge queue**, the workflow already listens on
`merge_group`, so the Chromatic checks report on queued refs too. Without that
trigger a required check never arrives and the queue stalls.

Chromatic needs one repository secret, added under **Settings → Secrets and
variables → Actions**:

| Name | Kind | Notes |
| --- | --- | --- |
| `CHROMATIC_PROJECT_TOKEN` | repository secret | Until it is set, the job skips rather than failing red. |

## Figma

The Figma library is generated from this Storybook and linked back to it —
see [docs/FIGMA.md](../../docs/FIGMA.md) for the full round trip. What that
means when you change this package:

- Every `*.stories.tsx` meta carries `parameters: { design: figmaDesign('<title>') }`
  so the Storybook **Design** tab shows the Figma frame. New stories follow the
  same pattern; the Figma URLs live in one place,
  [`src/figma/links.json`](src/figma/links.json), keyed by story title.
- `src/styles/tokens.css` is exported to [`src/figma/tokens.json`](src/figma/tokens.json)
  (W3C DTCG) for Figma's variable import. After editing tokens run
  `npm run tokens:export` — `npm test` fails while the JSON is stale.
- The `Foundations/Tokens` stories render that JSON, so token changes show up
  as Chromatic diffs.

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
  tests via `npm run test:stories`, which CI runs on every PR that affects this
  package. They need Playwright's browsers locally — `npx playwright install
  chromium`, once per machine — and cover what a pixel diff cannot: play
  functions and the a11y checks. Chromatic's snapshots are the other half.
