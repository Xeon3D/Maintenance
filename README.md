# VillaOps CMMS

Maintenance management SaaS for integrators of high-end villa systems: electrical, automation,
network, security & CCTV, A/V and lighting. See [docs/ROADMAP.md](docs/ROADMAP.md).

## Install with Docker (ZimaOS, any Docker host)

The image is published as [`malvesdc/maintenance`](https://hub.docker.com/r/malvesdc/maintenance) (linux/amd64).
Up to 0.3.0 it was `xeon3d/maintenance`: on those servers change the compose `image:` line to
`malvesdc/maintenance:latest` once, then update (see "Updating from 0.3.0" below).
[`docker-compose.yml`](docker-compose.yml) runs it with PostgreSQL and an updater:

1. **ZimaOS:** App Store → *Custom Install* → *Import* and paste `docker-compose.yml`
   (elsewhere: `docker compose up -d` next to the file).
2. Edit the environment before starting:
   - `APP_URL`: the public https address (used in e-mails, QR labels and push links).
   - `SERVER_ADMIN_PASSWORD`: unlocks **Settings → Server** (software name, updates, backups).
   - `FACTORY_RESET_PASSWORD`: set it to enable the **Factory reset** page; leave empty to disable.
     If `SERVER_ADMIN_PASSWORD` is empty, this one also unlocks Settings → Server.
   - `SEED_DEMO`: `"true"` creates the demo company on an empty database; set `"false"` for real use.
   - `ALLOW_SIGNUP`: `"false"` closes public sign-up (*Create account* on the sign-in page), so strangers can't create
     companies on the server; invitations still work. Empty leaves it to **Settings → Server → General** (open by default).
   - `DEMO_MODE`: `"true"` on a public demo shows a banner asking people not to enter real personal data.
   - `BACKUP_PASSWORD`: encrypts new backups (AES-256-GCM). Store it somewhere safe: an encrypted backup can only be
     restored on a server with the same password.
   - Change the PostgreSQL password (in both places) for anything beyond a demo.
   - If port 3000 is taken, change only the left number of `"3000:3000"` (e.g. `"3001:3000"`).
3. **Nginx Proxy Manager:** add a Proxy Host for your domain forwarding (scheme `http`) to the
   server's LAN IP (not `localhost`) and the port above, with *Websockets Support* and *Block Common
   Exploits*; on the SSL tab request a Let's Encrypt certificate with *Force SSL* (the offline app,
   camera scanning and push notifications need https). For uploading large backups, add
   `client_max_body_size 0;` under *Advanced*.

On first start the container applies database migrations and generates `AUTH_SECRET`,
`FIELD_ENCRYPTION_KEY`, `CRON_SECRET` and web-push keys into `/data/secrets.env`
(uploads live in `/data/uploads`).

### Settings → Server

Owners and admins see *Settings → Server*; it asks for the server password (unlocked for 30 minutes),
because it acts on the whole installation rather than one company:

- **Software name** — replaces "VillaOps" on the sign-in page, browser tab, installed app and e-mails.
- **E-mail** — how invitations, password resets, notifications and service reports are sent: an **SMTP account**
  (Microsoft 365, Google Workspace, the domain's mail server…) or **Resend** (API key), with a *Send test e-mail*
  button. Passwords and keys are stored encrypted. Left on *Environment variables*, `RESEND_API_KEY`/`EMAIL_FROM` are used.
- **Updates** — shows the installed and latest version (from the GitHub releases of
  [`malves-dc/Maintenance`](https://github.com/malves-dc/Maintenance/releases); `UPDATE_REPO` overrides it). *Update to x.y.z*
  makes a backup, then asks the `updater` service ([Watchtower](https://github.com/nicholas-fedor/watchtower))
  to pull `malvesdc/maintenance:latest` and recreate only the app container; database changes are applied
  as it starts. *Install updates automatically* does the same every day at the backup hour.
  The updater never updates on its own and only touches the labelled app container.
- **Backups** — hourly / daily / monthly schedules, each keeping its last *N*; *Back up now*; download,
  upload (e.g. from another server), restore and delete. A backup is one `.tar.gz` with the database
  (`pg_dump`), every uploaded file and the encryption keys, so it restores on this server or a fresh one.
  Before a restore the current state is backed up automatically (and put back if the restore fails);
  the app restarts afterwards. Backups go to `/backups` — map it to another disk, and download copies
  off the server now and then. Backups made by a newer version can't be restored on an older one.
  With `BACKUP_PASSWORD` set, new backups are encrypted (a lock icon marks them) and restore/upload decrypt them.
  An older backup restores on a newer version: its database is brought up to date by the migrations at restart.
- **Backup copies** — as each backup is made, e-mail it (up to 5 addresses; choose which kinds, whether only
  encrypted ones are sent, and the largest attachment — bigger ones send a notice instead) and/or copy it to a cloud
  folder: **OneDrive / SharePoint** (work accounts), **Google Drive** (both need an OAuth app registered once; the page
  shows the redirect URI and the steps; for the app's privacy policy and terms of service links use
  `https://<APP_URL>/privacy` and `https://<APP_URL>/terms`) or **WebDAV** (Nextcloud, NAS…). Backups the schedule removes are removed from the
  folder too (optional). *Send test e-mail* and *Test upload* check the settings; the last result is shown.

### Updating from 0.3.0

From 0.3.1 the image is `malvesdc/maintenance` and updates come from the `malves-dc/Maintenance` releases, so a
0.3.0 server is moved over once by hand. In the app's compose (ZimaOS: the app's settings), change
`image: xeon3d/maintenance:latest` to `image: malvesdc/maintenance:latest` and save (or run `docker compose pull`
and `docker compose up -d`). The data stays where it is; from then on, updates come from Settings → Server.

### Updating from 0.1.0

0.1.0 had no updater, so replace its compose once: import the new `docker-compose.yml` (keep your
`APP_URL`, passwords and port), which switches the image to `:latest`, adds the `/backups` volume and the
`updater` service. Your data folders stay the same. From then on, update from Settings → Server.

### Factory reset

With `FACTORY_RESET_PASSWORD` set, a *Factory reset…* link appears under the sign-in form and in
Settings → Server. It erases every company, user and uploaded file on the server and restores
the demo data (5 wrong passwords from one address lock it for 15 minutes). It keeps the server
settings and backups. Never commit that password.

## Development setup

```bash
npm install            # also generates the Prisma client
npm run db:deploy      # apply migrations
npm run db:seed        # demo org — sign in as owner@demo.test / demo1234
npm run dev            # http://localhost:3000
```

`.env` needs `DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST`, `FIELD_ENCRYPTION_KEY` (32 random bytes, base64), `UPLOAD_DIR` and `CRON_SECRET`. Optional: `APP_URL`, `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`, `RESEND_API_KEY`/`EMAIL_FROM`, `SERVER_ADMIN_PASSWORD`, `FACTORY_RESET_PASSWORD`, `SEED_DEMO`, `DEMO_MODE` (public demo banner), `ALLOW_SIGNUP` (`false` closes public sign-up), `BACKUP_PASSWORD` (encrypts backups), `APP_NAME` (default software name). Dev keeps server settings in `./.data` and backups in `./backups` (backups need `pg_dump`/`pg_restore`/`psql`/`tar` on PATH, so in practice only in Docker).

## Audit log

*Settings → Audit log* (Super Admin and Admins by default; the *Audit log* permission in Settings → Roles) shows who
did what, when and from which address: sign-ins (and failed ones), password changes, every creation, change (old →
new value of each field) and deletion of work orders, clients, villas, assets, parts, purchase orders, contracts,
users and roles, permission changes, and every Settings → Server operation (backups, downloads, restores,
updates, e-mail and cloud settings). Secret values are never logged. Filter by category, person, type and dates,
and export to CSV. Entries are kept for the period set in Settings → Organization → Data retention.

## Vans and scanning

- **My van** (Parts → My van): technicians see their van's stock and what is under its minimum, and load parts from
  a warehouse or return them (several at once, by list, "add what's short" or camera), without needing inventory
  management rights. All lines move or none; it is logged.
- **Camera:** part barcodes, asset labels (QR), and on serial-number / MAC fields also the label's printed text
  (*Read text*, OCR, offering the likely values to pick). Works on iPhone too. The OCR engine is served by the app
  itself from `public/ocr` (copied from `node_modules` by `scripts/copy-ocr.mjs` before `dev` / `build`); the first
  use downloads about 15 MB to the device.
- Parts used on a work order can carry the serial numbers of the units installed; they appear on the service report.

## Preventive maintenance scheduler

Time-based schedules generate work orders when they come due (minus their lead days).
Run the scheduler one of two ways:

- **Serverless / managed hosting:** call `GET /api/cron/pm` every 15 minutes with
  `Authorization: Bearer $CRON_SECRET` (e.g. Vercel Cron).
- **Self-hosted / dev:** set `SCHEDULER_INTERVAL_MINUTES=15` and the Next.js server runs it in-process.

Admins can also press "Run scheduler" on the Preventive maintenance page. Meter-based
schedules and meter alerts run immediately when a reading is recorded.

Demo users (password `demo1234`): `owner@`, `manager@`, `tech.network@`, `tech.electrical@`, `viewer@`, `accountant@` (Accountant), `client@` (villa owner portal), `pm@` (property manager portal: two owners' villas) — all `@demo.test`. Roles have demo costs per hour; Daniel is an "Electrical engineer" (custom role).

## Scripts

| Script | |
|---|---|
| `npm run dev` | Dev server |
| `npm run typecheck` / `lint` / `test` | Checks |
| `npm run test:e2e` | Playwright smoke tests (needs `npm run build` and a seeded DB, or `E2E_BASE_URL` pointing at a running server) |
| `npm run db:migrate` | Create a migration after editing `prisma/schema.prisma` |
| `npm run db:studio` | Browse the database |

## Releasing

Releases are built and published by GitHub Actions (`.github/workflows/release.yml`):

1. Bump `version` in `package.json` and `package-lock.json` (`npm version 0.4.0 --no-git-tag-version`), commit, merge to `main`.
2. Tag and push: `git tag v0.4.0 && git push origin v0.4.0`.
3. The workflow runs the checks, pushes `malvesdc/maintenance:0.4.0` and `:latest` to Docker Hub, and then creates
   the GitHub release, which installed servers see as "update available" (Settings → Server).

One-time setup: repository secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` (a Docker Hub access token with
Read & Write), and optionally a `DOCKERHUB_IMAGE` variable to publish under another image name (servers then need
`APP_IMAGE` and the compose `image:` changed to match).
