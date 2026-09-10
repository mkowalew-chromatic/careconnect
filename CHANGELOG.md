# Changelog

All notable changes to CareConnect are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/mkowalew-dev/healthcare-demo/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/mkowalew-dev/healthcare-demo/releases/tag/v0.3.0
[0.2.0]: https://github.com/mkowalew-dev/healthcare-demo/releases/tag/v0.2.0
