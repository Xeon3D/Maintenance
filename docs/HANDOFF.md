# Handoff — VillaOps CMMS

State as of **2026-09-28**, commit `82554bc` (phase 5 of 10 done). Read this, then
`CLAUDE.md` (conventions) and `docs/ROADMAP.md` (phase list), before touching code.

---

## 1. What this is

A multi-tenant SaaS CMMS with **full MaintainX feature parity** for a company that maintains
high-end residential villas: electrical, automation (KNX etc.), network, security, CCTV, A/V
and lighting. The user chose, and does not want re-litigated:

- **Stack:** Next.js 16 + Postgres (Neon) + Prisma 7 + Auth.js v5. **Not** Supabase.
- **Languages:** English + **European** Portuguese (pt-PT wording: "palavra-passe", "equipa", "utilizador").
- **Scope:** everything, delivered in the 10 roadmap phases; each phase ends tested and committed.
- **"VillaOps" is a placeholder product name**; the user has been asked for the real one.

### Working rhythm the user has accepted
1. Build a whole phase, including translations, tests and browser verification.
2. Run `typecheck`, `lint` and `test`, then verify in the preview browser (details in §6).
3. Commit at the end of the phase (the message style is in `git log`), ending with the
   `Co-Authored-By: Claude …` trailer. The repo-local git identity is `xeon4 <xeon4d@gmail.com>`.
4. Send a short summary covering: what's new, what was tested, what was fixed along the way,
   and things to know. Then ask whether to continue with the next phase.

---

## 2. Status

| # | Phase | State |
|---|---|---|
| 1 | Foundation: auth, orgs, invitations, RBAC, i18n, shell, tenant guard | ✅ `dad89a9` |
| 2 | Clients, villas, areas, assets, secrets, QR labels, CSV import | ✅ `d237866` |
| 3 | Work orders: checklists, photos, time, costs, sign-off, PDF, board/calendar | ✅ `85b3383` |
| 4 | Preventive maintenance, procedures library, meters, scheduler | ✅ `944bb4c` |
| 5 | Requests (portal + anonymous QR) and client portal | ✅ `82554bc` |
| 6 | **Inventory & purchasing** | ⏭ next (the user was asked 6 vs 7 and hasn't answered yet) |
| 7 | Messaging & notifications (email + web push) | |
| 8 | Reporting & dashboards | |
| 9 | Offline mobile PWA | |
| 10 | SaaS layer: Stripe billing, limits, super-admin | |

The working tree is clean apart from this file and the `CLAUDE.md` pointer. The **full data
model for all 10 phases already exists** in `prisma/schema.prisma` (see §5), so later phases
are mostly UI and logic plus small additive migrations.

---

## 3. Environment (Windows 11)

- **Node 24** was installed after the Claude app started, so the app's inherited PATH lacks it.
  - PowerShell: prefix commands with
    `$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User");`
  - Bash tool: `export PATH="/c/Program Files/nodejs:$PATH"`.
- **Dev server:** preview config `web` in `.claude/launch.json`, which runs
  `node.exe node_modules/next/dist/bin/next dev` on port 3000. Restart it after
  `prisma generate`: the Prisma client is cached on `globalThis`.
- **Database:** Neon Postgres (eu-west-2). The connection string lives **only** in the gitignored
  `.env`. Never print or commit it. The user was advised to rotate the password, because it was
  pasted in chat. If it changes, only `DATABASE_URL` in `.env` needs updating.
- **`.env` keys:**
  - `DATABASE_URL`: uses `sslmode=verify-full`.
  - `AUTH_SECRET`, `AUTH_TRUST_HOST`.
  - `FIELD_ENCRYPTION_KEY`: 32 bytes, base64. **Never rotate** without re-encrypting
    `Villa.secretsEnc` and `Asset.credentialsEnc`.
  - `UPLOAD_DIR` (`./uploads`).
  - `CRON_SECRET`.
  - `SCHEDULER_INTERVAL_MINUTES` (`15`).
  - Optional `APP_URL`, used for QR label links.
- **Prisma:** `prisma@latest` resolves to an 8.0 RC. **Keep `prisma` and `@prisma/client` pinned to 7.x.**
- `prisma init` added agent-skill folders (`.agents/`, `.claude/skills/prisma-*`, `.windsurf/`,
  `skills-lock.json`). These are harmless reference docs and are committed.

### Tooling gotchas that already cost time
- **Don't patch TS/TSX through PowerShell double-quoted strings.** The backtick is PowerShell's
  escape character and silently eats JS template literals. Use the Edit/Write tools, or a
  single-quoted here-string (`@' … '@`).
- `Select-String -Path` treats `[id]` in route folders as a wildcard, so verify edits with
  `-LiteralPath` or Grep. False "0 matches" results have happened.
- Run `npx next typegen` after adding routes, so `PageProps<"/route">` / `RouteContext<…>` types exist.
- Next 16 differences:
  - `proxy.ts` replaces `middleware`.
  - `params`, `searchParams` and `cookies()` are async.
  - Page files may only export the component and metadata; put helpers elsewhere (e.g. `assets/filter.ts`).
  - Read `node_modules/next/dist/docs/` before using an unfamiliar API.

---

## 4. Architecture and conventions (must follow)

### Tenancy and permissions
- **Always use `ctx.db`**, from `getContext()` / `requirePermission()` (`src/lib/context.ts`) or
  `getPortalContext()` (`src/lib/portal.ts`).
  - It is `tenantDb(orgId)` (`src/lib/db/tenant.ts`): a Prisma extension that injects
    `organizationId` into every where/create on tenant models.
  - The raw `prisma` client is only for auth, sign-up, invitations, public QR pages and the scheduler.
- **Foreign keys from user input must be checked** with `assertOwned(ctx.db, model, ids)`, or with a
  scoped `findFirst` (e.g. an area must belong to the same villa). The guard only filters the
  row being written, not the rows it points to.
- **Use unchecked FKs on tenant models** (`villaId: x`, not `villa: { connect }`), and always set
  `organizationId` explicitly in `create` data. The extension also sets it, but TypeScript needs it.
- **Child models without `organizationId`** (checklist items, time entries, PO lines…) are only
  reached through a parent loaded via `ctx.db`.
- **A model that gains `organizationId` must be added to `TENANT_MODELS`.** `tests/tenant-models.test.ts`
  enforces this.
- **RBAC:** matrix in `src/lib/rbac.ts`. Use `ctx.can("x")` in pages (`notFound()` when denied) and
  `requirePermission("x")` in server actions. Roles: OWNER, ADMIN, MANAGER, TECHNICIAN, REQUESTER
  (the client portal) and VIEWER. Permissions for inventory, purchasing, vendors and reports
  already exist in the matrix.
- **REQUESTER users are redirected to `/portal`** by `(app)/layout.tsx`. Portal scope:
  - Villas where `clientId = membership.clientId`.
  - Requests on those villas.
  - Work orders with `clientVisible: true` on those villas.
  - `/api/files/[id]` and the WO report route contain explicit portal checks.

### Forms and server actions
- **Server actions** live in `actions.ts` next to their pages, with the signature
  `(boundArgs…, prev: FormResult, form: FormData) => Promise<FormResult>`.
  - Validate with `parseForm(schema, form)` (`src/lib/forms.ts`), then check
    `if (parsed.error) return parsed.error` and read `parsed.data`. Destructuring `{data, error}`
    breaks type narrowing.
  - Zod helpers: `str`, `optStr`, `optId`, `optDate`, `optNumber`, `enumOf`, `optEnumOf`.
- **Field errors are Zod issue codes**, translated via `validation.<code>` in the messages. Custom
  refinements put the message *key* in `message`, e.g. `invalid_ip`, `contactRequired`.
- **Forms:**
  - Use `<ActionForm action={x.bind(null, id)}>` (`src/components/action-form.tsx`) with `<FieldError name>`.
  - Custom forms use `useActionForm()` (`src/lib/use-action-form.ts`) plus `<FieldErrorsProvider>`.
  - **Never use `<form action={…}>` with `useActionState` directly.** React 19 resets
    uncontrolled inputs after the action, so users lose their input on validation errors.
- **Error codes returned from actions are message keys**, e.g. `"wo.requiredItems"` or
  `"requests.notPending"`. `ActionForm` resolves `common.<code>`, then `<code>`.
- **Dates:**
  - Datetime inputs use `<DateTimeField name>`, which submits ISO in the browser's time zone.
  - Rendering uses next-intl with the org time zone (`src/i18n/request.ts` looks it up per request).
  - Recurrence maths is time-zone aware (`src/lib/pm-schedule.ts`).

### Internationalisation
- Every UI string goes in **both** `messages/en.json` and `messages/pt.json`.
  `tests/messages.test.ts` enforces key parity.
- Workflow: write a fragment JSON in the scratchpad, then run
  `node scripts/merge-messages.mjs en <file>` (and the same for `pt`).
- ICU plurals are used, e.g. `pm.every.MONTHLY` has `=3 {Quarterly}`. Don't create a key that is
  also a namespace: `pm.every` vs `pm.every.DAILY` broke once.
- Known gap: `metadata.title` strings are English-only.

### Files and secrets
- **Storage:** `src/lib/storage.ts` (`putObject/getObject/deleteObject`). Refs look like
  `local:<org>/<yyyy-mm>/<hex>.<ext>` and are served by `/api/files/[id]`: auth-checked, `ETag`,
  `Cache-Control: private, no-cache`.
  - Upload endpoint `/api/uploads`: targets `workOrderId | workOrderItemId | assetId | villaId`.
  - The client downsizes photos first (`src/lib/upload-client.ts` → `shrinkImage`).
  - Portal and QR forms send photos inside the server-action FormData instead
    (`createRequest` in `src/lib/requests.ts`).
- **Secrets:** `encryptField/decryptField` (AES-256-GCM, `src/lib/crypto.ts`). Reveal and save only
  through `src/app/(app)/secret-actions.ts`, which audit-log via `src/lib/audit.ts`.

### Domain logic (reuse rather than duplicate)
- **`src/lib/work-orders.ts`:**
  - `createWorkOrder` (validates refs, numbers via `nextNumber`, copies procedure items, links
    meter steps).
  - `changeStatus` (Done blocked by required items, stops timers, stamps `firstResponseAt`).
  - `workOrderCosts`: labour + other costs. **Parts costs must be added in phase 6.**
  - `WoCtx` is the minimal context, so the scheduler can act without a request.
- **`src/lib/pm.ts` + `src/lib/pm-schedule.ts`:** the scheduler.
  - `runDueSchedules` claims each occurrence atomically; missed occurrences collapse into one WO.
  - `onMeterReading` handles meter-based schedules.
  - Triggers: `/api/cron/pm` (Bearer `CRON_SECRET`, public in `proxy.ts`), the
    `src/instrumentation.ts` interval, and the "Run scheduler" button.
- **`src/lib/meters.ts`:** `recordReading` stores the reading, runs meter PMs, and opens an alert
  WO (one open at a time, via `WorkOrder.alertMeterId`).
- **`src/lib/requests.ts`:** `createRequest`, `approveRequest` (creates the WO and moves photos
  onto it) and `declineRequest`.
- **Per-org counters** via `nextNumber(orgId, key)`. Keys in use: `workOrder`, `request`.
  Use `purchaseOrder` next.

### UI kit
- `src/components/ui.tsx` (Button, Input, Select, Textarea, Field, Card, PageHeader, Badge, Table, FormError).
- `badges.tsx` (system, asset status, WO status, priority), `list-controls.tsx` (FilterBar +
  Pagination, URL-driven), `empty-state`, `back-link`, `archive-button`, `recent-work-orders`,
  `sparkline`, `signature-pad`, `photo-picker`, `secret-field`.
- **Navigation:** `src/components/shell/nav.ts`. Items have `ready: false` until built. **Flip
  Parts, Purchase orders, Vendors, Messages and Reports to `ready: true` when their phase ships.**
  Badges are computed in `(app)/layout.tsx`.
- Tailwind v4 tokens (`brand`, `muted`, `border`, `surface`, `danger`) in `src/app/globals.css`.
  Light theme only for now.

---

## 5. Data model notes

All models are in `prisma/schema.prisma`, with 2 migrations (`init`, `pm_meters`). Add changes
with `npx prisma migrate dev --name <x>`, then `npx prisma generate`, then restart the dev server.

**Built out:** Organization, User, Membership, Invitation, Counter, Team, Client, ClientContact,
Villa, Area, Asset, AssetStatusLog, Procedure(+Item), WorkOrder(+Assignee/Item/Comment/StatusLog/
Cost), TimeEntry, Attachment, AuditLog, PMSchedule(+Assignee), Meter, MeterReading, Request.

**Exist but have no UI yet (the remaining phases):**
- **Phase 6:** `Part`, `StockLocation` (WAREHOUSE / VAN with `userId` / SITE), `PartStock`,
  `StockMovement`, `WorkOrderPart`, `Vendor`, `VendorContact`, `PurchaseOrder`, `PurchaseOrderLine`,
  and `Asset.parts` (compatible parts, M2M).
  - Each org already has a "Main warehouse" (`createOrganization`); the seed also adds two vans.
- **Phase 7:** `Conversation` (DIRECT/GROUP/TEAM/WORK_ORDER), `ConversationMember`, `Message`, `Notification`.
- **Phase 10:** `Subscription` (a trial is created at sign-up).
- **Not on any phase yet** (mention to the user): `ServiceContract` (SLA response/resolution
  hours, included visits; `WorkOrder.contractId`, `firstResponseAt` is already stamped),
  `Category` (WO categories), and `VerificationToken` (for password reset / email verification).

---

## 6. How to verify (proven techniques)

- **Checks:** `npm run typecheck`, `npm run lint` (`npx eslint src tests`), `npm test` (vitest, 15 tests).
- **Browser pane:**
  - Screenshots often time out because the app window may be behind another. Prefer
    `get_page_text`, `find` and `javascript_tool`.
  - Fill React inputs through the native value setter, then dispatch `input`/`change`, then
    `form.requestSubmit()`.
  - Fire `blur` handlers with `dispatchEvent(new FocusEvent('focusout', {bubbles:true}))`.
  - Test file inputs with `DataTransfer` + a canvas-generated JPEG.
  - **Don't `navigate` to a PDF URL.** It pops a save dialog on the user's screen; fetch it instead.
- **Acting as any user without the UI:** write a throwaway `scripts/_x.mts` (`.mts` because
  top-level await is needed) that runs `encode({ token: { sub: userId, email }, secret: AUTH_SECRET, salt: "authjs.session-token" })`
  from `next-auth/jwt`, then `fetch` pages with `cookie: authjs.session-token=<token>`. Run it
  with `npx tsx`, then delete the script.
  - Note: `NextIntlClientProvider` embeds *all* message strings in the HTML, so assert on
    markup or URLs, not on translated text.
- **Demo logins** (password `demo1234`, all `@demo.test`):
  - `owner` Sofia (OWNER), `manager` Miguel (MANAGER), `tech.network` Rui (TECHNICIAN, €45/h),
    `tech.electrical` Daniel (TECHNICIAN), `viewer` Ana (VIEWER).
  - `client` James Whitmore (REQUESTER → client "Whitmore Family Office").
  - The preview pane is currently signed in as the **manager**.
- **Demo data now includes test records** from phases 2–5. The user knows; keep or clean up on request:
  - Villa "Villa Quinta do Lago 7" (code `VQL-07`), which has a test access code.
  - 9 assets, including "Cinema access point", "Pool house rack", "Pool house AP" and "Cinema projector".
  - WOs #1–#6. #2 is a meter alert, now internal. #5 is a deliberate overdue catch-up.
  - 2 PM schedules, a UPS battery meter with readings, and 7 starter procedures.
  - Requests R1 (approved → WO #6) and R2 (declined).

---

## 7. Open items and known gaps (tell the user where relevant)

**Blocking before any real deployment**
1. **Uploads are on local disk.** Swap `src/lib/storage.ts` to S3/R2 (the interface is ready).
   Serverless hosts don't persist files.
2. **Scheduler on the host:** configure a 15-minute cron calling `/api/cron/pm`.
   `SCHEDULER_INTERVAL_MINUTES` is only for self-hosting.
3. **No email delivery at all.** Invitations display a copyable link. Phase 7 should add a
   provider (e.g. Resend/Postmark) and use it for invitations too.
4. **No password reset / change-password / profile page** (the `VerificationToken` model exists).
   Worth adding in phase 7 alongside email.
5. **The user should rotate the Neon password.** `.env` then needs the new URL.

**Smaller**
- Browser `<title>`s are English-only (`export const metadata` in pages; switch to `generateMetadata` with translations).
- `NextIntlClientProvider` ships every message to the client (fine now; scope it later for performance).
- CSV asset import inserts one row at a time (slow near the 2,000-row limit).
- Staff can't create a request manually (they create WOs directly). Probably fine.
- The public QR form has no CAPTCHA; it relies on a honeypot plus DB-count rate limits.
- `AuditLog` only covers secrets so far; phase 8/10 may want broader auditing and a viewer UI.
- No Playwright e2e yet (listed in the roadmap stack).
- `next-auth` is a v5 beta.

---

## 8. Plan for the next phases

### Phase 6 — Inventory & purchasing
- **Parts** (`/parts`): list, detail and form; SKU/barcode, system, unit cost, min qty,
  preferred vendor; photo via `/api/uploads` (add a `partId` target); compatible assets (M2M).
- **Stock locations** (settings, or a tab on parts): warehouse, vans (linked to a technician), site stock.
  - Per-location `PartStock` with `minQuantity` overrides.
  - Adjustments, and transfers written as two `StockMovement` rows (TRANSFER_OUT/IN) in one transaction.
- **Parts on work orders:** a "Parts" panel on `/work-orders/[id]`.
  - Pick a part plus the location (default: the technician's van).
  - Write `WorkOrderPart` and a CONSUMPTION movement, and decrement `PartStock`. Returning a part
    reverses this.
  - Add parts cost into `workOrderCosts`, and parts into the PDF report (client-facing: no costs).
- **Low-stock:** `quantity <= min` badges, a filter, and a dashboard card. Notifications come in phase 7.
- **Vendors** (`/vendors`): CRUD, contacts, systems; link from assets (`Asset.vendorId`
  already exists) and parts.
- **Purchase orders** (`/purchase-orders`): numbering via `nextNumber(org, "purchaseOrder")`.
  - Status flow: DRAFT → PENDING_APPROVAL → APPROVED (`purchasing.approve`) → ORDERED →
    PARTIALLY_RECEIVED/RECEIVED.
  - Lines can be parts or free text.
  - Receiving updates `receivedQuantity` and writes RECEIPT movements into `shipToLocation`.
  - "Create PO from low stock" should pre-fill lines. A PDF PO for vendors can reuse react-pdf.
- **Barcode scanning:** optional; can be a PWA feature in phase 9.
- Add translations, `TENANT_MODELS` is already correct, flip the nav items, test the stock
  arithmetic with unit tests.

### Phase 7 — Messaging & notifications
- `src/lib/notify.ts`: `notify(ctx, userIds, type, {title, body, link})` → a `Notification`
  row, plus email/web push according to user preferences (a new model or JSON field is needed).
- **Hook points:**
  - WO assigned: `createWorkOrder`, the assignee change in `saveWorkOrderAction`, `approveRequest`.
  - WO status: tell the creator and assignees; tell the portal client when Done.
  - Requests: new request (`createRequest` → managers); approved/declined → the requester, by
    portal user or by email for QR requests.
  - Scheduler and meters: PM generated, meter alert (`recordReading`).
  - Low stock; PO awaiting approval.
  - @mentions in WO comments.
- **UI:** a notification bell with an unread count in the sidebar header, `/notifications`, and
  mark-read.
- **Messages:** per-WO thread (`Conversation.workOrderId`, can replace or augment WO comments),
  team channels (`Conversation.teamId`) and DMs; poll or use SSE for live updates.
- **Email:** also use for invitations and password reset (§7.3–4).

### Phase 8 — Reporting
MTTR, first-response and SLA compliance (needs a ServiceContract UI; ask the user), PM compliance
(already on `/preventive`, generalise it), cost per villa/system/client (labour + parts + other),
technician utilisation (TimeEntry), asset downtime (AssetStatusLog), CSV export everywhere. Read
the `dataviz` skill before building charts.

### Phase 9 — Offline PWA
Manifest, service worker, IndexedDB queue for checklist answers, time, photos and comments on
assigned WOs; background sync; camera capture; QR/barcode scanning.

### Phase 10 — SaaS layer
Stripe checkout and portal (`Subscription`), plan limits (seats, villas, storage), trial expiry
handling, a super-admin console (`User.isSuperAdmin`), org deletion/export.
