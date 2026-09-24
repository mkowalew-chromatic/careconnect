# CareConnect

[![CI](https://github.com/mkowalew-chromatic/careconnect/actions/workflows/ci.yml/badge.svg)](https://github.com/mkowalew-chromatic/careconnect/actions/workflows/ci.yml)
[![Chromatic](https://github.com/mkowalew-chromatic/careconnect/actions/workflows/chromatic.yml/badge.svg)](https://github.com/mkowalew-chromatic/careconnect/actions/workflows/chromatic.yml)

CareConnect is a demo electronic medical record system for outpatient clinics. It is modeled on [Ottehr](https://github.com/masslight/ottehr) but built on its own component library rather than Material UI. The reference deployment runs on **se-tools.net**; you can also run it on a laptop or a single Ubuntu VM.

The repository contains four pieces: a REST **API**, a staff-facing **EHR**, a **Patient Portal**, and the **design system** both frontends are built from. They share one monorepo so that a component change and the application code that uses it land in the same commit. Each piece is nonetheless owned by its own team and is versioned, tagged, released, and deployed independently; see [Versioning & Releases](#versioning--releases).

To find the current version of any piece, check [GitHub Releases](https://github.com/mkowalew-chromatic/careconnect/releases) (tags follow the pattern `@careconnect/<unit>@<version>`) or the `CHANGELOG.md` in that piece's directory. The release process is documented in [docs/RELEASE.md](docs/RELEASE.md).

> **Environment configuration.** Deploy commands take `--config deploy/<environment>.env`, which holds the domain, ports, and install mode for one environment. These files contain secrets and are gitignored; only [`deploy/careconnect.env.example`](deploy/careconnect.env.example) is committed. Copy it to create your own.

---

## Table of Contents

- [Architecture](#architecture)
- [Applications & Ports](#applications--ports)
- [Demo Accounts & Data](#demo-accounts--data)
- [Feature Modules](#feature-modules)
- [Quick Start (Development)](#quick-start-development)
- [Project Structure](#project-structure)
- [Design System](#design-system)
- [Deployment](#deployment)
- [Versioning & Releases](#versioning--releases)
- [License](#license)
- [Acknowledgments](#acknowledgments)

---

## Architecture

CareConnect is an npm workspaces monorepo. A single Express REST API serves every frontend and persists to SQLite. The staff EHR (which includes a role-gated Billing section) and the Patient Portal both authenticate with JWTs.

```
┌───────────────────────────────────────────────┐
│              Browser clients                    │
├──────────────┬──────────────┬───────────────────┤
│   Portal     │     EHR      │    (Telemed)      │
│  :4001       │   :4000      │    WebRTC         │
│              │ (+ Billing)  │                   │
└──────┬───────┴──────┬───────┴────────┬──────────┘
       │              │                │
       └──────────────┴──────┬─────────┘
                             │  /api/* (proxied in prod)
                      ┌──────▼──────┐
                      │  Express API │
                      │   :5000      │
                      └──────┬──────┘
                             │
                      ┌──────▼──────┐
                      │   SQLite    │
                      │ node:sqlite │
                      └─────────────┘
```

### Production layout (Ubuntu VM)

On a production VM, nginx serves the static frontend builds and proxies `/api/` to the API, which runs as the `careconnect-api` systemd service and restarts on reboot.

| Path on VM | Purpose |
|---|---|
| `/opt/careconnect` | Application source, `node_modules`, and the built API |
| `/var/www/careconnect` | Static frontend builds (portal, ehr) |
| `/var/lib/careconnect` | SQLite database (`careconnect.db`) |
| `/etc/careconnect/careconnect.env` | Deploy configuration (domain, mode, ports) |
| `/etc/careconnect/careconnect-api.env` | API runtime secrets (JWT secret, data directory) |

### Shared packages

| Package | Role |
|---|---|
| `@careconnect/types` | Shared TypeScript types and intake questionnaire schemas |
| `@careconnect/api-client` | Fetch wrapper and WebRTC helper used by the frontends |
| `@careconnect/mock-data` | Legacy static data; the API has replaced it in most flows |
| `@careconnect/design-system` | UI components, design tokens, and Storybook (see [Design System](#design-system)) |

---

## Applications & Ports

| Application | Workspace | Dev port | Description |
|---|---|---|---|
| API | `@careconnect/api` | **5000** | Authentication, clinical, admin, billing, fax, and telemed signaling |
| Staff EHR | `@careconnect/ehr` | **4000** | Tracking board, encounters, fax, labs inbox, AI scribe, admin, and role-gated billing (claims, ERAs, patient AR) |
| Patient Portal | `@careconnect/portal` | **4001** | Booking, walk-in registration, paperwork, telemed, and visit history |

In production the frontends are served on ports 80, 443, or 8080 depending on the install mode; see the [Deployment Guide](deploy/DEPLOYMENT.md).

---

## Demo Accounts & Data

### Staff accounts (EHR)

| Email | Name | Role |
|---|---|---|
| `admin@se-tools.net` | Admin User | Administrator |
| `dr.chen@se-tools.net` | Sarah Chen | Provider |
| `dr.torres@se-tools.net` | Michael Torres | Provider |
| `staff@se-tools.net` | Lisa Wong | Staff |
| `billing@se-tools.net` | Rita Alvarez | Billing |
| `manager@se-tools.net` | James Patel | Manager |

All seeded accounts share one demo password. It is not published in this repository; ask a teammate.

Billing (claims, ERAs, patient AR, and master data) lives inside the EHR at `/billing` and is gated by role. Administrators and Billing users have full view, edit, and delete access; Managers have read-only access; other roles do not see the section.

### Patient accounts (Portal)

Sign in as `alice.smith@se-tools.net` or `bob.johnson@se-tools.net` with the same seeded password. Patients see only their own visits, paperwork, and telemed sessions.

### Seeded clinical data

- **Locations:** Main Clinic, Urgent Care West
- **Services:** Urgent Care, Virtual Visit, Follow-up, Annual Physical
- **Appointments:** roughly a dozen patients across the prebooked, in-office, completed, and cancelled statuses
- **Questionnaires:** contact information, medical history, insurance, consent
- **Insurance payers:** Blue Cross Blue Shield, Aetna
- **Billing, fax, and lab inbox samples:** added by migrations when the API starts

### Database location

| Environment | Path |
|---|---|
| Local development | `./data/careconnect.db` (when installed with `deploy/install.sh --local`) |
| Production VM | `/var/lib/careconnect/careconnect.db` |

The database is created and seeded the first time the API starts.

---

## Feature Modules

| Module | Where | Notes |
|---|---|---|
| Appointment booking | Portal | Four-step wizard; virtual and in-person visits |
| Walk-in registration | Portal | Creates the patient record and an in-office visit |
| Intake paperwork | Portal + EHR | Multi-form wizard; responses are harvested into the chart |
| Check-in, cancel, reschedule | Portal | |
| Tracking board | EHR | Filter by status, location, and provider |
| Encounter charting | EHR | Vitals, allergies, medications, HPI, assessment, plan |
| Labs and eRx | EHR encounter | Demo orders only; no external lab or pharmacy integration |
| Unsolicited lab inbox | EHR | Match inbound results to patients |
| AI ambient scribe | EHR encounter | Transcript to draft note to chart |
| Fax in/out | EHR | Simulated PostGrid integration |
| Telemed | Portal + EHR | WebRTC with signaling through the API (STUN only; add TURN for production) |
| RCM billing | EHR (`/billing`, role-gated) | Claims, submission, ERAs, patient AR |
| Admin | EHR | Employees, locations, schedules, questionnaires |
| Reports | EHR | KPIs, incomplete encounters, payments |
| Tasks | EHR | Open task queue |

---

## Quick Start (Development)

### Prerequisites

- **Node.js 24**, the version pinned in [`.nvmrc`](.nvmrc) and used by CI (`nvm use`). The root `engines` field accepts Node 20 or later for running the built API, but the design-system test toolchain requires 22.22 or later, so develop on the `.nvmrc` version.
- **npm 10** or later

### Option A: one-command setup (macOS and Linux)

```bash
git clone https://github.com/mkowalew-chromatic/careconnect.git
cd careconnect
deploy/install.sh --local      # npm ci, builds types + design system + API, writes the API env file
./deploy/start-local.sh        # API :5000, EHR :4000, Portal :4001
```

### Option B: manual dev servers

```bash
npm install
npm run build --workspace=@careconnect/types   # required by the API
npm run ds:build                                # required by EHR and Portal, which import the library's dist/

# Terminal 1: the API needs a JWT secret and database path in its environment
set -a && source deploy/runtime/careconnect-api.env && set +a
npm run api:dev

# Additional terminals
npm run ehr:dev       # http://localhost:4000
npm run portal:dev    # http://localhost:4001
```

The `deploy/runtime/careconnect-api.env` file is written by `deploy/install.sh --local`. If you skipped the installer, run it once, or create the file yourself with `NODE_ENV`, `PORT`, `CARECONNECT_DATA_DIR`, and `JWT_SECRET`.

The per-app `*:dev` scripts call each workspace directly and bypass Turborepo, so they do not rebuild `@careconnect/types` or the design system for you. After changing a component, run `npm run ds:build` (or keep `npm run storybook` open and iterate there); after changing shared types, run `npm run build --workspace=@careconnect/types`.

### Other root scripts

```bash
npm run build         # Turborepo builds every workspace in dependency order
npm run typecheck     # tsc --noEmit in every TypeScript workspace
npm test              # unit tests for the API and design system (smoke tests excluded)
npm run test:stories  # every design-system story as a browser test
npm run smoke:test    # Playwright smoke tests against a running stack (apps/smoke-tests)
```

Both Playwright-backed suites need the browser binaries downloaded once per
machine — `npm install` does not fetch them, and without them the suites fail
with `browserType.launch: Executable doesn't exist`:

```bash
npx playwright install chromium
```

CI installs them the same way, so a green run locally means a green run there.

### Demo walkthrough

**EHR (`localhost:4000`).** Sign in as `admin@se-tools.net`. From the Tracking Board, start an encounter, then explore Fax, Lab Inbox, Admin, Reports, and the AI Scribe tab on the encounter. Sign in as `billing@se-tools.net` (or `manager@se-tools.net` for read-only access) to see the Billing section and work with claims and ERAs.

**Portal (`localhost:4001`).** Book a visit, complete the paperwork, then try a walk-in or a virtual telemed visit.

---

## Project Structure

```
careconnect/
├── apps/
│   ├── api/              # Express REST API + SQLite
│   ├── ehr/              # Staff EHR (React + Vite; includes role-gated billing)
│   ├── portal/           # Patient portal (React + Vite)
│   └── smoke-tests/      # Playwright smoke tests against a running stack
├── packages/
│   ├── design-system/    # UI component library + Storybook
│   ├── types/            # Shared types + questionnaire schemas
│   ├── api-client/       # API client + WebRTC helper
│   └── mock-data/        # Legacy static demo data
├── deploy/               # Install and per-unit deploy scripts, nginx, systemd
│   ├── install.sh        # Ubuntu production installer (all units, from source)
│   ├── install-local.sh  # Local dev setup (no sudo)
│   ├── remote-install.sh # Fresh install, or redeploy CI artifacts, over SSH
│   ├── package-artifact.sh / deploy-artifact.sh / rollback.sh   # one unit at a time
│   ├── update.sh         # Rebuild every unit from source on the VM
│   └── DEPLOYMENT.md     # Full deployment guide
├── scripts/
│   ├── release-units.mjs # The four release units and their owning teams
│   └── github-releases.mjs
├── .changeset/           # Pending changesets + config (independent versioning)
├── .github/
│   ├── CODEOWNERS        # Per-unit review ownership
│   └── workflows/        # ci (per unit), release, deploy, chromatic
├── package.json
└── turbo.json
```

---

## Design System

The design system lives at [`packages/design-system`](packages/design-system) as the private workspace package `@careconnect/design-system`. It ships roughly forty components, spanning form controls, layout, navigation, data display (Table, DataGrid, charts), and clinical widgets such as PatientBanner, VitalSigns, and ScheduleCalendar. The export barrel in [`packages/design-system/src/index.ts`](packages/design-system/src/index.ts) is the authoritative list; Storybook documents each one with healthcare-specific examples.

| Token | Value |
|---|---|
| Primary | Teal `#0D7377` |
| Accent | Coral `#E07A5F` |
| Typeface | Instrument Sans |

```bash
npm run storybook        # browse the components at http://localhost:6006
npm run ds:build         # build the library (the apps depend on its dist/)
npm run test:stories     # run every story as a browser test
                         # (needs `npx playwright install chromium` once)
```

The apps import it like any other workspace package:

```ts
import { Button, ToastProvider } from '@careconnect/design-system';
import '@careconnect/design-system/styles';
```

Because npm links the workspace locally, `npm run build` builds the library before the apps that consume it. The apps therefore always build against the design system at HEAD: a component change is picked up without a publish or version bump, and a change that breaks the EHR or Portal build fails on the design-system pull request. The design system still carries its own version, changelog, git tag, and GitHub Release, cut by the same release flow as the apps. Component conventions are in [packages/design-system/CONTRIBUTING.md](packages/design-system/CONTRIBUTING.md).

---

## Deployment

There are three ways to deploy CareConnect:

| Method | Use when | Documentation |
|---|---|---|
| **Local development** | Working on macOS or Linux | [DEPLOYMENT.md § Local](deploy/DEPLOYMENT.md#local-development) |
| **Remote over SSH** | Deploying from a laptop to an Ubuntu VM | [DEPLOYMENT.md § Remote](deploy/DEPLOYMENT.md#remote-deployment-ssh) |
| **On the VM** | Already logged in to the Ubuntu host | [DEPLOYMENT.md § On-VM](deploy/DEPLOYMENT.md#on-vm-installation) |

Each deployable unit (`api`, `ehr`, `portal`) ships on its own. The **Deploy** workflow builds one unit's artifact, deploys it to staging, runs the smoke tests, and promotes it to production. The release flow dispatches it automatically for every unit that received a new version, and you can also dispatch it by hand for any tag. Because units deploy independently, a portal release never restarts the API.

From your laptop:

```bash
# First install on a fresh VM (builds every unit from this checkout)
./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env

# Redeploy the latest CI-built artifact of one unit (or all units) to an installed VM
./deploy/remote-install.sh --unit portal --config deploy/<environment>.env
```

[deploy/DEPLOYMENT.md](deploy/DEPLOYMENT.md) covers install modes, DNS, SSL, updates, troubleshooting, and file paths.

---

## Versioning & Releases

CareConnect follows [Semantic Versioning](https://semver.org/) and manages versions with [Changesets](https://github.com/changesets/changesets). There are four release units, one per team, and each is versioned, tagged, released, and deployed independently:

| Unit | Team | Changelog | Tag / GitHub Release | Deployed as |
|---|---|---|---|---|
| `@careconnect/api` | Backend | [apps/api/CHANGELOG.md](apps/api/CHANGELOG.md) | `@careconnect/api@X.Y.Z` | systemd service plus database migrations |
| `@careconnect/ehr` | EHR frontend | [apps/ehr/CHANGELOG.md](apps/ehr/CHANGELOG.md) | `@careconnect/ehr@X.Y.Z` | Static bundle behind nginx |
| `@careconnect/portal` | Portal frontend | [apps/portal/CHANGELOG.md](apps/portal/CHANGELOG.md) | `@careconnect/portal@X.Y.Z` | Static bundle behind nginx |
| `@careconnect/design-system` | Design system | [packages/design-system/CHANGELOG.md](packages/design-system/CHANGELOG.md) | `@careconnect/design-system@X.Y.Z` | Not deployed; the apps consume it at HEAD, Storybook is published through Chromatic, and the Figma library is generated from it ([docs/FIGMA.md](docs/FIGMA.md)) |

The shared packages (`types`, `api-client`, `mock-data`) are versioned independently as well, but they ship inside the units that use them, and bumping one automatically patch-bumps its dependents. The root [CHANGELOG.md](CHANGELOG.md) indexes the per-unit changelogs and preserves the pre-monorepo history.

**Contributing a change.** After making a user-facing change, run `npm run changeset`, select only the workspaces you touched, and commit the generated file with your pull request. Review ownership for each unit is defined in [.github/CODEOWNERS](.github/CODEOWNERS).

**Pipeline.** `ci.yml` runs one job per unit on every pull request; only the units the PR touches do real work. The design-system job also runs every story as a browser test. `chromatic.yml` runs on every pull request too — deliberately without a `paths:` filter, so its checks can safely be required in branch protection: a workflow held back by a path filter never starts, and a required check that never starts blocks the pull request forever. TurboSnap keeps that cheap by snapshotting only the stories a commit actually affects. Both workflows also listen on `merge_group`, so their checks still report if you turn on GitHub's merge queue. On merge to `main`, `release.yml` opens or refreshes a **Version Packages** pull request. When that PR merges, the workflow tags each bumped package, creates a GitHub Release for each release unit, and dispatches `deploy.yml` for each deployable unit (staging, then smoke tests, then production, subject to the production environment's approval rules). Details, the one-time GitHub setup, and manual fallbacks are in [docs/RELEASE.md](docs/RELEASE.md).

AI coding agents working in this repository should follow [AGENTS.md](AGENTS.md).

---

## License

MIT. See [LICENSE](LICENSE).

Copyright (c) 2026 Martin Kowalewski

## Acknowledgments

CareConnect is inspired by [Ottehr](https://github.com/masslight/ottehr) by MassLight. It is an independent demo with a different UI stack and a self-hosted backend.
