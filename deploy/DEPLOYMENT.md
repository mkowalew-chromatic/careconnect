# CareConnect Deployment Guide

This guide covers installing CareConnect locally for development, deploying to an Ubuntu VM (directly or over SSH), and applying updates.

> **Read first — two things this guide assumes that a fresh clone doesn't have:**
>
> 1. **Per-environment config files.** `deploy/se-tools.net.env` and `deploy/staging.se-tools.net.env` appear throughout the examples but are **gitignored** (they hold environment-specific settings). Create them from [`careconnect.env.example`](careconnect.env.example) before running any command that references them.
> 2. **The CD pipeline is not ported yet.** The artifact-based deploy path (`fetch-ci-artifact.sh`, `deploy-artifact.sh`, and the "already installed" branch of `remote-install.sh`) expects a GitHub Actions workflow named `cd-pipeline.yml` that does not exist in this repo yet. Until it is ported (see [docs/RELEASE.md § Planned automation](../docs/RELEASE.md#planned-automation)), **always pass `--build-from-source` to `remote-install.sh`**; without it the script stops with "No successful CD Pipeline run found". The artifact scripts are documented below so the pipeline can be restored.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Local Development](#local-development)
4. [Remote Deployment (SSH)](#remote-deployment-ssh)
5. [On-VM Installation](#on-vm-installation)
6. [Install Modes & URLs](#install-modes--urls)
7. [Configuration Reference](#configuration-reference)
8. [Updates](#updates)
9. [Service Management](#service-management)
10. [SSL (Let's Encrypt)](#ssl-lets-encrypt)
11. [Uninstall](#uninstall)
12. [Troubleshooting](#troubleshooting)

---

## Overview

| Script | Runs on | Requires sudo | Purpose |
|---|---|---|---|
| `deploy/install.sh --local` | Your Mac/Linux | No | Dev deps, builds types + design system + API, writes API env + start script |
| `deploy/remote-install.sh --build-from-source` | Your laptop | No (SSH to VM uses sudo there) | Ships your checkout to the VM and runs the full source install/rebuild there. (Without the flag, an already-installed VM gets the CI-built artifact instead — **not available until `cd-pipeline.yml` is ported**) |
| `deploy/fetch-ci-artifact.sh` | Your laptop | No | Downloads the latest CD Pipeline artifact; requires `gh` authenticated — **inert until `cd-pipeline.yml` is ported** |
| `deploy/install.sh` | Ubuntu VM | **Yes** | Full production install (builds from source) |
| `deploy/update.sh` | Ubuntu VM | **Yes** | Rebuild from source and redeploy in place |
| `deploy/uninstall.sh` | Ubuntu VM | **Yes** | Remove CareConnect |

**Important:** Do not run `sudo deploy/install.sh` on macOS — it uses `apt-get`, nginx, and systemd, which are Linux-only. On macOS use `--local` or `remote-install.sh`.

**Component library:** the shared UI components (Button, Card, Table, Navbar, …) live in this repo at `packages/design-system`. `build-production.sh` builds it before the frontends (turbo orders it via `dependsOn`), and Vite inlines it into each app bundle — there is no separate library artifact to deploy, and no registry credentials are needed to install.

---

## Prerequisites

### Local development (Mac/Linux)

- Node.js **24** — the version in the repo's [`.nvmrc`](../.nvmrc) (`nvm use`); CI uses the same file. Older than 22.22 fails the design-system tests.
- npm 10+
- `openssl` (usually preinstalled)

### Production VM (Ubuntu 22.04+ recommended)

- Ubuntu or Debian with `apt-get` (the installer adds Node.js `NODE_MAJOR`, default 22 — enough to build and run; the stricter Node 24 above is only for the local test toolchain)
- Root/sudo access
- **2 GB+ RAM** recommended for `npm ci` + builds
- Open ports: HTTP (80 or custom, e.g. 8080), API internal (5000, localhost only)
- Optional: DNS A records for subdomain mode

### Remote deploy from laptop

- SSH access to the VM (e.g. `cisco@192.168.11.8`)
- `rsync` and `ssh` on your laptop
- Optional: SSH key — run `./deploy/setup-ssh-key.sh` once

---

## Local Development

### Automated setup

```bash
cd careconnect
deploy/install.sh --local
```

This will:

1. Run `npm ci --include=dev`
2. Build `@careconnect/types`, `@careconnect/design-system`, and the API (the EHR and Portal dev servers import the design system's `dist/`, so it must exist before they start)
3. Write `deploy/runtime/careconnect-api.env` (JWT secret, DB path)
4. Create `deploy/start-local.sh`

### Start all services

```bash
./deploy/start-local.sh
```

| Service | URL |
|---|---|
| API | http://localhost:5000 |
| EHR | http://localhost:4000 |
| Portal | http://localhost:4001 |

**Staff login:** `admin@se-tools.net` / seeded demo password (ask a teammate)
**Billing role (within EHR):** `billing@se-tools.net` for full access, or `manager@se-tools.net` for view-only — same seeded password

Press `Ctrl+C` to stop all dev servers.

### Optional config file

```bash
deploy/install.sh --local --config deploy/se-tools.net.env
```

The config is sourced for reference; dev servers always use the ports above (Vite defaults).

### Manual start (individual terminals)

```bash
set -a && source deploy/runtime/careconnect-api.env && set +a
npm run api:dev
npm run ehr:dev
npm run portal:dev
```

These per-app scripts bypass turbo. After editing a design-system component run `npm run ds:build` (or iterate in `npm run storybook`); after editing `@careconnect/types` run `npm run build --workspace=@careconnect/types`.

### Local paths

| Item | Path |
|---|---|
| SQLite DB | `./data/careconnect.db` |
| API env | `deploy/runtime/careconnect-api.env` |
| JWT secret | Stored in API env file (gitignored) |

---

## Remote Deployment (SSH)

**Recommended** when your Ubuntu VM already exists (e.g. `192.168.11.8`).

Run from your **laptop**, not on the VM:

```bash
./deploy/remote-install.sh --build-from-source --config deploy/se-tools.net.env
```

### What happens

1. **SSH test** to `cisco@192.168.11.8` (defaults; override below)
2. **Checks** whether CareConnect is already installed on the VM
3. **`--build-from-source` passed, or not yet installed** (fresh VM): transfers the project over a tar/ssh pipe and runs the full `deploy/install.sh --config deploy/se-tools.net.env` on the VM (builds types + design system + apps from source; several minutes).
   **Already installed and no flag:** downloads the latest [CD Pipeline](#artifact-based-deploys-ci) artifact via `deploy/fetch-ci-artifact.sh`, copies it over, and runs `deploy-artifact.sh` on the VM — the same deploy CI would perform, so it can't drift from what CI validated. Requires the `gh` CLI, authenticated (`gh auth login`). **This branch fails today** because `cd-pipeline.yml` has not been ported, which is why every example in this guide passes `--build-from-source`.
4. Prints summary URLs on your laptop

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `VM_USER` | `cisco` | SSH username |
| `VM_HOST` | `192.168.11.8` | VM IP or hostname |
| `VM_PORT` | `22` | SSH port |
| `SSH_KEY` | (none) | Path to private key |

Examples:

```bash
# se-tools.net subdomain config
./deploy/remote-install.sh --build-from-source --config deploy/se-tools.net.env

# Custom host + key
VM_USER=cisco VM_HOST=192.168.11.8 SSH_KEY=~/.ssh/id_ed25519 \
  ./deploy/remote-install.sh --build-from-source --config deploy/se-tools.net.env

# Path mode on VM IP (no DNS)
./deploy/remote-install.sh --build-from-source --mode path --domain 192.168.11.8
```

### SSH key setup (one time)

```bash
./deploy/setup-ssh-key.sh
# or: ssh-copy-id -i ~/.ssh/id_ed25519.pub cisco@192.168.11.8
```

---

## On-VM Installation

If you are already logged into the Ubuntu VM:

```bash
git clone https://github.com/mkowalew-chromatic/careconnect.git
cd careconnect
sudo deploy/install.sh --config deploy/se-tools.net.env
```

Or copy the repo with `rsync`/`scp` and run the same command.

### What the production installer does

1. Installs Node.js 22, nginx, curl, openssl, rsync, ufw
2. Creates system user `careconnect`
3. Syncs app to `/opt/careconnect`
4. Runs `npm ci` and `npm run build` (turbo builds `@careconnect/types` and the design system first, then API, EHR, Portal), then prunes dev dependencies
5. Publishes static files to `/var/www/careconnect/{portal,ehr}`
6. Writes `/etc/careconnect/careconnect.env` and `careconnect-api.env`
7. Enables and starts **systemd** services: `careconnect-api`, `nginx`
8. Configures nginx + firewall
9. Waits for API health check (`GET /health`)
10. Optionally runs Let's Encrypt (`--ssl`)

Services are **enabled on boot** — they survive VM reboot.

---

## Install Modes & URLs

Configure via `DEPLOY_MODE` in your env file or CLI flags.

### Subdomain mode (`DEPLOY_MODE=subdomain`)

Each app gets its own hostname. nginx routes by `server_name`.

**Example:** `deploy/se-tools.net.env`

| App | URL (port 8080 in current config) |
|---|---|
| Portal | http://portal.se-tools.net:8080 |
| EHR | http://ehr.se-tools.net:8080 |

**DNS:** A records for each subdomain → VM IP (e.g. `192.168.11.8`), **or** Cloudflare Tunnel (see below).

**Local testing without DNS** — add to `/etc/hosts`:

```
192.168.11.8  portal.se-tools.net ehr.se-tools.net
```

### Cloudflare Tunnel (se-tools.net production)

CareConnect on **se-tools.net** is fronted by **Cloudflare** (HTTPS in the browser) and reaches the VM via **cloudflared**. nginx listens on **HTTP port 8080** on the VM; `ENABLE_SSL=false` in `deploy/se-tools.net.env` is correct — TLS terminates at Cloudflare.

```
Browser ──HTTPS──► Cloudflare ──tunnel──► cloudflared ──HTTP──► nginx :8080 ──► /api/ ──► Node API :5000
```

**Ingress rule:** send every CareConnect hostname to the **same** local nginx port. nginx routes by `Host` (`ehr.se-tools.net`, `portal.se-tools.net`, etc.).

Example `/etc/cloudflared/config.yml`:

```yaml
tunnel: <your-tunnel-id>
credentials-file: /etc/cloudflared/<your-tunnel-id>.json

ingress:
  - hostname: portal.se-tools.net
    service: http://127.0.0.1:8080
  - hostname: ehr.se-tools.net
    service: http://127.0.0.1:8080
  - service: http_status:404
```

**Do not:**

- Point `/api/*` at a separate legacy backend (e.g. Python `/api/v1/*`) — staff login will 401 while the CareConnect UI loads.
- Omit the `Host` header path (use nginx on 8080, not raw `127.0.0.1:5000`), unless you add CORS and static hosting elsewhere.

**Cloudflare dashboard:**

- DNS: each subdomain → CNAME to `<tunnel-id>.cfargotunnel.com` (proxied orange cloud).
- SSL/TLS mode: **Full** or **Full (strict)** is fine with cloudflared.
- Optional: Cache rule — bypass cache for `/api/*`.

**Verify from the VM** (same path the tunnel should use):

```bash
curl -s http://127.0.0.1:8080/api/health -H 'Host: ehr.se-tools.net'   # after latest deploy
curl -s -X POST http://127.0.0.1:8080/api/auth/login -H 'Host: ehr.se-tools.net' \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@se-tools.net","password":"<seeded demo password>"}'
```

**Public URLs** (no `:8080` in the browser when tunnel + DNS are correct):

| App | URL |
|-----|-----|
| Portal | https://portal.se-tools.net |
| EHR | https://ehr.se-tools.net |

After changing tunnel ingress: `sudo systemctl restart cloudflared` (or your cloudflared unit name).


### Path mode (`DEPLOY_MODE=path`)

Single domain/IP, path-based routing:

| App | URL |
|---|---|
| Portal | http://192.168.11.8/ |
| EHR | http://192.168.11.8/ehr/ |

Best for lab VMs without DNS.

### Ports mode (`DEPLOY_MODE=ports`)

Each app on a separate port (legacy):

| App | Default port |
|---|---|
| Portal | 8080 |
| EHR | 8081 |

All modes proxy `/api/` → `http://127.0.0.1:5000`.

---

## Configuration Reference

### Main config: `/etc/careconnect/careconnect.env`

Copied from your `--config` file on install. Example: `deploy/se-tools.net.env`.

| Variable | Description |
|---|---|
| `DOMAIN` | Primary domain or VM IP |
| `DEPLOY_MODE` | `path` \| `subdomain` \| `ports` |
| `PORTAL_HOST`, `EHR_HOST` | Subdomain prefixes |
| `PORTAL_PORT`, `EHR_PORT`, … | HTTP listen ports |
| `ENABLE_SSL` | `true` to run certbot (subdomain mode) |
| `SSL_EMAIL` | Let's Encrypt contact email |
| `NODE_MAJOR` | Node.js version (default 22) |
| `INSTALL_DIR` | `/opt/careconnect` |
| `WWW_ROOT` | `/var/www/careconnect` |

See [`careconnect.env.example`](careconnect.env.example) for all options.

### API runtime: `/etc/careconnect/careconnect-api.env`

| Variable | Description |
|---|---|
| `PORT` | API listen port (5000) |
| `CARECONNECT_DATA_DIR` | SQLite directory (`/var/lib/careconnect`) |
| `JWT_SECRET` | Auto-generated on first install |
| `NODE_ENV` | `production` |

**Do not commit this file.** Rotate `JWT_SECRET` if compromised (invalidates existing staff sessions).

---

## Updates

After a [release](../docs/RELEASE.md) or when pulling new code:

### Deploy a specific release tag (recommended)

```bash
cd /opt/careconnect
sudo -u careconnect git fetch --tags
sudo -u careconnect git checkout vX.Y.Z   # replace with target release
sudo /opt/careconnect/deploy/update.sh
```

### On the VM (latest main)

```bash
# 1. Sync new code to /opt/careconnect (git pull, rsync, or re-run remote-install)
cd /opt/careconnect && sudo -u careconnect git pull   # if using git

# 2. Rebuild and redeploy
sudo /opt/careconnect/deploy/update.sh
```

`update.sh` will:

1. Run `deploy/build-production.sh` (npm ci, `npm run build` for every workspace via turbo, prune dev deps)
2. Rsync static dists to `/var/www/careconnect`
3. Restart `careconnect-api`
4. Reload nginx
5. Verify API health

### From your laptop (redeploy)

Re-running remote install is safe. With `--build-from-source` it rebuilds on the VM from your local checkout (the artifact path it uses otherwise needs the not-yet-ported CD pipeline):

```bash
./deploy/remote-install.sh --build-from-source --config deploy/se-tools.net.env
```

### What updates do **not** reset

- SQLite data in `/var/lib/careconnect` (patients, appointments, etc.)
- `JWT_SECRET` in `careconnect-api.env` (preserved unless you delete it)
- `/etc/careconnect/careconnect.env` (updated from your config file on reinstall)

### Database migrations

Schema changes run automatically on API startup via `migrateModules()` in the API. No separate migration command is required for local/manual deployments (`update.sh`, `remote-install.sh`, `install.sh`) — this boot-time behavior is unchanged and still applies there.

The artifact deploy path (`deploy-artifact.sh`, described below) additionally runs migrations as an explicit, abortable pre-flight step *before* the service restarts, rather than relying on boot-time migration alone. This is the path production and pre-prod deploys will use once the CD pipeline is ported.

---

## Artifact-Based Deploys (CI)

> **Not active yet.** The scripts in this section are in the repo and work when given an artifact, but the `cd-pipeline.yml` workflow that produces and uploads artifacts has not been ported to this repo. Until it is, `fetch-ci-artifact.sh` finds nothing and `remote-install.sh` must be run with `--build-from-source`. See [docs/RELEASE.md § Planned automation](../docs/RELEASE.md#planned-automation) for what the workflow should do.

The app is built **once** into a versioned tarball ("artifact") and that same artifact is shipped, unchanged, to each environment — rather than rebuilding from source on every target VM. This is how `cd-pipeline.yml` deploys to preprod/prod, and also what `remote-install.sh` deploys to an already-installed VM when `--build-from-source` is not passed — so a human-triggered redeploy and the automated pipeline cannot disagree about what's actually running.

| Script | Runs on | Purpose |
|---|---|---|
| `deploy/fetch-ci-artifact.sh [output-dir]` | Your laptop | Download the latest successful CD Pipeline artifact; requires `gh` authenticated |
| `deploy/package-artifact.sh [output-dir] [config-file]` | Build machine / CI | Build once, package into a versioned tarball |
| `deploy/deploy-artifact.sh <artifact-tarball> [config-file]` | Ubuntu VM (as root) | Deploy a built artifact: backup DB, sync code, migrate, publish, restart, health-check |
| `deploy/rollback.sh <previous-artifact-tarball> <db-backup-path> [config-file]` | Ubuntu VM (as root) | Restore a previous artifact + database backup |

### `package-artifact.sh`

```bash
deploy/package-artifact.sh [output-dir] [config-file]
```

Builds the monorepo once (via `build-production.sh`, which builds the design system into the app bundles) and packages the result into a versioned tarball named `careconnect-<version>-<git-sha>.tar.gz`. The tarball's path is printed as the script's last line of output, so callers can capture it directly (e.g. `ARTIFACT="$(deploy/package-artifact.sh)"`).

Defaults to `deploy/se-tools.net.env` if no config file is given. **Build behavior depends on `DEPLOY_MODE`** — specifically `VITE_EHR_BASE` and `VITE_PORTAL_BASE` are baked into the JS bundles at build time — so the config passed here must match the target environment (e.g. `deploy/staging.se-tools.net.env` for pre-prod). The resulting `MANIFEST.json` inside the artifact records `deployMode`, which `deploy-artifact.sh`/`rollback.sh` verify against the target's own config before deploying.

### `deploy-artifact.sh`

```bash
sudo deploy/deploy-artifact.sh <artifact-tarball> [config-file]
```

Deploys a pre-built artifact (from `package-artifact.sh`) to this VM: backs up the database, syncs the new code into `/opt/careconnect`, runs pending migrations, publishes static files, restarts `careconnect-api`, reloads nginx, and health-checks. If migrations fail, the pre-deploy database backup is restored and **`careconnect-api` is left stopped** (not restarted) to avoid crash-looping on the still-broken new code — use `rollback.sh` to recover.

This is what CI uses for automated pre-prod/prod deploys. A human operator doing an ad-hoc rebuild-in-place on the VM should keep using `update.sh` instead.

### `rollback.sh`

```bash
sudo deploy/rollback.sh <previous-artifact-tarball> <db-backup-path> [config-file]
```

Restores a previous artifact and a named database backup. Takes a fresh backup of the *current* database first (so a rollback is itself reversible), then restores the given backup, syncs the previous code, publishes static files, restarts, and health-checks. No migrations are re-run — the restored database backup is expected to already match the restored code's schema.

---

## Service Management

```bash
# Status
systemctl status careconnect-api nginx

# Logs (live)
journalctl -u careconnect-api -f
journalctl -u nginx -f

# Restart
sudo systemctl restart careconnect-api
sudo systemctl reload nginx

# Confirm enabled on boot
systemctl is-enabled careconnect-api nginx
```

### Health check

```bash
curl http://127.0.0.1:5000/health
# {"status":"ok","service":"careconnect-api","version":"1.0.2"}   ← version = apps/api/package.json
```

### After VM reboot

Both services should start automatically. Verify with:

```bash
systemctl status careconnect-api nginx
curl -s http://127.0.0.1:5000/health
```

---

## SSL (Let's Encrypt)

Requires **subdomain mode** and public DNS pointing to the VM.

```bash
sudo deploy/install.sh --config deploy/se-tools.net.env --ssl --email admin@se-tools.net
```

Or set `ENABLE_SSL="true"` in your env file before install.

Certbot requests certificates for:

- `portal.{DOMAIN}`
- `ehr.{DOMAIN}`

---

## Uninstall

On the VM:

```bash
sudo /opt/careconnect/deploy/uninstall.sh
```

Removes:

- `/opt/careconnect`
- `/var/www/careconnect`
- `/etc/careconnect`
- `/var/lib/careconnect` (including database)
- `careconnect-api` systemd unit

nginx remains installed; default site is restored.

---

## Troubleshooting

### `apt-get: command not found` on Mac

You ran the production installer locally. Use:

```bash
deploy/install.sh --local
# or
./deploy/remote-install.sh --build-from-source --config deploy/se-tools.net.env
```

### API health check failed after install

```bash
journalctl -u careconnect-api -n 80 --no-pager
ls -la /opt/careconnect/apps/api/dist/
ls -la /var/lib/careconnect/
```

Common causes: Node version mismatch, build failure, permission on data dir.

### nginx 502 / blank page

```bash
sudo nginx -t
systemctl status nginx
curl http://127.0.0.1:5000/health
ls /var/www/careconnect/portal/index.html
```

### Staff login fails (401, no error, or silent return)

CareConnect expects **`POST /api/auth/login`** on the **Node.js** API (`service: careconnect-api`). If server logs show **`/api/v1/auth/login`** and **uvicorn**, traffic is hitting a **legacy Python backend** — common when Cloudflare Tunnel ingress still points `/api/*` (or the whole host) at the old service instead of nginx `:8080`.

**On the VM:**

```bash
# Must return: {"status":"ok","service":"careconnect-api",...}
curl -s http://127.0.0.1:5000/health
curl -s http://127.0.0.1:5000/api/health

systemctl status careconnect-api
journalctl -u careconnect-api -n 30 --no-pager

# See what owns port 5000
ss -tlnp | grep ':5000'
```

If `/health` does not include `"careconnect-api"`, stop the conflicting service on port 5000, then:

```bash
sudo systemctl restart careconnect-api
```

From a browser (via nginx):

```bash
curl -s http://ehr.se-tools.net:8080/api/health
curl -s -X POST http://ehr.se-tools.net:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@se-tools.net","password":"<seeded demo password>"}'
```

- Default staff password: seeded demo password (ask a teammate)
- Re-deploy UI after fixes: `./deploy/remote-install.sh --build-from-source --config deploy/se-tools.net.env`
- If JWT secret changed, log in again (old tokens invalid)

### Subdomain URLs don't resolve

- Confirm DNS A records or `/etc/hosts` entries
- Confirm nginx `server_name` matches your hostname
- Check port (8080 in `se-tools.net.env` vs default 80)

### `DOMAIN: unbound variable` after remote install

Fixed in current `remote-install.sh`. Update your local repo and re-run if needed; the VM install itself was still successful.

### Rebuild only (no full reinstall)

```bash
sudo /opt/careconnect/deploy/update.sh
```

---

## Quick Reference

| Task | Command |
|---|---|
| Local dev setup | `deploy/install.sh --local` |
| Start local dev | `./deploy/start-local.sh` |
| Rebuild design system for dev servers | `npm run ds:build` |
| Deploy to VM from laptop | `./deploy/remote-install.sh --build-from-source --config deploy/se-tools.net.env` |
| Install on VM | `sudo deploy/install.sh --config deploy/se-tools.net.env` |
| Update on VM | `sudo /opt/careconnect/deploy/update.sh` |
| Deploy release tag | `git checkout vX.Y.Z && sudo deploy/update.sh` |
| Release process | [docs/RELEASE.md](../docs/RELEASE.md) |
| Uninstall on VM | `sudo /opt/careconnect/deploy/uninstall.sh` |
| API logs | `journalctl -u careconnect-api -f` |
| Staff login | `admin@se-tools.net` / seeded demo password (ask a teammate) |

---

## Deploy Hints

**Deploy the latest `main` to se-tools.net, from your laptop:**

```bash
git checkout main && git pull
SSH_KEY=~/.ssh/id_ed25519_singlevm ./deploy/remote-install.sh --build-from-source --config deploy/se-tools.net.env
```

- Run from the repo root. `--build-from-source` ships whatever is in your working tree, so pull `main` (or check out the tag you want, `git checkout vX.Y.Z`) first — see [Updates](#updates). It runs `npm ci` and a full turbo build on the VM (several minutes).
- `SSH_KEY=~/.ssh/id_ed25519_singlevm` is the working key for `cisco@192.168.11.8`; sudo is passwordless on that VM, so no password prompt.
- `deploy/se-tools.net.env` is gitignored; create it from `careconnect.env.example` on any new laptop.
- Once `cd-pipeline.yml` is ported, drop `--build-from-source` and authenticate `gh` (`gh auth login`): the script will then deploy the CI-built artifact for your `HEAD` commit in seconds, and refuse if CI/CD hasn't finished for that commit.
