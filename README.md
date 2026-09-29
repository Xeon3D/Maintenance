# VillaOps CMMS

Maintenance management SaaS for integrators of high-end villa systems: electrical, automation,
network, security & CCTV, A/V and lighting. See [docs/ROADMAP.md](docs/ROADMAP.md).

## Install with Docker (ZimaOS, any Docker host)

The image is published as [`xeon3d/maintenance`](https://hub.docker.com/r/xeon3d/maintenance) (linux/amd64).
[`docker-compose.yml`](docker-compose.yml) runs it with PostgreSQL and an updater:

1. **ZimaOS:** App Store → *Custom Install* → *Import* and paste `docker-compose.yml`
   (elsewhere: `docker compose up -d` next to the file).
2. Edit the environment before starting:
   - `APP_URL`: the public https address (used in e-mails, QR labels and push links).
   - `SERVER_ADMIN_PASSWORD`: unlocks **Settings → Server** (software name, updates, backups).
   - `FACTORY_RESET_PASSWORD`: set it to enable the **Factory reset** page; leave empty to disable.
     If `SERVER_ADMIN_PASSWORD` is empty, this one also unlocks Settings → Server.
   - `SEED_DEMO`: `"true"` creates the demo company on an empty database; set `"false"` for real use.
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
- **Updates** — shows the installed and latest version (from this repo's GitHub releases). *Update to x.y.z*
  makes a backup, then asks the `updater` service ([Watchtower](https://github.com/nicholas-fedor/watchtower))
  to pull `xeon3d/maintenance:latest` and recreate only the app container; database changes are applied
  as it starts. *Install updates automatically* does the same every day at the backup hour.
  The updater never updates on its own and only touches the labelled app container.
- **Backups** — hourly / daily / monthly schedules, each keeping its last *N*; *Back up now*; download,
  upload (e.g. from another server), restore and delete. A backup is one `.tar.gz` with the database
  (`pg_dump`), every uploaded file and the encryption keys, so it restores on this server or a fresh one.
  Before a restore the current state is backed up automatically (and put back if the restore fails);
  the app restarts afterwards. Backups go to `/backups` — map it to another disk, and download copies
  off the server now and then. Backups made by a newer version can't be restored on an older one.

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

`.env` needs `DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST`, `FIELD_ENCRYPTION_KEY` (32 random bytes, base64), `UPLOAD_DIR` and `CRON_SECRET`. Optional: `APP_URL`, `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`, `RESEND_API_KEY`/`EMAIL_FROM`, `SERVER_ADMIN_PASSWORD`, `FACTORY_RESET_PASSWORD`, `SEED_DEMO`, `APP_NAME` (default software name). Dev keeps server settings in `./.data` and backups in `./backups` (backups need `pg_dump`/`pg_restore`/`psql`/`tar` on PATH, so in practice only in Docker).

## Preventive maintenance scheduler

Time-based schedules generate work orders when they come due (minus their lead days).
Run the scheduler one of two ways:

- **Serverless / managed hosting:** call `GET /api/cron/pm` every 15 minutes with
  `Authorization: Bearer $CRON_SECRET` (e.g. Vercel Cron).
- **Self-hosted / dev:** set `SCHEDULER_INTERVAL_MINUTES=15` and the Next.js server runs it in-process.

Admins can also press "Run scheduler" on the Preventive maintenance page. Meter-based
schedules and meter alerts run immediately when a reading is recorded.

Demo users (password `demo1234`): `owner@`, `manager@`, `tech.network@`, `tech.electrical@`, `viewer@`, `client@` (villa owner portal), `pm@` (property manager portal: two owners' villas) — all `@demo.test`. Roles have demo costs per hour; Daniel is an "Electrical engineer" (custom role).

## Scripts

| Script | |
|---|---|
| `npm run dev` | Dev server |
| `npm run typecheck` / `lint` / `test` | Checks |
| `npm run db:migrate` | Create a migration after editing `prisma/schema.prisma` |
| `npm run db:studio` | Browse the database |
