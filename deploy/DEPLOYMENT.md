# CareConnect Deployment Guide

This guide covers installing CareConnect locally for development, deploying to an Ubuntu VM (directly or over SSH), and applying updates.

> **Read first — two things this guide assumes that a fresh clone doesn't have:**
>
> 1. **Per-environment config files.** Every deploy command takes `--config deploy/<environment>.env` — a file holding that environment's domain, mode, ports, and SSH target. These files are **gitignored** and are never committed, so this guide uses placeholders (`<environment>`, `<vm-ip>`, `<ssh-user>`, `example.com`) rather than real values. Create yours from [`careconnect.env.example`](careconnect.env.example) before running anything below. Keep real hostnames, addresses and usernames out of docs and commit messages.
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

- SSH access to the VM (`<ssh-user>@<vm-ip>`) with sudo rights there
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
deploy/install.sh --local --config deploy/<environment>.env
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

**Recommended** when your Ubuntu VM already exists.

Run from your **laptop**, not on the VM:

```bash
./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env
```

The SSH target (`VM_USER`, `VM_HOST`, optional `VM_PORT`/`SSH_KEY`) is read from the config file, or from the environment, which takes precedence — there are no built-in defaults, and the script refuses to run without them.

### What happens

1. **SSH test** to `<ssh-user>@<vm-ip>`
2. **Checks** whether CareConnect is already installed on the VM
3. **`--build-from-source` passed, or not yet installed** (fresh VM): transfers the project over a tar/ssh pipe and runs the full `deploy/install.sh --config deploy/<environment>.env` on the VM (builds types + design system + apps from source; several minutes).
   **Already installed and no flag:** downloads the latest [CD Pipeline](#artifact-based-deploys-ci) artifact via `deploy/fetch-ci-artifact.sh`, copies it over, and runs `deploy-artifact.sh` on the VM — the same deploy CI would perform, so it can't drift from what CI validated. Requires the `gh` CLI, authenticated (`gh auth login`). **This branch fails today** because `cd-pipeline.yml` has not been ported, which is why every example in this guide passes `--build-from-source`.
4. Prints summary URLs on your laptop

### SSH target variables

Set these in `deploy/<environment>.env` (see the `VM_*` block in `careconnect.env.example`) or export them; exported values win.

| Variable | Default | Description |
|---|---|---|
| `VM_USER` | (required) | SSH username |
| `VM_HOST` | (required) | VM IP or hostname |
| `VM_PORT` | `22` | SSH port |
| `SSH_KEY` | (none) | Path to private key |

Examples:

```bash
# Everything (SSH target + deploy layout) from the config file
./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env

# Override the SSH target / key from the environment
VM_USER=<ssh-user> VM_HOST=<vm-ip> SSH_KEY=~/.ssh/id_ed25519 \
  ./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env

# Lab VM, path mode on its IP, no config file
VM_USER=<ssh-user> VM_HOST=<vm-ip> \
  ./deploy/remote-install.sh --build-from-source --mode path --domain <vm-ip>
```

### SSH key setup (one time)

```bash
VM_USER=<ssh-user> VM_HOST=<vm-ip> ./deploy/setup-ssh-key.sh
# or: ssh-copy-id -i ~/.ssh/id_ed25519.pub <ssh-user>@<vm-ip>
```

---

## On-VM Installation

If you are already logged into the Ubuntu VM:

```bash
git clone https://github.com/mkowalew-chromatic/careconnect.git
cd careconnect
sudo deploy/install.sh --config deploy/<environment>.env
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

With `DOMAIN=example.com`, `PORTAL_HOST=portal`, `EHR_HOST=ehr`:

| App | URL (port from `PORTAL_PORT` / `EHR_PORT`; shown with 80) |
|---|---|
| Portal | http://portal.example.com |
| EHR | http://ehr.example.com |

**DNS:** A records for each subdomain → VM IP, **or** a tunnel/reverse proxy in front of the VM (see below).

**Local testing without DNS** — add to `/etc/hosts`:

```
<vm-ip>  portal.example.com ehr.example.com
```

### Behind a tunnel or reverse proxy (Cloudflare Tunnel example)

Subdomain mode also works with TLS terminated in front of the VM — for example a Cloudflare Tunnel, or any reverse proxy that forwards to nginx on the VM. In that layout nginx listens on plain HTTP on a non-privileged port (say `8080`, via `PORTAL_PORT`/`EHR_PORT`) and `ENABLE_SSL=false` is correct: the proxy owns the certificate.

```
Browser ──HTTPS──► proxy / tunnel ──HTTP──► nginx :8080 ──► /api/ ──► Node API :5000
```

**Ingress rule:** send every CareConnect hostname to the **same** local nginx port. nginx routes by `Host` (`ehr.<domain>`, `portal.<domain>`).

Example `/etc/cloudflared/config.yml`:

```yaml
tunnel: <your-tunnel-id>
credentials-file: /etc/cloudflared/<your-tunnel-id>.json

ingress:
  - hostname: portal.example.com
    service: http://127.0.0.1:8080
  - hostname: ehr.example.com
    service: http://127.0.0.1:8080
  - service: http_status:404
```

**Do not:**

- Route `/api/*` (or a whole hostname) to some other backend on the VM — the UI will load but staff login will 401.
- Point the proxy straight at the API on `127.0.0.1:5000` — go through nginx so the `Host` header, static files and `/api/` prefix are handled.

**Cloudflare dashboard** (if using a Cloudflare Tunnel):

- DNS: each subdomain → CNAME to `<tunnel-id>.cfargotunnel.com` (proxied).
- SSL/TLS mode: **Full** or **Full (strict)** is fine with cloudflared.
- Optional: Cache rule — bypass cache for `/api/*`.

**Verify from the VM** (same path the proxy uses):

```bash
curl -s http://127.0.0.1:8080/api/health -H 'Host: ehr.example.com'
curl -s -X POST http://127.0.0.1:8080/api/auth/login -H 'Host: ehr.example.com' \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@se-tools.net","password":"<seeded demo password>"}'
```

**Public URLs** — `https://portal.<domain>` and `https://ehr.<domain>`, with no port in the browser once the proxy and DNS are correct.

After changing tunnel ingress: `sudo systemctl restart cloudflared` (or your proxy's unit name).


### Path mode (`DEPLOY_MODE=path`)

Single domain/IP, path-based routing:

| App | URL |
|---|---|
| Portal | http://\<vm-ip\>/ |
| EHR | http://\<vm-ip\>/ehr/ |

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

Copied from your `--config` file (`deploy/<environment>.env`) on install.

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
| `VM_USER`, `VM_HOST`, `VM_PORT`, `SSH_KEY` | SSH target for `remote-install.sh` / `setup-ssh-key.sh` (laptop side only; ignored on the VM) |

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
./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env
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
| `deploy/package-artifact.sh [output-dir] <config-file>` | Build machine / CI | Build once, package into a versioned tarball |
| `deploy/deploy-artifact.sh <artifact-tarball> [config-file]` | Ubuntu VM (as root) | Deploy a built artifact: backup DB, sync code, migrate, publish, restart, health-check |
| `deploy/rollback.sh <previous-artifact-tarball> <db-backup-path> [config-file]` | Ubuntu VM (as root) | Restore a previous artifact + database backup |

### `package-artifact.sh`

```bash
deploy/package-artifact.sh [output-dir] <config-file>
```

Builds the monorepo once (via `build-production.sh`, which builds the design system into the app bundles) and packages the result into a versioned tarball named `careconnect-<version>-<git-sha>.tar.gz`. The tarball's path is printed as the script's last line of output, so callers can capture it directly (e.g. `ARTIFACT="$(deploy/package-artifact.sh)"`).

The config file is required. **Build behavior depends on `DEPLOY_MODE`** — specifically `VITE_EHR_BASE` and `VITE_PORTAL_BASE` are baked into the JS bundles at build time — so the config passed here must match the target environment (one artifact per environment whose layout differs, e.g. a separate `deploy/<staging>.env`). The resulting `MANIFEST.json` inside the artifact records `deployMode`, which `deploy-artifact.sh`/`rollback.sh` verify against the target's own config before deploying.

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
sudo deploy/install.sh --config deploy/<environment>.env --ssl --email <you@example.com>
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
./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env
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

CareConnect expects **`POST /api/auth/login`** on the **Node.js** API (`service: careconnect-api`). If the API logs show no login attempt, or a different service answers on port 5000, traffic is reaching **something other than `careconnect-api`** — typically another service that was already bound to port 5000, or a proxy/tunnel ingress that routes `/api/*` (or the whole host) somewhere other than nginx.

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

From outside (via nginx / your proxy):

```bash
curl -s http://ehr.example.com/api/health
curl -s -X POST http://ehr.example.com/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@se-tools.net","password":"<seeded demo password>"}'
```

- Default staff password: seeded demo password (ask a teammate)
- Re-deploy UI after fixes: `./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env`
- If JWT secret changed, log in again (old tokens invalid)

### Subdomain URLs don't resolve

- Confirm DNS A records or `/etc/hosts` entries
- Confirm nginx `server_name` matches your hostname
- Check the port (`PORTAL_PORT`/`EHR_PORT` in your config vs the default 80)

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
| Deploy to VM from laptop | `./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env` |
| Install on VM | `sudo deploy/install.sh --config deploy/<environment>.env` |
| Update on VM | `sudo /opt/careconnect/deploy/update.sh` |
| Deploy release tag | `git checkout vX.Y.Z && sudo deploy/update.sh` |
| Release process | [docs/RELEASE.md](../docs/RELEASE.md) |
| Uninstall on VM | `sudo /opt/careconnect/deploy/uninstall.sh` |
| API logs | `journalctl -u careconnect-api -f` |
| Staff login | `admin@se-tools.net` / seeded demo password (ask a teammate) |

---

## Deploy Hints

**Deploy the latest `main` to an environment, from your laptop:**

```bash
git checkout main && git pull
./deploy/remote-install.sh --build-from-source --config deploy/<environment>.env
```

- Run from the repo root. `--build-from-source` ships whatever is in your working tree, so pull `main` (or check out the tag you want, `git checkout vX.Y.Z`) first — see [Updates](#updates). It runs `npm ci` and a full turbo build on the VM (several minutes).
- The SSH user, host and key come from the `VM_*` entries in your config file (or the environment). If sudo on the VM needs a password you will be prompted once.
- `deploy/<environment>.env` is gitignored; create it from `careconnect.env.example` on any new laptop, and never paste its contents into docs, issues, or commit messages.
- Once `cd-pipeline.yml` is ported, drop `--build-from-source` and authenticate `gh` (`gh auth login`): the script will then deploy the CI-built artifact for your `HEAD` commit in seconds, and refuse if CI/CD hasn't finished for that commit.
