# Agent instructions — CareConnect

**Canonical agent guide for this repository.** Also mirrored in [CLAUDE.md](CLAUDE.md). Keep both in sync when changing these rules.

Human-oriented release details: [docs/RELEASE.md](docs/RELEASE.md).

## Project

Healthcare EMR demo monorepo: API (Express + SQLite), EHR (includes role-gated Billing section), Portal, and the shared UI component library. UI components live here as the workspace package [`@careconnect/design-system`](packages/design-system) — change a component and its consumers in the same commit; there is no publish step. Deployed as a single unit to Ubuntu VMs on **se-tools.net**.

## Standard workflows

| Task | Command / doc |
|------|----------------|
| Local dev setup | `deploy/install.sh --local` → `./deploy/start-local.sh` |
| Remote VM deploy | `./deploy/remote-install.sh --config deploy/se-tools.net.env` |
| Build | `npm run build` (turbo; builds the design system before the apps) |
| Component library / Storybook | `npm run storybook` → http://localhost:6006 |
| Staff login | `admin@se-tools.net` / seeded demo password (ask a teammate) |
| Billing role login | `billing@se-tools.net` (full access) or `manager@se-tools.net` (view-only) / same seeded password |

See [README.md](README.md), [deploy/DEPLOYMENT.md](deploy/DEPLOYMENT.md).

## Versioning & releases (required)

Unified **SemVer** for all `@careconnect/*` packages via **Changesets** (fixed versioning group).

### When implementing changes

1. **User-facing change** (features, fixes, API/UI behavior, deploy behavior) → add a changeset before finishing:
   ```bash
   npm run changeset
   ```
   Commit the generated `.changeset/*.md` with the PR. Pick patch / minor / major per [docs/RELEASE.md](docs/RELEASE.md).

2. **Internal-only** (comments, refactors with no behavior change) → no changeset required.

3. **Do not** manually bump `version` in `package.json` files — Changesets updates all packages via the Version Packages PR.

4. **Do not** hardcode version strings in code. API version comes from [apps/api/src/version.ts](apps/api/src/version.ts) reading `apps/api/package.json`.

5. **Do not** manually edit [CHANGELOG.md](CHANGELOG.md) — Changesets manages it.

### Release flow

- CI: `.github/workflows/ci.yml` — `npm ci`, typecheck, test, and build on PRs to `main`
- Visual review: `.github/workflows/chromatic.yml` — publishes Storybook on design system PRs
- Release: run `npm run version-packages`, then `npm run release:publish` to tag `vX.Y.Z` and cut the GitHub Release

### After a release (deploy)

```bash
git fetch --tags && git checkout vX.Y.Z
sudo /opt/careconnect/deploy/update.sh
```

Or from laptop: `./deploy/remote-install.sh --config deploy/se-tools.net.env`

### Checklist before marking work complete

- [ ] Build passes (`npm run build`)
- [ ] Typecheck and tests pass (`npm run typecheck`, `npm test`)
- [ ] Changeset added if user-facing
- [ ] No manual version or CHANGELOG edits
- [ ] API `/health` uses `APP_VERSION` from package.json (no hardcoded version)

## Code conventions

- Minimize scope; match existing patterns in surrounding files.
- Shared types in `@careconnect/types`; API client in `@careconnect/api-client`; UI components in `@careconnect/design-system` (add new components there, not in an app).
- Private monorepo — no workspace is published to a registry.

## Commits and pull requests

- Describe **what changed and why** in product or engineering terms only.
- Do **not** mention IDE names, agent tools, or assistant products in commit messages, PR titles, or PR descriptions.
