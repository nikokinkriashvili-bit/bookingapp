# Audit 1 — Security & Data Integrity

**Date:** July 2026 · **Method:** adversarial review of all RLS policies (migrations 001–010), security-definer functions, client query paths, and what the schema *permits* vs. what the app assumes.

## Verdict

The multi-tenant boundary is fundamentally sound: every operational table has member-based RLS, the security-definer functions pin `search_path`, staff genuinely cannot edit the business row or the roster even by calling Supabase directly, and realtime respects RLS. The findings below are edge-of-boundary issues and missing database constraints — none is an open cross-tenant data leak.

---

## Security findings

### S1 — Linked supplier can update ANY column of an incoming PO 🔴
`"Linked suppliers update incoming purchase orders"` (007/009) has a `USING` clause but no column restriction. A platform-linked supplier can update a buyer's PO **status, prices, expected_delivery, notes, freight fields — even `business_id`** on POs addressed to them. The incoming-orders screen is read-only, so no UI does this — but the API allows it, and "supplier edits my order total" is exactly the trust problem a marketplace can't have.
**Fix (recommended): drop the update policy entirely until the fulfilment pipeline exists** — nothing uses it today:
```sql
drop policy "Linked suppliers update incoming purchase orders" on purchase_orders;
```
When the importer TRD lands, reintroduce it as a status-transition RPC (security definer, validates allowed transitions) instead of a raw table policy.

### S2 — `customer_vehicles` WITH CHECK ignores the customer side 🟠
The policy validates only that the **vehicle** belongs to your business; `customer_id` is unchecked. A member of business A who somehow learns a business-B customer UUID could link that customer to A's vehicle (unguessable UUIDs make exploitation unlikely; the asymmetry is still wrong).
**Fix:** extend the policy so both sides must be in `member_business_ids()` (see migration 011 draft below).

### S3 — Email confirmation must be ON ✅ *(verified live, July 2026)*
Confirmed via an actual sign-up attempt during UX testing: the app blocked login with "check your email to confirm your account, then log in" — email confirmation is enforced. Original text preserved below for context.
`claim_staff_membership()` trusts `auth.email()`. With confirmation off, an attacker who signs up using a staff member's email would inherit their access. **Verify in Supabase → Auth → Providers → Email that "Confirm email" is enabled.** Status: ☐ verified by Niko on ____.

### S4 — Self-signup is open during the pilot 🟡
Anyone who finds the Vercel URL can create an account and a business. Harmless to tenants (RLS) but pollutes data and invites abuse. **Decision needed from Niko:** keep open, or gate sign-up behind an invite list for the pilot (an `allowed_emails` table + check in onboarding is ~1 hour of work).

### S5 — `business_directory` exposes all business names to any authenticated user — **accepted**
Required for the §6.6 supplier-linking flow; exposes only id/name/type. Revisit if the platform grows beyond the trusted pilot network.

### S6 — Standing rules (document, no action)
- The anon key in the client is by design; **RLS is the security boundary.** The `service_role` key must never appear in client env or `EXPO_PUBLIC_*` variables.
- `adjust_stock` is membership-checked; members can move stock freely — same rights they already hold via RLS. Fine.

### Verified sound (attack paths tried, all blocked)
- Cross-tenant reads on all 12 operational tables (policy subqueries all resolve through `member_business_ids()`).
- Staff privilege escalation: business UPDATE and staff INSERT/DELETE are owner-only `FOR ALL` policies; member policies are SELECT-only. Confirmed by policy text, not just UI hiding.
- Realtime channel spoofing: the client-side `filter=business_id=eq.X` is convenience; WALRUS applies RLS to every event.
- Catalog tables are read-only to clients (no write policy exists).

---

## Data-integrity findings

What the database permits that the app assumes it won't:

| # | Gap | Risk |
|---|---|---|
| D1 | No `CHECK (scheduled_end > scheduled_slot)` on jobs — only the client validates | A bad insert breaks calendar overlap queries silently |
| D2 | `stock_qty` can go negative (atomic RPC subtracts blindly) | Consumption logged twice or over-logged shows −3 in stock |
| D3 | `jobs.service_ids uuid[]` has no referential integrity — deleting a service leaves dangling IDs in old jobs | Edit screen silently drops them from the list; history loses detail |
| D4 | No `CHECK (qty > 0)` on `purchase_order_items` / `job_products`; prices can be negative | Garbage rows corrupt totals |
| D5 | = S2 (cross-tenant `customer_vehicles`) | — |

**On D2:** negative stock should be *impossible*, not just unlikely — corrections go through editing the product's stock field, which sets an absolute value. Safe to constrain.
**On D3:** the right long-term fix is **soft-delete (an `archived` flag) for services** instead of hard delete — service history keeps its meaning. Until then the constraint below can't apply retroactively; run the cleanup query first.

---

## Migration 011 draft (constraints + the missing indexes)

Indexes are included here because Postgres does **not** auto-index FK columns and none exist yet (see `audits/performance.md`). Run after 010; run the cleanup queries **first** and review what they return.

```sql
-- 011_integrity_and_indexes.sql — run after 010.

-- ── Pre-flight cleanup (review results before the constraints!) ──
-- Jobs with end <= start (should be none after the audit fixes):
--   select id from jobs where scheduled_end <= scheduled_slot;
-- Negative stock:
--   select id, sku, stock_qty from products where stock_qty < 0;
-- Cross-tenant customer_vehicle links:
--   select cv.* from customer_vehicles cv
--   join customers c on c.id = cv.customer_id
--   join vehicles v on v.id = cv.vehicle_id
--   where c.business_id <> v.business_id;

-- ── Constraints ──
alter table jobs add constraint jobs_end_after_start
  check (scheduled_end > scheduled_slot);
alter table products add constraint products_stock_nonnegative
  check (stock_qty >= 0);
alter table purchase_order_items add constraint poi_qty_positive
  check (qty > 0);
alter table job_products add constraint jp_qty_positive
  check (qty > 0);

-- ── S2 fix: both sides of a customer↔vehicle link must be in-tenant ──
drop policy "Members manage customer_vehicles for their business" on customer_vehicles;
create policy "Members manage customer_vehicles for their business" on customer_vehicles for all
  using (
    vehicle_id in (select id from vehicles where business_id in (select member_business_ids()))
    and customer_id in (select id from customers where business_id in (select member_business_ids()))
  )
  with check (
    vehicle_id in (select id from vehicles where business_id in (select member_business_ids()))
    and customer_id in (select id from customers where business_id in (select member_business_ids()))
  );

-- ── S1 fix: no supplier-side PO updates until the fulfilment pipeline exists ──
drop policy "Linked suppliers update incoming purchase orders" on purchase_orders;

-- ── Indexes (FKs + hot query paths) ──
create index if not exists idx_jobs_business_slot on jobs (business_id, scheduled_slot);
create index if not exists idx_jobs_business_end  on jobs (business_id, scheduled_end);
create index if not exists idx_jobs_vehicle       on jobs (vehicle_id);
create index if not exists idx_jobs_customer      on jobs (customer_id);
create index if not exists idx_jobs_staff         on jobs (assigned_staff_id);
create index if not exists idx_vehicles_business  on vehicles (business_id);
create index if not exists idx_customers_business on customers (business_id);
create index if not exists idx_services_business  on services (business_id);
create index if not exists idx_products_business  on products (business_id);
create index if not exists idx_suppliers_business on suppliers (business_id);
create index if not exists idx_po_business        on purchase_orders (business_id);
create index if not exists idx_po_supplier        on purchase_orders (supplier_id);
create index if not exists idx_poi_po             on purchase_order_items (purchase_order_id);
create index if not exists idx_jp_job             on job_products (job_id);
create index if not exists idx_staff_business     on staff (business_id);
create index if not exists idx_staff_user         on staff (user_id);
create index if not exists idx_cv_vehicle         on customer_vehicles (vehicle_id);
create index if not exists idx_cv_customer        on customer_vehicles (customer_id);

-- ── Migration bookkeeping (TECHNICAL_AUDIT.md G7) ──
create table if not exists schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);
insert into schema_migrations (version) values
  ('001'),('002'),('003'),('004'),('005'),('006'),('007'),('008'),('009'),('010'),('011')
on conflict do nothing;
```

## Follow-ups
- ☐ Ship migration 011 (write the real file when starting this work; the draft above is the spec).
- ☐ Niko: S4 decision (open vs. invite-only signup) + the backup-settings half of Stage 0.3 (S3 email-confirmation half is now verified — see above).
- ☐ Feature backlog note: services soft-delete (`archived` flag) instead of hard delete (D3).
- ☐ Importer TRD phase: supplier status-transition RPC replaces the dropped S1 policy.
