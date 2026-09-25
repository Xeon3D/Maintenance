# VillaOps CMMS

Maintenance management SaaS for integrators of high-end villa systems: electrical, automation,
network, security & CCTV, A/V and lighting. See [docs/ROADMAP.md](docs/ROADMAP.md).

## Setup

```bash
npm install            # also generates the Prisma client
npm run db:deploy      # apply migrations
npm run db:seed        # demo org — sign in as owner@demo.test / demo1234
npm run dev            # http://localhost:3000
```

`.env` needs `DATABASE_URL`, `AUTH_SECRET`, `AUTH_TRUST_HOST`, `FIELD_ENCRYPTION_KEY` (32 random bytes, base64) and `UPLOAD_DIR`.

Demo users (password `demo1234`): `owner@`, `manager@`, `tech.network@`, `tech.electrical@`, `viewer@`, `client@` — all `@demo.test`.

## Scripts

| Script | |
|---|---|
| `npm run dev` | Dev server |
| `npm run typecheck` / `lint` / `test` | Checks |
| `npm run db:migrate` | Create a migration after editing `prisma/schema.prisma` |
| `npm run db:studio` | Browse the database |
