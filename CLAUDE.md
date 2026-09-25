@AGENTS.md

# VillaOps CMMS — project conventions

Multi-tenant CMMS for villa systems integrators. Roadmap: `docs/ROADMAP.md`.

- **Next.js 16**: `proxy.ts` (not middleware), async `params`/`searchParams`/`cookies()`. Check `node_modules/next/dist/docs/` before using an API.
- **Prisma 7**: client generated to `src/generated/prisma` (import from `@/generated/prisma/client` or `/enums`); config in `prisma.config.ts`; driver adapter `@prisma/adapter-pg`.
- **Tenancy**: in app code always use `ctx.db` from `getContext()` / `requirePermission()` (`src/lib/context.ts`), never the raw `prisma` client, except for auth, sign-up, invitations, public QR pages and jobs. Verify user-supplied foreign keys with `assertOwned()`. New models with `organizationId` must be added to `TENANT_MODELS` (a test enforces this).
- **Permissions**: check `ctx.can(...)` in pages and `requirePermission(...)` in server actions. Matrix in `src/lib/rbac.ts`.
- **i18n**: every UI string goes in both `messages/en.json` and `messages/pt.json` (European Portuguese).
- **Secrets** (villa codes, device credentials): store only through `encryptField()`; audit-log each decrypt.
- Checks: `npm run typecheck`, `npm run lint`, `npm test`.
