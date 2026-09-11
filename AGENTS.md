# Agent instructions — CareConnect

**Canonical agent guide for this repository.** (`CLAUDE.md` is gitignored and reserved for personal, local-only notes — do not put shared rules there.)

Human-oriented release details: [docs/RELEASE.md](docs/RELEASE.md).

## Project

Healthcare EMR demo monorepo: API (Express + SQLite), EHR (includes role-gated Billing section), Portal, and the shared UI component library. UI components live here as the workspace package [`@careconnect/design-system`](packages/design-system) — change a component and its consumers in the same commit; there is no publish step. Deployed as a single unit to Ubuntu VMs on **se-tools.net**.

## Standard workflows

| Task | Command / doc |
|------|----------------|
| Local dev setup | `deploy/install.sh --local` → `./deploy/start-local.sh` |
| Remote VM deploy | `./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env` (see [After a release](#after-a-release-deploy)) |
| Build | `npm run build` (turbo; builds types + design system before the apps) |
| Typecheck / tests | `npm run typecheck` (every TS workspace) · `npm test` (API + design system unit tests) · `npm run smoke:test` (Playwright, needs a running stack) |
| Component library / Storybook | `npm run storybook` → http://localhost:6006 |
| Staff login | `admin@se-tools.net` / seeded demo password (ask a teammate) |
| Billing role login | `billing@se-tools.net` (full access) or `manager@se-tools.net` (view-only) / same seeded password |

See [README.md](README.md), [deploy/DEPLOYMENT.md](deploy/DEPLOYMENT.md).

## Versioning & releases (required)

**SemVer** via **Changesets**. The app and shared workspaces (`api`, `ehr`, `portal`, `smoke-tests`, `types`, `api-client`, `mock-data`) form a **fixed** group in [.changeset/config.json](.changeset/config.json) and always share one version — that is the "CareConnect version" (`vX.Y.Z` tags, root `package.json`, README). `@careconnect/design-system` is **not** in the group; it versions independently with its own changelog.

### When implementing changes

1. **User-facing change** (features, fixes, API/UI behavior, deploy behavior) → add a changeset before finishing:
   ```bash
   npm run changeset
   ```
   Commit the generated `.changeset/*.md` with the PR. Pick patch / minor / major per [docs/RELEASE.md](docs/RELEASE.md).

2. **Internal-only** (comments, refactors with no behavior change) → no changeset required.

3. **Do not** manually bump `version` in `package.json` files — `npm run version-packages` (Changesets) updates every workspace in the fixed group together.

4. **Do not** hardcode version strings in code. API version comes from [apps/api/src/version.ts](apps/api/src/version.ts) reading `apps/api/package.json`.

5. **Do not** manually edit the per-package changelogs ([apps/api/CHANGELOG.md](apps/api/CHANGELOG.md), [packages/design-system/CHANGELOG.md](packages/design-system/CHANGELOG.md), etc.) — Changesets writes them. The root [CHANGELOG.md](CHANGELOG.md) is a frozen pre-monorepo archive plus an index; it is not updated per release.

### Release flow

- CI: `.github/workflows/ci.yml` — `npm ci`, typecheck, test, and build on PRs to `main`
- Visual review: `.github/workflows/chromatic.yml` — publishes Storybook on design system PRs
- Release (manual for now): run `npm run version-packages`, then `npm run release:publish` to tag `vX.Y.Z` and cut the GitHub Release. The Version-Packages-PR / auto-merge / CD-pipeline workflows from the pre-merge repos have **not** been ported yet — see [docs/RELEASE.md](docs/RELEASE.md).

### After a release (deploy)

```bash
git fetch --tags && git checkout vX.Y.Z
sudo /opt/careconnect/deploy/update.sh
```

Or from laptop: `./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env` (the `--build-from-source` flag is required until `cd-pipeline.yml` is ported; without it the script looks for a CI-built artifact that doesn't exist yet). Environment config files are gitignored — create them from `deploy/careconnect.env.example`, and do not name real hostnames or environments in docs or commit messages.

### Checklist before marking work complete

- [ ] Build passes (`npm run build`)
- [ ] Typecheck and tests pass (`npm run typecheck`, `npm test`) — use the Node version in `.nvmrc`
- [ ] Changeset added if user-facing
- [ ] No manual version or CHANGELOG edits
- [ ] API `/health` uses `APP_VERSION` from package.json (no hardcoded version)

## Code conventions

- Minimize scope; match existing patterns in surrounding files.
- Shared types in `@careconnect/types`; API client in `@careconnect/api-client`; UI components in `@careconnect/design-system` (add new components there, not in an app).
- Private monorepo — no workspace is published to a registry.
- The per-app `*:dev` scripts bypass turbo: after changing `@careconnect/types` or the design system, rebuild it (`npm run build --workspace=@careconnect/types` / `npm run ds:build`) before the apps see the change. `deploy/install.sh --local` builds all three once.

## Commits and pull requests

- Describe **what changed and why** in product or engineering terms only.
- Do **not** mention IDE names, agent tools, or assistant products in commit messages, PR titles, or PR descriptions.
