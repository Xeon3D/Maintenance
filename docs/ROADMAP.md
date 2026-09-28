# Villa Systems CMMS — Product & Build Roadmap

A multi-tenant SaaS CMMS (MaintainX-class) for integrators servicing high-end residential
villas: **Electrical, Automation (KNX/Crestron/Control4/Lutron), Network, Security & CCTV,
A/V, Lighting.**

## Stack

| Layer | Choice |
|---|---|
| App | Next.js (App Router, TypeScript, Server Actions) |
| DB | PostgreSQL + Prisma ORM |
| Auth | Auth.js (credentials + magic link), org-scoped RBAC |
| UI | Tailwind CSS + shadcn/ui, responsive/mobile-first |
| i18n | next-intl — `en` and `pt` from day one |
| Files | S3-compatible storage (local disk in dev) for photos, PDFs, signatures |
| Jobs | pg-boss (Postgres-backed queue) for PM generation, notifications |
| Mobile/offline | PWA + IndexedDB sync queue (phase 5) |
| Tests | Vitest (unit) + Playwright (e2e) |

**Multi-tenancy:** every tenant row carries `organizationId`, enforced in one Prisma client
extension, so no query can skip it.

## Domain model (villa-specific)

```
Organization ─┬─ Users (roles: Owner, Admin, Manager, Technician, Requester/Client, Viewer)
              ├─ Teams (e.g. "Network & AV", "Electrical")
              ├─ Clients ── Villas (Locations, address/GPS/access notes/gate codes*)
              │               └─ Areas (Floor ▸ Room: Cinema, Rack Room, Pool House…)
              │                   └─ Assets (tree: Rack ▸ Switch ▸ PoE port devices)
              │                        system: ELECTRICAL|AUTOMATION|NETWORK|SECURITY|CCTV|AV|LIGHTING
              │                        brand/model/serial/MAC/IP/VLAN/firmware/warranty/install date
              ├─ Service Contracts (SLA response times, included visits, per villa)
              ├─ Work Orders ── Tasks/Checklist, Parts used, Time logs, Comments,
              │                 Photos, Client signature, Status history, Cost
              ├─ Requests (client/villa-manager portal + QR code on each asset)
              ├─ Preventive Maintenance schedules (time- and meter-based)
              ├─ Procedures library (reusable checklists: "Quarterly CCTV health check")
              ├─ Meters & readings (UPS battery %, HDD hours, lamp hours, kWh)
              ├─ Parts / Inventory (Warehouse + each Van as a stock location)
              ├─ Vendors & Purchase Orders
              └─ Messages (per-WO threads + team channels), Notifications, Audit log
```
\* Sensitive fields (gate/alarm codes, Wi-Fi & device credentials) are encrypted at rest,
visible only to assigned staff, and every view is logged.

## Phases

1. ✅ **Foundation**: repo, Prisma schema, auth, orgs/invites, RBAC, i18n, app shell, tenant guard.
2. ✅ **Assets & Locations**: clients, villas, areas, asset hierarchy, system categories, QR labels, import from CSV.
3. ✅ **Work Orders**: CRUD, statuses, priorities, assignment, checklists, photos, time, signatures, PDF service report, calendar/board/list views.
4. ✅ **Preventive Maintenance & Procedures**: schedules, auto-generation job, procedure templates, meters & meter-triggered PMs.
5. ✅ **Requests & Client Portal**: request form, QR scan-to-report, client login to see their villa's history.
6. ✅ **Inventory & Purchasing**: parts, stock per van/warehouse, reorder points, vendors, POs, parts consumption on WOs.
7. ✅ **Messaging & Notifications**: WO threads, @mentions, email + web push.
8. **Reporting & Dashboards**: MTTR, SLA compliance, PM compliance, cost per villa/system, technician utilisation, CSV export.
9. **Offline mobile (PWA)**: offline WO execution, background sync, camera capture.
10. **SaaS layer**: subscription plans/billing (Stripe), usage limits, super-admin console.

Each phase ends with migrations, seed data, tests, and a working demo.
