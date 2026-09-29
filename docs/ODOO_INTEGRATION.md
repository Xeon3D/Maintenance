# Integrating VillaOps with Odoo — feasibility report

Prepared 2026-09-29. Scope: VillaOps as built through phase 9 (see `docs/HANDOFF.md`). Odoo facts are
from Odoo's documentation and other public sources, listed at the end. Anything marked **(verify)**
should be confirmed against your Odoo version, plan and contract before you rely on it.

---

## 1. Summary

**Integration is feasible and worthwhile. Do it in small steps, and start with invoicing.**

- **Each system keeps what it's good at.** VillaOps stays the operational system: villas, equipment,
  work orders, preventive maintenance, checklists, SLAs, the field app and the client portal. Odoo
  stays the business system: customers' fiscal data, quotes, **invoicing**, accounting, and optionally
  purchasing and stock valuation.
- **The most valuable first link is completed work → draft invoice in Odoo.** In Portugal, invoices
  must come from AT-certified software. Odoo's Portuguese localisation provides the certified
  signature, ATCUD and SAF-T, so VillaOps should **never** issue fiscal documents itself. It should
  hand Odoo everything needed to bill a job: client, hours, parts and extras.
- **The deciding factor is your Odoo hosting plan.** Odoo Online only allows API access on the
  **Custom** plan. Standard and One App Free block it completely. Odoo.sh and self-hosted
  installations allow it.
- **Build against Odoo's current API (JSON-2, Odoo 19+).** The older XML-RPC/JSON-RPC API is being
  removed: in Odoo Online 21.1 (winter 2027) and Odoo 22 (fall 2028). If you're on Odoo ≤ 18 today,
  plan to switch before then.
- **Rough effort** (details in §8):
  - Phase A, customers + invoicing: about 2 weeks.
  - Phase B, parts, vendors and purchasing in Odoo: another 2–3 weeks.
  - Phase C, contract fees and timesheets: 1–2 weeks.

---

## 2. Who owns what (recommended split)

Two systems editing the same record is how integrations go wrong. Every entity needs **one owner**;
the other system gets a read-only copy.

| Entity | VillaOps today | Odoo equivalent | Recommended owner | Direction |
|---|---|---|---|---|
| Clients (billing entity, VAT no., address) | `Client` | `res.partner` (company) | **Odoo** | Odoo → VillaOps |
| Client contacts | `ClientContact` | `res.partner` (child contacts) | Odoo | Odoo → VillaOps |
| Villas, areas, equipment | `Villa`, `Area`, `Asset` | No real equivalent (see §7) | **VillaOps** | Villa can be pushed as a delivery address / analytic account |
| Work orders, checklists, photos, sign-off | `WorkOrder` + children | (Field Service tasks, if licensed) | **VillaOps** | Summary pushed on completion |
| Billable result of a job | cost breakdown in `workOrderCosts()` | `account.move` (draft customer invoice) or `sale.order` | **Odoo** | VillaOps → Odoo |
| Labour time | `TimeEntry` | `account.analytic.line` (timesheets) | VillaOps records it | VillaOps → Odoo (optional, phase C) |
| Service contracts: SLA terms | `ServiceContract` | — | VillaOps | — |
| Service contracts: monthly fee billing | `ServiceContract.monthlyFee` | Subscriptions (Enterprise) / recurring invoices | **Odoo** | Link only (store the Odoo subscription id) |
| Parts catalogue | `Part` | `product.product` (storable) | Odoo, **if** you run inventory there | Odoo → VillaOps (phase B) |
| Stock per location / vans | `PartStock`, `StockLocation` | `stock.quant`, `stock.location` (vans as locations) | One of them — see §5 | Phase B |
| Vendors | `Vendor` | `res.partner` (supplier) | Odoo | Odoo → VillaOps |
| Purchase orders | `PurchaseOrder` | `purchase.order` | Odoo (it also receives the vendor bill) | Phase B |
| Staff | `User`/`Membership` | `res.users` / `hr.employee` | Each keeps its own | Match by email |

---

## 3. What Odoo offers for integration

**API — JSON-2 (Odoo 19 and later)**
- `POST /json/2/<model>/<method>`, with an API key as `Authorization: Bearer <key>` (plus
  `X-Odoo-Database` when the server hosts several databases). Each call is its own transaction.
- It exposes the same models and methods as Odoo's own screens (`search_read`, `create`, `write`,
  business methods).
- Related records are written with Odoo's command tuples, e.g. `[(0, 0, {...})]` to add a line.

**API — XML-RPC / JSON-RPC (up to Odoo 18)**
- Same models over the old protocol, which works on every version still in use.
- Being removed in Odoo Online 21.1 (winter 2027) and Odoo 22 (fall 2028).

**API keys**
- Keys belong to a user. From Odoo 18, their lifetime is limited per user group, with an optional
  "persistent" key. **(verify)** what your administrator allows.
- Create a dedicated integration user with only the rights it needs.

**Webhooks out of Odoo**
- Automation rules have a "Send Webhook Notification" action (since Odoo 17). It POSTs selected
  fields of a record to a URL when it's created or changed.
- This is how Odoo can tell VillaOps "customer X changed" without VillaOps polling.

**Webhooks into Odoo**
- Automation rules can have an "On webhook" trigger. Odoo generates a URL and can run code on the
  payload.
- Usable, but a real API call from VillaOps is easier to secure and debug. We don't recommend
  relying on it.

**Limits**
- Odoo's acceptable-use guidance for its cloud is roughly **one call per second, no parallel calls**.
  VillaOps must queue and pace its calls. This is fine for a single company's volumes (dozens of
  jobs a day, not thousands).
- Upgrades are mandatory on Odoo Online, and fields sometimes get renamed between versions (e.g.
  `groups_id` → `group_ids` in 19.0). Keep the Odoo-specific code in one place and test before
  each upgrade.

### Availability by hosting

| Hosting | API access | Custom modules in Odoo | Notes |
|---|---|---|---|
| **Odoo Online (SaaS)** | Only on the **Custom** plan (roughly double the Standard per-user price — **verify** current EU pricing) | No (Studio only) | Mandatory upgrades. The ~1 call/s guidance applies. |
| **Odoo.sh** | Yes | Yes | The rate cap can be lifted with dedicated hosting. |
| **Self-hosted** (Community or Enterprise) | Yes | Yes | No plan gate; limits are your own server's. You run upgrades and backups. |

If you're on Odoo Online **Standard**, the choice is between upgrading to Custom and exchanging
**CSV files** (VillaOps already exports work orders, costs, assets and parts; Odoo imports CSV).
CSV works for a monthly billing run, but it's manual and error-prone.

---

## 4. Phase A — customers and invoicing (recommended first)

**Goal:** a job finished in VillaOps becomes a **draft** invoice in Odoo. Your accountant checks it and
confirms it; Odoo assigns the certified number, ATCUD and QR code.

### Flow

1. **Customers:** link each VillaOps `Client` to an Odoo `res.partner`. Do this once, by matching VAT
   number or name, in a small "Link to Odoo" screen. After that, Odoo is the source of truth:
   - an Odoo webhook on partner changes updates VillaOps;
   - a nightly job re-checks everything.

   New clients are created in Odoo first. VillaOps can offer "create from Odoo partner".
2. **Ready to invoice:** when a WO is Done, and signed where required, it appears in a new
   **"To invoice"** list in VillaOps.
   - Jobs covered by a contract (included visits, SLA work) can be marked non-billable.
   - A manager confirms what to bill.
3. **Push:** VillaOps creates the draft in Odoo, either an `account.move` customer invoice or a
   `sale.order` if you prefer to invoice from sales orders. It contains:
   - **Customer:** the client's partner. The villa can be the delivery address.
   - **Labour:** hours per technician (or in total) × a *sale* rate, on a "Labour" service product.
   - **Parts:** each part used, on its Odoo product, at its sale price.
   - **Extras:** "other costs" (crane hire, parking…) on a generic service product.
   - **Narration:** WO number and title, the villa, and a link back to the WO.
   - **Analytic account per villa** (optional), so profitability per villa is visible in Odoo.
4. **Status back:** VillaOps stores the Odoo invoice id and shows "Invoiced — FT 2026/123" on the WO.
   A webhook or nightly check picks up when the invoice is posted or cancelled.
5. **Service report:** the VillaOps PDF stays a *technical* report, not a fiscal document. It can
   be attached to the Odoo invoice.

### Gaps to close in VillaOps first

VillaOps currently records **costs** only. It knows nothing about selling prices or what's billable.

- **Sale price for labour:** today `Membership.hourlyRate` is a cost rate. Add a billable rate per
  role/technician, or per contract (contract clients often get a discounted rate).
- **Sale price for parts:** add a sale price or markup to `Part`, or take the price from the Odoo
  product/pricelist once parts are linked (phase B).
- **Billable flag and approval:** per WO and per cost line, plus a "To invoice" queue.
- **Taxes:** leave VAT entirely to Odoo, via the taxes on each product and fiscal positions. Don't
  compute VAT in VillaOps.

### Technical design (inside VillaOps)

- **Settings → Odoo** (owner/admin):
  - Odoo URL, database name, company.
  - The API key, stored with `encryptField()` like villa codes. Every decrypt is audit-logged.
  - A "Test connection" button.
- **`src/lib/odoo/client.ts`:** a small client for JSON-2. Keep an XML-RPC fallback only if you're
  on Odoo ≤ 18. It paces calls to about 1 per second, retries with back-off, and logs every call.
- **`OdooLink` table:** VillaOps id ↔ Odoo model + id, plus sync time and status. VillaOps also
  writes Odoo external IDs (`ir.model.data`, e.g. `villaops.workorder_<id>`), so a retried push
  updates the same draft instead of creating a duplicate.
- **Outbox:** pushes go into a queue table and are sent by the existing background job runner (the
  same mechanism as the PM scheduler). A slow or offline Odoo never blocks technicians.
- **`/api/odoo/webhook`:** receives Odoo's automation-rule notifications, authenticated with a shared
  secret. It only enqueues a re-fetch and never trusts the payload blindly.
- **Nightly reconciliation job:** compares linked records and reports differences on a small
  "Odoo sync" screen.

---

## 5. Phase B — parts, stock, vendors and purchasing (only if you run inventory in Odoo)

VillaOps now has a full inventory module: parts, warehouse and vans, stock movements, vendors and
purchase orders with receiving. Odoo has the same, plus stock **valuation** and **vendor bills**
flowing into accounting. Running both as masters doesn't work, so pick one of these:

**Option B1 — Odoo owns inventory and purchasing (recommended if accounting wants stock valuation):**
- Parts (`product.product`), vendors and prices come from Odoo. VillaOps keeps a synced read-only copy.
- VillaOps's vans become Odoo stock locations (`WH/Stock/Van Rui`, …).
- When a technician logs a part on a WO, VillaOps sends a consumption to Odoo, as a stock move or a
  line on the job's delivery. Odoo's stock level is authoritative, and VillaOps shows it.
- Purchase orders are created and received in Odoo. VillaOps's purchase-order screens become
  read-only links, or are switched off. The "Reorder low stock" button can create a draft Odoo PO
  instead.
- Complication: using parts while offline. The field app deliberately doesn't do it today, so no
  change is needed there.

**Option B2 — VillaOps owns operational stock; Odoo only sees money:**
- Keep everything as it is. Push parts used on invoiced jobs as invoice lines (phase A).
- Optionally push a monthly stock valuation or consumption summary.
- Much simpler, but Odoo's stock and purchasing stay unused, and vendor bills are entered by hand
  in Odoo.

---

## 6. Phase C — contracts and time (optional)

- **Contract fees:** bill monthly fees from Odoo, with Subscriptions (Enterprise) or recurring
  invoices. VillaOps keeps the SLA terms and stores the Odoo subscription id on the
  `ServiceContract`, so the reports' "contract fees vs cost" margin can use real invoiced amounts.
- **Timesheets:** push `TimeEntry` rows to Odoo as `account.analytic.line`, against a project or
  analytic account per client or villa. This is useful if Odoo handles payroll inputs or if you
  analyse profitability there. Match technicians to Odoo employees by email.
- **Reporting:** keep operational reports in VillaOps and financial reports in Odoo. Don't
  duplicate either.

---

## 7. Why not run everything in Odoo instead?

A fair question, worth a short comparison before you commit, since Odoo has **Field Service**
(Enterprise) and **Maintenance** apps.

**Where Odoo alone is strong**
- One database with no integration.
- Field Service worksheets with signatures on Odoo's mobile app.
- Maintenance requests with preventive schedules and MTBF/MTTR.

**Where VillaOps fits your business better, as built**
- **The model is built around client-owned villas:** the client → villa → area → equipment
  hierarchy, with QR labels on client equipment. Odoo Maintenance is built around your *own*
  equipment.
- **Security details:** encrypted villa access codes and device passwords, with audit logging.
- **SLA per contract**, with response and resolution tracking and reports.
- **Preventive maintenance by meter**, and meter alerts that open work orders.
- **Stock in technicians' vans.**
- **A client portal and QR-label fault reporting.**
- **A field app that works fully offline**, including photos and signatures.
- **Bilingual EN/PT throughout.**

Rebuilding these in Odoo means Studio customisation or custom modules. That in turn means Odoo.sh or
self-hosting, and upgrade work every year. **(Verify)** against a current Odoo demo if you want to
be sure. Our assessment: keep VillaOps for operations and integrate for money.

---

## 8. Effort and sequence

Assumes one developer working as in this project so far. Each step is testable on its own.

| Step | Content | Rough effort |
|---|---|---|
| 0 | Decide hosting/plan; create an Odoo test database (a copy of production) and an integration user | ½ day (your side) |
| A1 | Settings screen, encrypted key, JSON-2 client, call log, outbox + job runner, `OdooLink` | 3–4 days |
| A2 | Client ↔ partner linking screen, webhook + nightly sync of partners | 2–3 days |
| A3 | Sale prices (labour/parts), billable flag, "To invoice" queue | 2–3 days |
| A4 | Push draft invoice/sale order, status back, error handling, tests | 3–4 days |
| B1 | Products/vendors from Odoo, vans as locations, consumption → stock moves, POs in Odoo | 10–15 days |
| C | Contract ↔ subscription link, timesheet push | 4–6 days |

Phase A total is about **2–2½ weeks** including testing against an Odoo test database.

---

## 9. Risks and how to handle them

| Risk | Mitigation |
|---|---|
| Plan doesn't allow API access (Odoo Online Standard) | Decide before building. Fallback: CSV export → Odoo import (already possible today). |
| Duplicates after retries or re-sync | External IDs in Odoo plus the `OdooLink` table; every push is an upsert. |
| Both sides edit the same record | Single owner per entity (§2); the other side is read-only in the UI. |
| Odoo upgrade renames fields or methods | All Odoo code in `src/lib/odoo/`; a contract test run against the test DB before each upgrade. |
| XML-RPC removal (Online 21.1 / Odoo 22) | Build on JSON-2 if you're on 19+. Otherwise isolate the protocol so switching is a single file. |
| Rate limit (≈1 call/s on Odoo's cloud) | Queue plus pacing, batch reads with `search_read`, webhooks instead of polling. |
| API key expires | Show key expiry on the settings screen and warn owners 2 weeks ahead (a notification type exists). |
| Fiscal compliance (PT) | VillaOps never numbers or issues invoices; drafts only, confirmed in Odoo. |
| Personal data in two systems (GDPR) | Sync only what's needed (billing identity, contacts). Keep villa codes and device credentials out of Odoo entirely. |
| Multi-company in Odoo | Store the company id in settings and always filter by it. |

---

## 10. Decisions needed from you

1. **Hosting and plan:** Odoo Online (which plan?), Odoo.sh, or self-hosted? Which **version**?
2. **Invoicing style:** straight to customer invoices, or via sales orders (e.g. if you quote first)?
   Invoice per job, or a monthly invoice per client grouping all jobs?
3. **Billing rules:** what's included in contracts vs chargeable? Labour sale rates (flat, per
   technician, per contract)? Parts markup?
4. **Inventory:** option B1 (Odoo owns stock and purchasing) or B2 (VillaOps keeps it, Odoo sees
   money only)?
5. **Contract fees:** are they already billed from Odoo (Subscriptions / recurring invoices)?
6. **Who is the Odoo contact** (admin or partner) to create the integration user and test database?

With answers to 1–3, phase A can start straight away.

---

## Sources

- [Odoo 19 — External JSON-2 API](https://www.odoo.com/documentation/19.0/developer/reference/external_api.html)
- [Odoo 19 — External RPC API (XML-RPC/JSON-RPC)](https://www.odoo.com/documentation/19.0/developer/reference/external_rpc_api.html)
- [Odoo 19 — Webhooks (automation rules)](https://www.odoo.com/documentation/19.0/applications/studio/automated_actions/webhooks.html)
- [Odoo 18 — Automation rules](https://www.odoo.com/documentation/18.0/applications/studio/automated_actions.html)
- [Odoo forum — External API requires the Custom plan on Odoo Online](https://www.odoo.com/forum/help-1/does-the-external-api-really-require-the-custom-plan-on-odoo-online-or-is-there-a-trial-window-306032)
- [Wavect — Odoo API integration limits (rate cap, JSON-2, upgrades)](https://wavect.io/blog/odoo-erp-api-integration-limits-2026/)
- [nsinenko — Odoo API integration in 2026: JSON-2, webhooks](https://nsinenko.com/api/integrations/erp/2026/05/28/odoo-api-integration/)
- [HQ GmbH — Odoo 19 JSON-2 API](https://www.hqgmbh.de/en/e-commerce-tips/odoo-19-json-2-api/)
- [Oduist — "XMLRPC is dead. All hail JSON-2"](https://oduist.com/blog/odoo-experience-2025-ai-summaries-2/286-xmlrpc-is-dead-all-hail-json-2-288)
- [odoo/odoo PR #193168 — API key expiration per group](https://github.com/odoo/odoo/pull/193168)
- [Dasolo — Odoo Portugal localisation (l10n_pt, SAF-T, ATCUD, certification)](https://www.dasolo.ai/blog/odoo-around-the-world-7/odoo-portugal-accounting-vat-localization-205)
- [VATupdate — Portugal's certified software, ATCUD, QR codes and SAF-T](https://www.vatupdate.com/2026/05/29/portugals-e-invoicing-rules-certified-software-atcud-qr-codes-and-saf-t/)
- [Odoo — Field Service documentation](https://www.odoo.com/documentation/19.0/applications/services/field_service.html)
- [Odoo — Maintenance app](https://www.odoo.com/app/maintenance)
