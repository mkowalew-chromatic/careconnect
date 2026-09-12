# Release Process

CareConnect is a single monorepo containing four independently released units, one per team. Each unit has its own semantic version, changelog, git tag, and GitHub Release, and the deployable units each have their own deploy pipeline. Nothing is published to a package registry. A "release" means a tag and a GitHub Release, plus a deploy for `api`, `ehr`, and `portal`.

AI coding agents working in this repository should follow [AGENTS.md](../AGENTS.md).

---

## Release units

| Unit | Package | Team | Kind | A release consists of |
|---|---|---|---|---|
| `api` | `@careconnect/api` | Backend | Service | Tag, GitHub Release, and deploy (systemd restart with database migrations) |
| `ehr` | `@careconnect/ehr` | EHR frontend | Frontend | Tag, GitHub Release, and deploy (static bundle, atomic symlink swap) |
| `portal` | `@careconnect/portal` | Portal frontend | Frontend | Tag, GitHub Release, and deploy (static bundle, atomic symlink swap) |
| `design-system` | `@careconnect/design-system` | Design system | Library | Tag, GitHub Release, and a new Storybook baseline on Chromatic |

The list is defined in [`scripts/release-units.mjs`](../scripts/release-units.mjs), and review ownership per unit is in [`.github/CODEOWNERS`](../.github/CODEOWNERS).

**Shared packages.** `@careconnect/types`, `api-client`, and `mock-data` are not release units. They are versioned and tagged independently like everything else, but nothing is announced or deployed for them; they ship inside the units that consume them. When one of them bumps, every workspace that depends on it receives an automatic patch bump (`updateInternalDependents: always` in [`.changeset/config.json`](../.changeset/config.json)), because that workspace's built output has changed.

**The design system is consumed at HEAD.** The apps keep a workspace link (`"@careconnect/design-system": "*"`) and always build against the current component library. A breaking component change therefore fails the EHR or Portal build on the design-system pull request itself, and the design-system team fixes the consumers, or coordinates with them, before merging. A design-system bump also patch-bumps `ehr` and `portal`, which are then redeployed with the new components. This is deliberate: it gives each team independent releases without giving up atomic cross-cutting changes. The alternative, publishing the library to a registry and letting the apps pin versions, is discussed under [Alternatives considered](#alternatives-considered).

`@careconnect/smoke-tests` is a test harness, not a release unit, and Changesets ignores it.

---

## Version policy

Each unit follows [Semantic Versioning](https://semver.org/) on its own timeline.

| Bump | When to use it | Examples |
|------|----------------|----------|
| **Patch** | Bug fixes, documentation, and internal refactors with no behavior change | A login error fix; a token tweak |
| **Minor** | New features and backward-compatible API or UI changes | A new report type; the walk-in flow; a new component |
| **Major** | Breaking changes | Removed API endpoints; a database migration that needs manual steps; removed or renamed component props |

For the API, "breaking" refers to the HTTP contract the frontends consume. A breaking API change and the frontend changes that adopt it should land in the same pull request, with a changeset for every unit involved. That is what the monorepo is for.

---

## Day-to-day development

### 1. Make your changes

Work on a feature branch. CI runs one job per unit ([`ci.yml`](../.github/workflows/ci.yml)). On pull requests, `turbo --affected` limits each job to what your change touches, so a portal-only PR does real work only in the `portal` job; the others finish in seconds and report green.

### 2. Add a changeset

For any user-facing change:

```bash
npm run changeset
```

- Select only the workspaces you changed. Do not select their dependents; a design-system change bumps `ehr` and `portal` automatically.
- Choose patch, minor, or major.
- Write a short, user-facing summary. It becomes the changelog entry and the GitHub Release notes.
- Commit the generated `.changeset/*.md` file with your pull request.

Skip the changeset only for internal work with no release note, such as CI tweaks, comments, or tests.

To preview what would ship, run `npm run release:notes`.

### 3. Open a pull request

CODEOWNERS requests review from the owning team of every area you touched. The four unit jobs and the aggregate **All units passed** check must all be green. Design-system PRs also receive a Chromatic visual review ([`chromatic.yml`](../.github/workflows/chromatic.yml)).

### 4. Merge to `main`

The release train handles the rest.

---

## The release train

[`release.yml`](../.github/workflows/release.yml) runs on every push to `main`:

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

Only packages with changes receive a new version, tag, release, and deploy. A portal-only PR produces a portal-only Version Packages PR, a `@careconnect/portal@x.y.z` tag and release, and a single `Deploy portal` run. The API is never restarted.

**Cadence.** There is one Version Packages PR for the whole repository, so every pending change rides together when it merges. With auto-merge enabled, this amounts to continuous delivery per unit: each merged PR reaches production on its own within one train cycle, independently of the others. A team that needs to hold a release holds its own PR by not merging to `main` yet, rather than holding the train.

### Deploy pipeline (per unit)

[`deploy.yml`](../.github/workflows/deploy.yml) runs once per unit and ref (for example, `Deploy portal @ @careconnect/portal@1.3.0`), so the Actions history doubles as a per-team deploy log. It calls [`deploy-environment.yml`](../.github/workflows/deploy-environment.yml) for each environment in turn:

1. **Staging.** Check out the tag, build that unit's artifact with the staging config (`deploy/package-artifact.sh --unit <unit>`), upload it as `careconnect-<unit>-staging`, ship it with `deploy/remote-deploy.sh`, and run the Playwright smoke tests against staging. A smoke failure rolls that unit back on staging.
2. **Production.** Gated by the `production` GitHub Environment's protection rules (required reviewers, wait timer). The same steps run with the production config, with the same rollback on smoke failure.

Deploys of the same unit are serialized; different units deploy in parallel.

To redeploy any tag or commit by hand, for example to re-ship a known-good API after a rollback, use **Actions → Deploy → Run workflow**. You can limit the run to a single environment.

---

## One-time setup (GitHub)

The train degrades gracefully when a piece is missing, but this is the intended configuration.

### Allow Actions to open pull requests

Turn on **Settings → Actions → General → Workflow permissions → "Allow GitHub Actions to create and approve pull requests"**. Without it, `release.yml` fails at "Creating pull request" with *GitHub Actions is not permitted to create or approve pull requests*. The setting is off by default on new repositories.

### Branch protection on `main`

- Require the **All units passed** status check from `ci.yml`.
- Require review from Code Owners.
- Disallow direct pushes, force pushes, and branch deletion.
- To let the Version Packages PR merge itself, enable **Allow auto-merge** in the repository settings and set the repository variable `AUTO_MERGE_VERSION_PR=true`.

### A GitHub App for the release bot (recommended)

Pull requests opened with the built-in `GITHUB_TOKEN` never trigger other workflows, so CI would not run on the Version Packages PR and it could never satisfy the required checks. Create a GitHub App with *Contents: write* and *Pull requests: write* permissions, install it on the repository, and add two secrets:

| Secret | Value |
|---|---|
| `RELEASE_BOT_APP_ID` | The app ID |
| `RELEASE_BOT_PRIVATE_KEY` | The app's private key, in PEM format |

Without these, `release.yml` still works with `GITHUB_TOKEN`, but CI on the Version Packages PR (authored by `github-actions[bot]`) lands in the **action required** state and must be approved by hand before the PR can merge, either from the run's page or with `gh api -X POST repos/<owner>/<repo>/actions/runs/<run-id>/approve`.

### A self-hosted runner on the LAN

The VMs sit on a private network behind a Cloudflare tunnel, so GitHub-hosted runners cannot SSH to them. `deploy-environment.yml` therefore runs on a self-hosted runner labelled `careconnect-lan`. Install one on any always-on LAN host (the staging VM works well):

```bash
deploy/setup-runner.sh --config deploy/<environment>.env
```

The script registers the runner and installs it as a systemd service. The deploy workflow is dispatch-only and is never triggered by pull requests, which is what makes a self-hosted runner acceptable on a public repository; keep it that way. The runner host needs `git`, `curl`, `rsync`, `tar`, `unzip`, and passwordless `sudo` (for `playwright install --with-deps`).

### Environments: `staging` and `production`

Create both under **Settings → Environments**. On `production`, add required reviewers (this is the production approval gate) and restrict deployments to tags or `main` as you see fit. Each environment carries its own values:

| Kind | Name | Value |
|---|---|---|
| Secret | `DEPLOY_CONFIG` | The full contents of that environment's `careconnect.env` (based on [`deploy/careconnect.env.example`](../deploy/careconnect.env.example)): `DEPLOY_MODE`, `DOMAIN`, ports, and the SSH target `VM_USER`, `VM_HOST`, `VM_PORT` |
| Secret | `DEPLOY_SSH_KEY` | The private key for `VM_USER@VM_HOST`. That user needs passwordless `sudo` for `deploy-artifact.sh` and `rollback.sh` |
| Variable | `DEPLOY_KNOWN_HOSTS` | Optional but recommended: the VM's `known_hosts` line. Without it, the host key is trusted on first use |
| Variable | `EHR_URL`, `PORTAL_URL` | The public URLs the smoke tests hit. If unset, the smoke step is skipped |

The VM itself is prepared once with the installer (see [deploy/DEPLOYMENT.md](../deploy/DEPLOYMENT.md)). After that, only artifacts are shipped to it.

### Chromatic

Add the `CHROMATIC_PROJECT_TOKEN` repository secret. See [packages/design-system/CONTRIBUTING.md](../packages/design-system/CONTRIBUTING.md).

---

## Manual fallbacks

Everything the train does can be done by hand from an up-to-date checkout of `main`.

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

`scripts/github-releases.mjs` is idempotent. It creates only the releases that are missing, so it is safe to re-run.

---

## Hotfixes

1. Branch from `main`.
2. Fix the issue in the affected unit and add a **patch** changeset for that unit.
3. Merge. The train releases and deploys only that unit.
4. If the deploy must skip staging, run **Deploy** by hand with `environments = production`. The production approval still applies.

To roll a unit back on a VM without redeploying, run `sudo deploy/rollback.sh <unit>` on the VM, or `deploy/remote-rollback.sh --config deploy/<environment>.env <unit>` from a laptop. To roll forward to a known-good version, run **Deploy** with that tag.

---

## Conventional Commits (recommended)

Commit message format is not enforced, but following this convention helps reviewers pick the right changeset bump:

| Prefix | Typical bump |
|--------|----------------|
| `feat:` | Minor |
| `fix:` | Patch |
| `docs:`, `chore:`, `ci:` | Patch, or no changeset |
| `feat!:` or a `BREAKING CHANGE:` footer | Major |

Scope by unit where it helps: `fix(portal): …`, `feat(api): …`.

---

## Files reference

| File | Purpose |
|------|---------|
| [`.changeset/config.json`](../.changeset/config.json) | Independent versioning; private packages are versioned and tagged; dependents are always patch-bumped; smoke-tests are ignored |
| [`scripts/release-units.mjs`](../scripts/release-units.mjs) | The four release units with their teams and kinds; used by the release tooling |
| [`scripts/github-releases.mjs`](../scripts/github-releases.mjs) | Creates a GitHub Release for each tagged release unit from its CHANGELOG section; idempotent |
| [`scripts/release-publish.sh`](../scripts/release-publish.sh) | Manual fallback: tag, push tags, and create releases |
| [`.github/CODEOWNERS`](../.github/CODEOWNERS) | Review ownership per unit and shared package |
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | One typecheck, test, and build job per unit, `--affected` on PRs, plus the aggregate required check |
| [`.github/workflows/release.yml`](../.github/workflows/release.yml) | Version Packages PR, then tags, GitHub Releases, and deploy dispatch |
| [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) | One unit, staging then production; also used for manual redeploys |
| [`.github/workflows/deploy-environment.yml`](../.github/workflows/deploy-environment.yml) | Reusable workflow: build, ship, smoke-test, and roll back on failure for one environment |
| [`.github/workflows/chromatic.yml`](../.github/workflows/chromatic.yml) | Storybook visual review on design-system PRs; auto-accepted baseline on `main` |
| [`deploy/package-artifact.sh`](../deploy/package-artifact.sh) | Builds and packages one unit as `careconnect-<unit>-<version>-<sha>.tar.gz` |
| [`deploy/deploy-artifact.sh`](../deploy/deploy-artifact.sh) · [`rollback.sh`](../deploy/rollback.sh) | On-VM deploy and rollback of one unit |
| [`deploy/remote-deploy.sh`](../deploy/remote-deploy.sh) · [`remote-rollback.sh`](../deploy/remote-rollback.sh) · [`fetch-ci-artifact.sh`](../deploy/fetch-ci-artifact.sh) | Laptop- and CI-side wrappers |
| `apps/*/CHANGELOG.md`, `packages/*/CHANGELOG.md` | Written by Changesets; the release-unit changelogs feed the GitHub Release notes |
| [`CHANGELOG.md`](../CHANGELOG.md) | Index of the per-unit changelogs plus the frozen pre-monorepo history; not updated per release |

---

## Alternatives considered

**Publishing the design system to a registry and pinning it in the apps.** This would give the frontend teams full control over when they adopt a component change, at the cost of losing atomic cross-cutting changes, needing registry authentication in CI, and letting the two apps drift onto different component versions. It is worth revisiting if the design system gains consumers outside this repository, and the package is already shaped for it (`exports`, `files`, `sideEffects`). To switch, set `private: false`, choose a registry, and change the apps' dependency ranges from `*` to a semver range.

**Separate repositories per team.** This is how teams achieved independence before path-filtered CI, CODEOWNERS, and independent-versioning tooling made it unnecessary. It would lose shared-type safety between the API and its clients and turn every contract change into a multi-repository exercise.

**A single version for everything.** This was the previous setup, using a Changesets `fixed` group. It was simple, but every release was everyone's release, and every deploy restarted the API.
