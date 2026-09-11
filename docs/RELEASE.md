# Release Process

CareConnect uses [Semantic Versioning](https://semver.org/) and [Changesets](https://github.com/changesets/changesets) for changelog management and releases.

Agent rules: follow [AGENTS.md](../AGENTS.md).

> **Current state of automation.** This repo ships only `ci.yml` and
> `chromatic.yml`. The release and deploy automation the pre-merge repos had
> (`release.yml`, `auto-merge-version-packages.yml`, `cd-pipeline.yml`) has
> **not been ported yet**. Until it is, releases are cut by hand (see
> [How releases are cut](#how-releases-are-cut)) and deploys rebuild from
> source (`--build-from-source`). The [Planned automation](#planned-automation)
> section at the end records what the ported workflows should do, so it can be
> restored rather than redesigned.

---

## Which packages share a version

Two version streams live in this repo, both driven by the single
[`.changeset/config.json`](../.changeset/config.json):

| Stream | Workspaces | Where the version lives |
|---|---|---|
| **CareConnect** (the app) | `@careconnect/api`, `ehr`, `portal`, `smoke-tests`, `types`, `api-client`, `mock-data` — a Changesets **fixed** group, so they always bump together | Root [`package.json`](../package.json) and the README **Current version** line (synced by `scripts/sync-root-version.mjs`); git tags `vX.Y.Z`; API `/health` |
| **Design system** | `@careconnect/design-system` | Its own [`package.json`](../packages/design-system/package.json) and [`CHANGELOG.md`](../packages/design-system/CHANGELOG.md); exported as `DESIGN_SYSTEM_VERSION` |

The design system joined the monorepo at `0.3.1` with its own history and
deliberately versions independently — its changes are visible to consumers
as component/prop changes, not as app releases. To fold it into the app version
instead, add it to the `fixed` group in `.changeset/config.json`.

---

## Version policy

| Bump | When to use | Examples |
|------|-------------|----------|
| **Patch** | Bug fixes, docs, internal refactors with no behavior change | Fix login error, nginx template fix |
| **Minor** | New features, backward-compatible API/UI changes | New report type, walk-in flow, new design-system component |
| **Major** | Breaking changes | Auth model change, removed API endpoints, DB migration requiring manual steps, removed/renamed component props |

---

## Day-to-day development

### 1. Make your changes

Work on a feature branch as usual.

### 2. Add a changeset

For any user-facing change, run:

```bash
npm run changeset
```

- Select the workspace(s) you changed. Picking any member of the fixed group
  bumps the whole group; pick `@careconnect/design-system` for component
  changes.
- Choose **patch**, **minor**, or **major**.
- Write a short, user-facing summary (it becomes the changelog entry).
- Commit the generated file in `.changeset/` with your PR.

Skip a changeset only for internal-only work (CI tweaks, comments) with no release note.

### 3. Open a pull request

CI ([`ci.yml`](../.github/workflows/ci.yml)) runs `npm ci`, `npm run typecheck`,
`npm test`, and `npm run build` on every PR to `main`. PRs that touch
`packages/design-system/**` also get a Chromatic visual-review build
([`chromatic.yml`](../.github/workflows/chromatic.yml)).

### 4. Merge to `main`

Nothing happens automatically on merge yet — pending changesets accumulate in
`.changeset/` until a maintainer cuts a release.

Preview what would ship:

```bash
npm run release:notes
```

---

## How releases are cut

A maintainer, on an up-to-date `main` checkout:

```bash
# 1. Consume pending changesets: bump versions, write per-package CHANGELOGs,
#    sync the root package.json + README "Current version" line.
npm run version-packages

# 2. Review the result, then commit it.
git add -A && git commit -m "Version packages"
git push origin main   # or open a PR if branch protection requires it

# 3. Tag vX.Y.Z (from apps/api's version) and create the GitHub Release,
#    using the matching section of apps/api/CHANGELOG.md as the notes.
npm run release:publish
```

Notes:

- Every workspace is private, so nothing is published to npm; "publish" here
  means tag + GitHub Release only.
- If only design-system changesets are pending, `version-packages` bumps only
  `@careconnect/design-system`. `release:publish` keys the tag off the app
  version, so it will report the app tag already exists and skip — that is
  expected; design-system releases are recorded in its changelog, not tagged.
- `release:publish` needs `git push` access to `origin` and, for the GitHub
  Release, the `gh` CLI authenticated.

---

## Conventional Commits (recommended)

Commit messages are not enforced, but this alignment helps reviewers pick the right changeset bump:

| Prefix | Typical bump |
|--------|----------------|
| `feat:` | minor |
| `fix:` | patch |
| `docs:`, `chore:`, `ci:` | patch or no changeset |
| `feat!:` or footer `BREAKING CHANGE:` | major |

---

## Hotfixes

1. Branch from `main` (or the release tag for a production hotfix).
2. Fix the issue, add a **patch** changeset.
3. Merge the PR, then cut a release as above (e.g. `v1.0.3`).
4. Deploy the new tag to the VM.

---

## Deploy after a release

Deploys are manual for now. The `deploy/*.env` config files these commands take
are gitignored (per-environment secrets) — create them from
[`deploy/careconnect.env.example`](../deploy/careconnect.env.example).

**From your laptop (rebuild on the VM from your checkout):**

```bash
git fetch --tags && git checkout vX.Y.Z
./deploy/remote-install.sh --build-from-source --config deploy/se-tools.net.env
```

`--build-from-source` is required until `cd-pipeline.yml` exists: without it,
`remote-install.sh` tries to download a CI-built artifact for the current
commit and stops when none is found.

**On the VM (update in place):**

```bash
cd /opt/careconnect
sudo -u careconnect git fetch --tags
sudo -u careconnect git checkout vX.Y.Z
sudo /opt/careconnect/deploy/update.sh
```

See [deploy/DEPLOYMENT.md](../deploy/DEPLOYMENT.md) for full deployment details.

---

## Files reference

| File | Purpose |
|------|---------|
| [`apps/api/CHANGELOG.md`](../apps/api/CHANGELOG.md) | Release history for the CareConnect app version (written by Changesets; the source of GitHub Release notes) |
| [`packages/design-system/CHANGELOG.md`](../packages/design-system/CHANGELOG.md) | Design system release history (written by Changesets) |
| [`CHANGELOG.md`](../CHANGELOG.md) | Index of the above plus the frozen pre-1.0 history from before the monorepo merge; not updated per release |
| [`.changeset/config.json`](../.changeset/config.json) | Changesets configuration (fixed group, changelog generator) |
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | Typecheck, test, build on PR/push |
| [`.github/workflows/chromatic.yml`](../.github/workflows/chromatic.yml) | Publishes Storybook for visual review on design system PRs |
| [`scripts/sync-root-version.mjs`](../scripts/sync-root-version.mjs) | After `changeset version`, syncs root `package.json` and the README **Current version** line to the app version |
| [`scripts/release-publish.sh`](../scripts/release-publish.sh) | Tags `vX.Y.Z` and creates the GitHub Release |
| [`deploy/fetch-ci-artifact.sh`](../deploy/fetch-ci-artifact.sh) | Downloads the latest CD Pipeline artifact for manual redeploys — **inert until `cd-pipeline.yml` is ported** |

---

## Branch protection

Recommended on `main`:

- Require the **Typecheck, test, build** status check (`ci.yml`) to pass before merging
- No direct pushes, force-pushes, or branch deletion (applies to admins too)

Note: `release-publish.sh` pushes a tag, not a branch, so it works with these
rules. The `version-packages` commit must go through a PR if direct pushes are
blocked.

---

## Planned automation

These workflows existed in the pre-merge repos and are the intended end state.
They are documented here so they can be ported rather than redesigned; **none
of them exist in this repo yet**, and nothing above depends on them.

| Workflow | What it did |
|---|---|
| `release.yml` | On push to `main` with pending changesets, open (or refresh) a **Version Packages** PR running `changeset version`. When that PR merges, run `changeset publish` to create the `vX.Y.Z` tag and GitHub Release. |
| `auto-merge-version-packages.yml` | Auto-merge the Version Packages PR (hourly during business hours, or via `workflow_dispatch`), with an author/title check so an impostor branch named `changeset-release/main` is not merged. Requires branch protection with no required-reviewer count. |
| `cd-pipeline.yml` | On every merge to `main`: build once with `deploy/package-artifact.sh`, deploy the artifact to pre-production with `deploy-artifact.sh`, run `npm run smoke:test` against it, promote the same artifact to production, and `rollback.sh` on failure. Uploads the artifact so `deploy/fetch-ci-artifact.sh` / `remote-install.sh` can redeploy exactly what CI validated. |

Porting notes:

- `remote-install.sh` and `fetch-ci-artifact.sh` already look for a workflow
  named `cd-pipeline.yml` and an artifact named for the commit SHA; keep those
  names when porting.
- `package-artifact.sh` bakes `VITE_EHR_BASE`/`VITE_PORTAL_BASE` from the
  config file it is given, so the pipeline must build separately for staging
  and production (or with matching configs) — see
  [DEPLOYMENT.md § Artifact-based deploys](../deploy/DEPLOYMENT.md#artifact-based-deploys-ci).
- Once `release.yml` exists, remove the manual `version-packages` /
  `release:publish` steps above and let the Version Packages PR drive the
  release; `scripts/release-publish.sh` becomes the fallback for out-of-band
  releases.
