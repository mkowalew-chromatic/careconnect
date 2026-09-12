# CareConnect

[![CI](https://github.com/mkowalew-chromatic/careconnect/actions/workflows/ci.yml/badge.svg)](https://github.com/mkowalew-chromatic/careconnect/actions/workflows/ci.yml)
[![Chromatic](https://github.com/mkowalew-chromatic/careconnect/actions/workflows/chromatic.yml/badge.svg)](https://github.com/mkowalew-chromatic/careconnect/actions/workflows/chromatic.yml)

**CareConnect** is a healthcare EMR demo inspired by [Ottehr](https://github.com/masslight/ottehr), built with a shared component library instead of Material UI. It is designed for demos on **se-tools.net** and can run locally or on a single Ubuntu VM.

The apps and the component library they are built from live together in this monorepo, so a design system change and the app code that consumes it ship in one commit. Each of the four deliverables — API, EHR, Portal, and the design system — is owned by its own team and **versioned, tagged, released and deployed independently** (see [Versioning & Releases](#versioning--releases)).

**Current versions:** see the [GitHub Releases](https://github.com/mkowalew-chromatic/careconnect/releases) page (one release per unit, tagged `@careconnect/<unit>@<version>`) or each unit's `CHANGELOG.md`; the release process is in [docs/RELEASE.md](docs/RELEASE.md).

> ⚠️ **Environment config:** deploy commands take a `--config deploy/<environment>.env` file holding that environment's domain, ports, and mode. These files are per-environment secrets and are gitignored — only [`deploy/careconnect.env.example`](deploy/careconnect.env.example) is committed. Copy it to create yours.

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

CareConnect is an npm workspaces monorepo. A single **REST API** backs all frontends. The staff **EHR app** (which includes a role-gated Billing section) and the **Patient Portal** use **JWT authentication**.

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

### Production (Ubuntu VM)

On a deployed VM, **nginx** serves static builds and proxies `/api/` to the API. **systemd** runs `careconnect-api` and survives reboot.

| Path on VM | Purpose |
|---|---|
| `/opt/careconnect` | Application source + `node_modules` + built API |
| `/var/www/careconnect` | Static frontends (portal, ehr) |
| `/var/lib/careconnect` | SQLite database (`careconnect.db`) |
| `/etc/careconnect/careconnect.env` | Deploy config (domain, mode, ports) |
| `/etc/careconnect/careconnect-api.env` | API runtime secrets (JWT, data dir) |

### Shared packages

| Package | Role |
|---|---|
| `@careconnect/types` | Shared TypeScript types + intake questionnaire schemas |
| `@careconnect/api-client` | Fetch wrapper + WebRTC helper for frontends |
| `@careconnect/mock-data` | Legacy static data (superseded by API in most flows) |
| `@careconnect/design-system` | UI components, design tokens, and Storybook (see [Design System](#design-system)) |

---

## Applications & Ports

| App / Service | Workspace | Dev port | Description |
|---|---|---|---|
| API | `@careconnect/api` | **5000** | Auth, clinical, admin, billing, fax, telemed signaling |
| Staff EHR | `@careconnect/ehr` | **4000** | Tracking board, encounters, fax, labs inbox, AI scribe, admin, role-gated billing (claims, ERAs, patient AR) |
| Patient Portal | `@careconnect/portal` | **4001** | Booking, walk-in, paperwork, telemed, my visits |

In production, frontends are served on **port 80/443/8080** (see [Deployment Guide](deploy/DEPLOYMENT.md)).

---

## Demo Accounts & Data

### Staff login (EHR)

All seeded staff users share the same password:

| Email | Name | Role |
|---|---|---|
| `admin@se-tools.net` | Admin User | Administrator |
| `dr.chen@se-tools.net` | Sarah Chen | Provider |
| `dr.torres@se-tools.net` | Michael Torres | Provider |
| `staff@se-tools.net` | Lisa Wong | Staff |
| `billing@se-tools.net` | Rita Alvarez | Billing |
| `manager@se-tools.net` | James Patel | Manager |

**Password:** seeded demo password — ask a teammate, not published in this public repo.

Billing (claims, ERAs, patient AR, master data) lives inside the EHR app under `/billing`, and is role-gated: **Administrator** and **Billing** get full view/edit/delete access; **Manager** gets view-only access; other roles don't see it at all.

### Patient portal

Sign in with a patient account. Demo: **alice.smith@se-tools.net** (also **bob.johnson@se-tools.net**) — same seeded password as above. Patients see only their own visits, paperwork, and telemed sessions.

### Seeded clinical data

- **Locations:** Main Clinic, Urgent Care West  
- **Services:** Urgent Care, Virtual Visit, Follow-up, Annual Physical  
- **Appointments:** ~12 patients with statuses prebooked / in-office / completed / cancelled  
- **Questionnaires:** Contact info, medical history, insurance, consent  
- **Insurance payers:** Blue Cross Blue Shield, Aetna  
- **Sample billing/fax/lab inbox** data added on API startup via migrations  

### Database location

| Environment | Path |
|---|---|
| Local dev | `./data/careconnect.db` (when using `deploy/install.sh --local`) |
| Production VM | `/var/lib/careconnect/careconnect.db` |

The database is created and seeded automatically on first API start.

---

## Feature Modules

| Module | Where | Notes |
|---|---|---|
| Appointment booking | Portal | 4-step wizard; virtual + in-person |
| Walk-in registration | Portal | Creates patient + in-office visit |
| Intake paperwork | Portal + EHR | Multi-form wizard; harvests to chart |
| Check-in / cancel / reschedule | Portal | |
| Tracking board | EHR | Filter by status, location, provider |
| Encounter charting | EHR | Vitals, allergies, meds, HPI, assessment, plan |
| Labs & eRx | EHR encounter | Demo orders (no external lab/pharmacy) |
| Unsolicited lab inbox | EHR | Match inbound results to patients |
| AI ambient scribe | EHR encounter | Transcript → note → apply to chart |
| Fax in/out | EHR | Demo PostGrid simulation |
| Telemed | Portal + EHR | WebRTC via API signaling (STUN only; add TURN for prod) |
| RCM billing | EHR (`/billing`, role-gated) | Claims, submit, ERAs, patient AR |
| Admin | EHR | Employees, locations, schedules, questionnaires |
| Reports | EHR | KPIs, incomplete encounters, payments |
| Tasks | EHR | Open task queue |

---

## Quick Start (Development)

### Prerequisites

- **Node.js 24** — the version in [`.nvmrc`](.nvmrc), which CI also uses (`nvm use`). The root `engines` field allows 20+ for *running* the built API, but the design-system test toolchain needs 22.22+, so use `.nvmrc` for development.
- **npm 10+**

### Option A — One-command local setup (macOS/Linux)

```bash
git clone https://github.com/mkowalew-chromatic/careconnect.git
cd careconnect
deploy/install.sh --local      # npm ci, builds types + design system + API, writes API env
./deploy/start-local.sh        # API :5000, EHR :4000, Portal :4001
```

### Option B — Manual dev servers

```bash
npm install
npm run build --workspace=@careconnect/types   # required by the API
npm run ds:build                                # required by EHR + Portal (they import the library's dist/)

# Terminal 1 — API (set env for JWT + DB path)
set -a && source deploy/runtime/careconnect-api.env && set +a
npm run api:dev

# Additional terminals
npm run ehr:dev       # http://localhost:4000
npm run portal:dev    # http://localhost:4001
```

The per-app `*:dev` scripts call the workspace directly and bypass turbo, so they do **not** rebuild `@careconnect/types` or the design system for you. Re-run `npm run ds:build` after changing a component (or keep `npm run storybook` open and iterate there), and `npm run build --workspace=@careconnect/types` after changing shared types.

### Other useful root scripts

```bash
npm run build         # turbo: builds every workspace in dependency order
npm run typecheck     # tsc --noEmit in every TypeScript workspace
npm test              # unit tests (API + design system); excludes smoke tests
npm run smoke:test    # Playwright smoke tests against a running stack (apps/smoke-tests)
```

### Demo walkthrough

**EHR (`localhost:4000`)** — Log in as `admin@se-tools.net`. Use Tracking Board → Start Encounter. Explore Fax, Lab Inbox, Admin, Reports, AI Scribe tab on encounters. Log in as `billing@se-tools.net` (or `manager@se-tools.net` for view-only) to see the role-gated Billing section — manage claims and ERAs.

**Portal (`localhost:4001`)** — Book a visit, complete paperwork, try walk-in or virtual telemed.

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
├── deploy/               # Install + per-unit deploy scripts, nginx, systemd
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

- **Primary:** Teal `#0D7377`  
- **Accent:** Coral `#E07A5F`  
- **Font:** Instrument Sans  
- **Components:** ~40 components — form controls, layout, navigation, data display (Table, DataGrid, charts), and clinical widgets (PatientBanner, VitalSigns, ScheduleCalendar, …). The full list is the export barrel in [`packages/design-system/src/index.ts`](packages/design-system/src/index.ts); browse them in Storybook.

Components live in this repo at [`packages/design-system`](packages/design-system) as the private workspace package `@careconnect/design-system`, documented in its own Storybook with healthcare-specific examples.

```bash
npm run storybook        # browse the components at http://localhost:6006
npm run ds:build         # build the library (apps depend on its dist/)
npm run test:stories     # run stories as tests (needs Playwright browsers)
```

The apps import it like any other workspace package:

```ts
import { Button, ToastProvider } from '@careconnect/design-system';
import '@careconnect/design-system/styles';
```

Because npm links the workspace locally, `npm run build` builds the library before the apps that consume it — the apps always build against the design system at HEAD, so a component change is picked up without a publish/bump cycle, and a change that breaks the EHR or Portal build fails on the design-system PR. The design system still has its own version, changelog, git tag and GitHub Release, cut by the same release flow as the apps. See [packages/design-system/CONTRIBUTING.md](packages/design-system/CONTRIBUTING.md) for component conventions.

---

## Deployment

CareConnect supports three deployment paths:

| Method | Use when | Doc |
|---|---|---|
| **Local dev** | macOS/Linux development | [DEPLOYMENT.md § Local](deploy/DEPLOYMENT.md#local-development) |
| **Remote SSH** | Deploy from laptop to Ubuntu VM | [DEPLOYMENT.md § Remote](deploy/DEPLOYMENT.md#remote-deployment-ssh) |
| **On-VM install** | Already SSH'd into Ubuntu | [DEPLOYMENT.md § On-VM](deploy/DEPLOYMENT.md#on-vm-installation) |

Each deployable unit (`api`, `ehr`, `portal`) ships on its own: the **Deploy** workflow builds one unit's artifact, deploys it to staging, smoke-tests it, and promotes it to production — dispatched automatically by the release flow for every unit that got a new version, or by hand for any tag. A portal release never restarts the API.

**From your laptop:**

```bash
# First install on a fresh VM (builds every unit from this checkout)
./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env

# Redeploy the latest CI-built artifact of one unit (or all) to an installed VM
./deploy/remote-install.sh --unit portal --config deploy/<environment>.env
```

See **[deploy/DEPLOYMENT.md](deploy/DEPLOYMENT.md)** for install modes, DNS, SSL, updates, troubleshooting, and file paths.

---

## Versioning & Releases

CareConnect uses **Semantic Versioning** and **[Changesets](https://github.com/changesets/changesets)**. Four **release units** version, tag, release and deploy independently — one per team:

| Unit | Team | Changelog | Tag / GitHub Release | Deployed as |
|---|---|---|---|---|
| `@careconnect/api` | Backend | [apps/api/CHANGELOG.md](apps/api/CHANGELOG.md) | `@careconnect/api@X.Y.Z` | systemd service + DB migrations |
| `@careconnect/ehr` | EHR frontend | [apps/ehr/CHANGELOG.md](apps/ehr/CHANGELOG.md) | `@careconnect/ehr@X.Y.Z` | static bundle behind nginx |
| `@careconnect/portal` | Portal frontend | [apps/portal/CHANGELOG.md](apps/portal/CHANGELOG.md) | `@careconnect/portal@X.Y.Z` | static bundle behind nginx |
| `@careconnect/design-system` | Design system | [packages/design-system/CHANGELOG.md](packages/design-system/CHANGELOG.md) | `@careconnect/design-system@X.Y.Z` | not deployed — consumed at HEAD by the apps; Storybook published via Chromatic |

Shared packages (`types`, `api-client`, `mock-data`) version independently too but ship inside the units that use them; a bump to one of them automatically patch-bumps its dependents. [CHANGELOG.md](CHANGELOG.md) indexes the per-unit changelogs and keeps the frozen pre-monorepo history.

**Contributors:** after a user-facing change, run `npm run changeset`, select only the workspace(s) you changed, and commit the generated file with your PR. Review ownership per unit is in [.github/CODEOWNERS](.github/CODEOWNERS).

**Pipeline:** `ci.yml` runs one job per unit on every PR (only units the PR affects do real work). On merge to `main`, `release.yml` opens or refreshes a **Version Packages** PR; when that merges, it tags each bumped package, creates a GitHub Release per release unit, and dispatches `deploy.yml` for each deployable unit (staging → smoke tests → production, with the production environment's approval rules). Details, one-time GitHub setup, and manual fallbacks: [docs/RELEASE.md](docs/RELEASE.md).

Agent rules: follow [AGENTS.md](AGENTS.md).

---

## License

MIT — See [LICENSE](LICENSE)

Copyright (c) 2026 Martin Kowalewski

## Acknowledgments

Inspired by [Ottehr](https://github.com/masslight/ottehr) by MassLight. CareConnect is an independent demo with a different UI stack and self-hosted backend.
