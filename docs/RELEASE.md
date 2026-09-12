# Release Process

CareConnect is one monorepo with **four independently released units**, one
per team. Each has its own semantic version, changelog, git tag, GitHub
Release and — for the deployable ones — its own deploy pipeline. Nothing is
published to a package registry: "release" means tag + GitHub Release, and for
`api`/`ehr`/`portal`, a deploy.

Agent rules: follow [AGENTS.md](../AGENTS.md).

---

## Release units

| Unit | Package | Team | Kind | Release = |
|---|---|---|---|---|
| `api` | `@careconnect/api` | Backend | service | tag + GitHub Release + deploy (systemd, DB migrations) |
| `ehr` | `@careconnect/ehr` | EHR frontend | frontend | tag + GitHub Release + deploy (static bundle, atomic symlink swap) |
| `portal` | `@careconnect/portal` | Portal frontend | frontend | tag + GitHub Release + deploy (static bundle, atomic symlink swap) |
| `design-system` | `@careconnect/design-system` | Design system | library | tag + GitHub Release + Storybook baseline on Chromatic |

The list lives in [`scripts/release-units.mjs`](../scripts/release-units.mjs);
review ownership per unit is in [`.github/CODEOWNERS`](../.github/CODEOWNERS).

**Shared packages** (`@careconnect/types`, `api-client`, `mock-data`) are not
release units. They version and tag independently like everything else, but
nothing is announced or deployed for them — they ship inside the unit that
consumes them. When one of them bumps, every workspace that depends on it gets
an automatic patch bump (`updateInternalDependents: always` in
[`.changeset/config.json`](../.changeset/config.json)), because that
workspace's built output changed.

**The design system is consumed at HEAD.** The apps keep a workspace link
(`"@careconnect/design-system": "*"`) and always build against the current
component library, so a breaking component change fails the EHR/Portal build
on the design-system PR itself — the design-system team fixes consumers (or
coordinates with them) before merging. A design-system bump therefore also
patch-bumps `ehr` and `portal`, and those get redeployed with the new
components. This is deliberate: independent *releases* without giving up
atomic cross-cutting changes. (The alternative — publishing the library to a
registry and letting the apps pin versions — is documented under
[Alternatives](#alternatives-considered).)

`@careconnect/smoke-tests` is a test harness, not a release unit; Changesets
ignores it.

---

## Version policy

Each unit follows [SemVer](https://semver.org/) on its own timeline.

| Bump | When to use | Examples |
|------|-------------|----------|
| **Patch** | Bug fixes, docs, internal refactors with no behavior change | Fix login error, token tweak |
| **Minor** | New features, backward-compatible API/UI changes | New report type, walk-in flow, new component |
| **Major** | Breaking changes | Removed API endpoints, DB migration needing manual steps, removed/renamed component props |

For the API, "breaking" is about the HTTP contract the frontends consume. A
breaking API change and the frontend changes that adopt it should land in the
same PR (that is what the monorepo is for) — with changesets for every unit
involved.

---

## Day-to-day development

### 1. Make your changes

Work on a feature branch. CI runs one job per unit
([`ci.yml`](../.github/workflows/ci.yml)); on PRs, `turbo --affected` limits
each job to what your change touches, so a portal-only PR does real work only
in the `portal` job (the others finish in seconds and report green).

### 2. Add a changeset

For any user-facing change:

```bash
npm run changeset
```

- Select **only the workspace(s) you changed**. Don't select dependents — a
  design-system change bumps `ehr`/`portal` automatically.
- Choose patch / minor / major.
- Write a short, user-facing summary (it becomes the changelog entry and the
  GitHub Release notes).
- Commit the generated `.changeset/*.md` with your PR.

Skip a changeset only for internal-only work (CI tweaks, comments, tests)
with no release note.

Preview what would ship: `npm run release:notes`.

### 3. Open a pull request

CODEOWNERS requests review from the owning team of every area you touched.
The four unit jobs plus the aggregate **All units passed** check must be
green. Design-system PRs also get a Chromatic visual review
([`chromatic.yml`](../.github/workflows/chromatic.yml)).

### 4. Merge to `main`

The release train takes it from here.

---

## The release train

Automated by [`release.yml`](../.github/workflows/release.yml) on every push
to `main`:

```
push to main
  │
  ├─ pending changesets?  ──yes──▶  open / refresh the "Version Packages" PR
  │                                 (changeset version: bumps only the packages
  │                                  with changes, writes their CHANGELOGs)
  │                                          │
  │                                    merge (auto-merge when its CI is green,
  │                                     if AUTO_MERGE_VERSION_PR=true)
  │                                          │
  └─ no pending changesets ────────▶  changeset publish
                                       • git tag @careconnect/<pkg>@<version>
                                         for every package whose version is untagged
                                       • GitHub Release for each *release unit* tagged
                                         (notes = its CHANGELOG section)
                                       • dispatch deploy.yml once per deployable
                                         unit that was tagged
```

Only packages with changes get a new version, tag, release and deploy. A
portal-only PR produces a portal-only Version Packages PR, a
`@careconnect/portal@x.y.z` tag and release, and one `Deploy portal` run —
the API is never restarted.

**Cadence.** There is one Version Packages PR for the whole repo, so all
pending changes ride together when it merges. With auto-merge on, that is
effectively continuous delivery per unit: each merged PR reaches production
on its own within one train cycle, independently of the others. If a team
needs to hold a release, it holds its own PR (don't merge to `main` yet)
rather than the train.

### Deploy pipeline (per unit)

[`deploy.yml`](../.github/workflows/deploy.yml) is one run per unit and ref
(`Deploy portal @ @careconnect/portal@1.3.0`), so the Actions history is a
per-team deploy log. It calls
[`deploy-environment.yml`](../.github/workflows/deploy-environment.yml) for
each environment:

1. **staging** — check out the tag, build that unit's artifact with the
   staging config (`deploy/package-artifact.sh --unit <unit>`), upload it
   (`careconnect-<unit>-staging`), ship it with `deploy/remote-deploy.sh`,
   run the Playwright smoke tests against staging. A smoke failure rolls that
   unit back on staging.
2. **production** — gated by the `production` GitHub Environment's protection
   rules (required reviewers, wait timer). Same steps with the production
   config and a rollback on smoke failure.

Deploys of the same unit are serialised; different units deploy in parallel.

Run it by hand from **Actions → Deploy → Run workflow** to redeploy any tag or
commit (e.g. re-ship a known-good API after a rollback), optionally to one
environment only.

---

## One-time setup (GitHub)

Everything in the train degrades gracefully when a piece is missing, but this
is the intended configuration.

### Branch protection on `main`

- Require the **All units passed** status check (from `ci.yml`).
- Require review from Code Owners.
- No direct pushes, force-pushes, or branch deletion.
- Enable **Allow auto-merge** in the repository settings if you want the
  Version Packages PR to merge itself; then set the repository variable
  `AUTO_MERGE_VERSION_PR=true`.

### A GitHub App for the release bot (recommended)

Pull requests opened with the built-in `GITHUB_TOKEN` never trigger other
workflows, so CI would not run on the Version Packages PR and it could never
satisfy the required checks. Create a GitHub App with *Contents: write* and
*Pull requests: write*, install it on the repo, and add:

| Secret | Value |
|---|---|
| `RELEASE_BOT_APP_ID` | the app id |
| `RELEASE_BOT_PRIVATE_KEY` | the app's private key (PEM) |

Without these, `release.yml` still works with `GITHUB_TOKEN`; you then need to
close-and-reopen the Version Packages PR (or push an empty commit to it) to
get CI to run before merging.

### Environments: `staging` and `production`

Create both under **Settings → Environments**. On `production`, add required
reviewers (that is the production approval gate) and restrict deployments to
tags/`main` as you see fit. Each environment carries its own values:

| Kind | Name | Value |
|---|---|---|
| secret | `DEPLOY_CONFIG` | Full contents of that environment's `careconnect.env` (from [`deploy/careconnect.env.example`](../deploy/careconnect.env.example)): `DEPLOY_MODE`, `DOMAIN`, ports, **and** the SSH target `VM_USER`, `VM_HOST`, `VM_PORT` |
| secret | `DEPLOY_SSH_KEY` | Private key for `VM_USER@VM_HOST`. That user needs passwordless `sudo` for `deploy-artifact.sh` / `rollback.sh` |
| variable | `DEPLOY_KNOWN_HOSTS` | (optional but recommended) the VM's `known_hosts` line; without it the host key is trusted on first use |
| variable | `EHR_URL`, `PORTAL_URL` | Public URLs the smoke tests hit. If unset, the smoke step is skipped |

The VM itself is prepared once with the installer (see
[deploy/DEPLOYMENT.md](../deploy/DEPLOYMENT.md)); after that, only artifacts
are shipped to it.

### Chromatic

`CHROMATIC_PROJECT_TOKEN` (repository secret) — see
[packages/design-system/CONTRIBUTING.md](../packages/design-system/CONTRIBUTING.md).

---

## Manual fallbacks

Everything the train does can be done by hand from an up-to-date `main`
checkout.

```bash
# Consume pending changesets: bump versions, write CHANGELOGs
npm run version-packages
git add -A && git commit -m "Version packages"
git push origin main            # or open a PR if branch protection requires it

# Tag every untagged package version, push tags, create GitHub Releases
# for the release units (needs push access and an authenticated gh CLI)
npm run release:publish
#   = npm run release:tag      (changeset publish → git tags)
#   + git push origin --tags
#   + npm run release:github   (node scripts/github-releases.mjs)

# Deploy one unit's tag through staging → production
gh workflow run deploy.yml -f unit=portal -f ref=@careconnect/portal@1.3.0
```

`scripts/github-releases.mjs` is idempotent — it only creates releases that
are missing, so it is safe to re-run.

---

## Hotfixes

1. Branch from `main`.
2. Fix the issue in the affected unit, add a **patch** changeset for that unit.
3. Merge. The train releases and deploys only that unit.
4. If the deploy must skip staging, run **Deploy** by hand with
   `environments = production` (still subject to the production approval).

To roll a unit back on a VM without redeploying: `sudo deploy/rollback.sh
<unit>` on the VM, or `deploy/remote-rollback.sh --config deploy/<environment>.env <unit>`
from a laptop. To roll forward to a known-good version, run **Deploy** with
that tag.

---

## Conventional Commits (recommended)

Commit messages are not enforced, but this alignment helps reviewers pick the right changeset bump:

| Prefix | Typical bump |
|--------|----------------|
| `feat:` | minor |
| `fix:` | patch |
| `docs:`, `chore:`, `ci:` | patch or no changeset |
| `feat!:` or footer `BREAKING CHANGE:` | major |

Scope by unit where it helps: `fix(portal): …`, `feat(api): …`.

---

## Files reference

| File | Purpose |
|------|---------|
| [`.changeset/config.json`](../.changeset/config.json) | Independent versioning; private packages versioned and tagged; dependents always patch-bumped; smoke-tests ignored |
| [`scripts/release-units.mjs`](../scripts/release-units.mjs) | The four release units, their teams and kinds — used by the release tooling |
| [`scripts/github-releases.mjs`](../scripts/github-releases.mjs) | Creates a GitHub Release per tagged release unit from its CHANGELOG section (idempotent) |
| [`scripts/release-publish.sh`](../scripts/release-publish.sh) | Manual fallback: tag, push tags, create releases |
| [`.github/CODEOWNERS`](../.github/CODEOWNERS) | Review ownership per unit and shared package |
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | One typecheck/test/build job per unit, `--affected` on PRs, plus the aggregate required check |
| [`.github/workflows/release.yml`](../.github/workflows/release.yml) | Version Packages PR → tags → GitHub Releases → deploy dispatch |
| [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) | One unit, staging → production; manual redeploys |
| [`.github/workflows/deploy-environment.yml`](../.github/workflows/deploy-environment.yml) | Reusable: build, ship, smoke-test, roll back on failure for one environment |
| [`.github/workflows/chromatic.yml`](../.github/workflows/chromatic.yml) | Storybook visual review on design-system PRs; auto-accepted baseline on `main` |
| [`deploy/package-artifact.sh`](../deploy/package-artifact.sh) | Builds and packages one unit (`careconnect-<unit>-<version>-<sha>.tar.gz`) |
| [`deploy/deploy-artifact.sh`](../deploy/deploy-artifact.sh) · [`rollback.sh`](../deploy/rollback.sh) | On-VM deploy/rollback of one unit |
| [`deploy/remote-deploy.sh`](../deploy/remote-deploy.sh) · [`remote-rollback.sh`](../deploy/remote-rollback.sh) · [`fetch-ci-artifact.sh`](../deploy/fetch-ci-artifact.sh) | Laptop/CI-side wrappers |
| `apps/*/CHANGELOG.md`, `packages/*/CHANGELOG.md` | Written by Changesets; the release-unit ones feed GitHub Release notes |
| [`CHANGELOG.md`](../CHANGELOG.md) | Index of the above plus the frozen pre-monorepo history; not updated per release |

---

## Alternatives considered

**Publishing the design system to a registry and pinning it in the apps.**
Gives the frontend teams full control over *when* they take a component
change, at the cost of losing atomic cross-cutting changes, needing registry
auth in CI, and the two apps drifting onto different component versions.
Worth revisiting if the design system gains consumers outside this repo; the
package is already shaped for it (`exports`, `files`, `sideEffects`). Switch
by setting `private: false`, choosing a registry, and changing the apps'
dependency ranges from `*` to a semver range.

**Separate repositories per team.** Was how teams got independence before
path-filtered CI, CODEOWNERS and independent-versioning tooling made it
unnecessary. Would lose shared-type safety between the API and its clients
and make every contract change a multi-repo dance.

**A single version for everything.** Was the previous setup (a Changesets
`fixed` group). Simple, but every release was everyone's release and every
deploy restarted the API.
