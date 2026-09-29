# VillaOps CMMS

Maintenance management SaaS for integrators of high-end villa systems: electrical, automation,
network, security & CCTV, A/V and lighting. See [docs/ROADMAP.md](docs/ROADMAP.md).

## Install with Docker (ZimaOS, any Docker host)

The image is published as [`xeon3d/maintenance`](https://hub.docker.com/r/xeon3d/maintenance) (linux/amd64).
[`docker-compose.yml`](docker-compose.yml) runs it with PostgreSQL:

1. **ZimaOS:** App Store → *Custom Install* → *Import* and paste `docker-compose.yml`
   (elsewhere: `docker compose up -d` next to the file).
2. Edit the environment before starting:
   - `APP_URL`: the public https address (used in e-mails, QR labels and push links).
   - `FACTORY_RESET_PASSWORD`: set it to enable the **Factory reset** page; leave empty to disable.
   - `SEED_DEMO`: `"true"` creates the demo company on an empty database; set `"false"` for real use.
   - Change the PostgreSQL password (in both places) for anything beyond a demo.
3. **Nginx Proxy Manager:** add a Proxy Host for your domain forwarding to the server's IP, port `3000`,
   with *Websockets Support* and *Block Common Exploits*; on the SSL tab request a Let's Encrypt
   certificate with *Force SSL* (the offline app, camera scanning and push notifications need https).

On first start the container applies database migrations and generates `AUTH_SECRET`,
`FIELD_ENCRYPTION_KEY`, `CRON_SECRET` and web-push keys into `/data/secrets.env`
(uploads live in `/data/uploads`). **Back up `/data` together with the database**: encrypted
villa codes can't be read without that key. Upgrade by changing the image tag and recreating the container.

### Factory reset

With `FACTORY_RESET_PASSWORD` set, a *Factory reset…* link appears under the sign-in form and in
Settings → Organization. It erases every company, user and uploaded file on the server and restores
the demo data (5 wrong passwords from one address lock it for 15 minutes). Never commit that password.

## Development setup

```bash
npm install            # also generates the Prisma client
npm run db:deploy      # apply migrations
npm run db:seed        # demo org — sign in as owner@demo.test / demo1234
npm run dev            # http://localhost:3000
```

`.env` needs `DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST`, `FIELD_ENCRYPTION_KEY` (32 random bytes, base64), `UPLOAD_DIR` and `CRON_SECRET`. Optional: `APP_URL`, `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`, `RESEND_API_KEY`/`EMAIL_FROM`, `FACTORY_RESET_PASSWORD`, `SEED_DEMO`.

## Preventive maintenance scheduler

Time-based schedules generate work orders when they come due (minus their lead days).
Run the scheduler one of two ways:

- **Serverless / managed hosting:** call `GET /api/cron/pm` every 15 minutes with
  `Authorization: Bearer $CRON_SECRET` (e.g. Vercel Cron).
- **Self-hosted / dev:** set `SCHEDULER_INTERVAL_MINUTES=15` and the Next.js server runs it in-process.

Admins can also press "Run scheduler" on the Preventive maintenance page. Meter-based
schedules and meter alerts run immediately when a reading is recorded.

Demo users (password `demo1234`): `owner@`, `manager@`, `tech.network@`, `tech.electrical@`, `viewer@`, `client@` — all `@demo.test`.

## Scripts

| Script | |
|---|---|
| `npm run dev` | Dev server |
| `npm run typecheck` / `lint` / `test` | Checks |
| `npm run db:migrate` | Create a migration after editing `prisma/schema.prisma` |
| `npm run db:studio` | Browse the database |
