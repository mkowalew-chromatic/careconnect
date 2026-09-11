# Changelog

CareConnect's release history is written by [Changesets](https://github.com/changesets/changesets)
into per-package changelogs. Start here:

| Changelog | Covers |
|---|---|
| [apps/api/CHANGELOG.md](apps/api/CHANGELOG.md) | The **CareConnect app version** — `@careconnect/api`, `ehr`, `portal`, `smoke-tests`, `types`, `api-client`, and `mock-data` share one version (a Changesets fixed group). Each `vX.Y.Z` git tag and GitHub Release corresponds to a section here. The other workspaces in the group have their own `CHANGELOG.md` too, but they only record dependency bumps. |
| [packages/design-system/CHANGELOG.md](packages/design-system/CHANGELOG.md) | `@careconnect/design-system`, which versions independently of the app. |

See [docs/RELEASE.md](docs/RELEASE.md) for how releases are cut.

---

## Pre-monorepo history (frozen)

The entries below are from the EMR demo repository before it was merged with
the design system into this monorepo at `v1.0.0`. They are kept for reference
and are **not updated** — names like `@careconnect/billing` and `packages/ui`
refer to the layout at that time (billing has since been folded into the EHR
app as a role-gated section, and the UI library is now
`packages/design-system`). This section follows the
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

## [0.3.0] - 2026-08-21

### Added

- Authenticated patient Portal (login, API scoping for patient users)
- Agent/release docs (`AGENTS.md`, Changesets CI/release, Cloudflare Tunnel notes)

### Changed

- Staff login UX (redirect after login, clearer API errors)
- Installer fixes (`CONFIG_DIR` when sourcing deploy config)

### Fixed

- Storybook build (`packages/ui/public` assets tracked in git)

## [0.2.0] - 2026-08-21

### Added

- **Billing app** (`@careconnect/billing`) — claims, ERAs, charge items, and patient AR
- **API modules** — billing, fax, AI scribe, WebRTC telemed signaling, walk-in appointments, lab inbox, expanded reports
- **EHR** — Fax page, unsolicited lab inbox, AI scribe on encounters, questionnaire builder in admin
- **Portal** — Walk-in registration, WebRTC telemed video
- **Deployment** — Ubuntu installer with systemd + nginx, remote SSH install, local dev setup (`--local`), billing in nginx templates
- **Documentation** — README architecture/demo accounts, `deploy/DEPLOYMENT.md`
- **Release tooling** — Changesets, CI workflow, release workflow, `docs/RELEASE.md`

### Changed

- API `/health` reads version from package metadata (unified monorepo version)
- `@careconnect/types` compiled to JavaScript for production API runtime
