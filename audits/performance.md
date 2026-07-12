# Audit 3 — Performance & Data Volume

**Date:** July 2026 · **Method:** review of every Supabase query's shape vs. realistic pilot data volumes (per business: ~500 jobs/yr, ~200 vehicles, ~300 customers, ~200 products, ~50 POs). Not load-tested — thresholds below say when each item starts to hurt.

## Verdict

Nothing is slow **today** and nothing should be optimized speculatively. But three query patterns scale linearly with all-time data (not with what's on screen), and the database has **no indexes at all** beyond primary keys and unique constraints — Postgres does not auto-index FK columns. Indexes are the only "do now" item; everything else has a trigger threshold.

## Findings

### P1 — No database indexes 🔴 *do now*
Every calendar fetch filters `jobs (business_id, scheduled_slot/scheduled_end)`; vehicle/customer profiles filter jobs by `vehicle_id`/`customer_id`; every list filters by `business_id` — all currently sequential scans. Invisible at 100 rows, a real cost at 10k+ across tenants (RLS subqueries multiply the pain).
**Fix:** the index block in migration 011 — see `audits/security-data-integrity.md` (shipped together deliberately: one migration, one run).

### P2 — Dashboard fetches every job ever 🟠
`DashboardStats` pulls **all** jobs for the business (all-time) into the client and reduces in JS, on every Home visit and every realtime jobs event.
**Threshold:** noticeable at ~2–3k jobs (a busy shop's year 2).
**Fix when hit:** one `dashboard_stats` RPC (SQL aggregates) or a filtered pair of `count`/`sum` queries. Don't build it yet.

### P3 — Vehicles list fetches all jobs for "last visit" 🟠
Builds the last-visit map by pulling every non-cancelled job (two columns wide, but still every row).
**Threshold:** same ballpark as P2.
**Fix when hit:** `select vehicle_id, max(scheduled_slot) ... group by vehicle_id` via RPC/view.

### P4 — No fetch pagination on list screens 🟡
Vehicles, customers, products, POs fetch full tables. `FlatList` virtualizes *rendering*, so the UI stays smooth — the cost is transfer + memory.
**Threshold:** ~1–2k rows per list per business. Pilot detailers won't hit it in year one.
**Fix when hit:** `.range()` pagination + infinite scroll, search moved server-side (`.ilike`).

### P5 — Realtime refetch granularity ✅ fine
Three channels (month, day, dashboard) each refetch their whole window on any jobs change. At pilot scale this is the *right* simplicity — event-payload patching is a rabbit hole. Revisit only if refetch visibly flickers at >50 jobs/day.

### P6 — Client bundle ✅ fine
~28–34 kB per route, static export. Nothing to do.

## Standing rule

When a screen feels slow: check this file first, confirm which threshold was crossed, apply the pre-planned fix. Don't invent a new architecture in response to one slow screen.

## Follow-ups
- ☐ Indexes ship in migration 011 (with the integrity constraints).
- ☐ At pilot + 6 months: re-check P2/P3 against real row counts (`select count(*) from jobs`).
