# Architecture Map

A navigation index for this codebase — where things live and how they connect, so a session can jump straight to the right file instead of re-deriving the structure by reading everything. Kept in plain markdown, hand-maintained, committed to git: update it in the same commit whenever you add a route, table, provider, or lib module.

**Read this before grepping.** For "what's built and why" context (product decisions, phasing), read [CLAUDE.md](CLAUDE.md) instead — this file is structural, that one is narrative.

---

## 1. System shape

Expo Router (file-based routes) + Supabase (Postgres/Auth/Realtime, single source of truth) + React Context providers for cross-cutting state. No Redux/Zustand — providers are the whole state layer. Every screen queries Supabase directly via `src/lib/supabase.ts`; there is no API/backend layer, no server actions — RLS is the only access-control boundary. Client never talks to third-party integrations (WhatsApp/BOG) directly; those route through Supabase Edge Functions (not yet built — see [ROADMAP.md](ROADMAP.md) Stage 6).

## 2. Provider tree

Order matters (each depends on the ones above it). Defined in [src/app/_layout.tsx](src/app/_layout.tsx):

```
SafeAreaProvider
└─ ThemeProvider          light/dark/system, persisted            src/providers/ThemeProvider.tsx
   └─ LanguageProvider    ka/en, persisted                        src/providers/LanguageProvider.tsx
      └─ AuthProvider     Supabase session                        src/providers/AuthProvider.tsx
         └─ BusinessProvider   current business + owner/staff role  src/providers/BusinessProvider.tsx
            └─ CatalogProvider  business-type/service catalog (read-only ref data)  src/providers/CatalogProvider.tsx
               └─ ThemedStack (AuthGate + Stack + QuickSettingsButton)
```

`OnboardingProvider` and `CalendarFilterProvider` are **scoped**, not global — mounted only in `onboarding/_layout.tsx` and `(tabs)/calendar/_layout.tsx` respectively.

`AuthGate` (inline in `_layout.tsx`) redirects signed-out users to `/login` for every route except `login`/`sign-up`. `RootErrorBoundary` (`src/components/RootErrorBoundary.tsx`) is exported as Expo Router's `ErrorBoundary` — renders on any screen crash, self-contained (no provider dependency).

## 3. Route map

`src/app/` — Expo Router file-based routing. `(tabs)/` is a route group (no URL segment). Routes outside `(tabs)/` (auth, onboarding, CRM) are reached via `Link`/`router.push`, not tab icons.

| Route | File | Reads/writes | Notes |
|---|---|---|---|
| `/login` | `app/login.tsx` | `auth` | Public. Language toggle here too. |
| `/sign-up` | `app/sign-up.tsx` | `auth` | Public. |
| `/onboarding/business-type` → `/hours` → `/services` | `app/onboarding/*.tsx` | `business_type_catalog`, `default_service_templates` (read), `businesses`, `services` (write on finish) | State lives in `OnboardingProvider` across the 3 steps. |
| `/` (Home) | `app/(tabs)/index.tsx` | — | Renders `DashboardStats`. |
| `/calendar` (month) | `app/(tabs)/calendar/index.tsx` | `jobs` (overlap query on `scheduled_slot`/`scheduled_end`) | Realtime subscription. |
| `/calendar/[date]` (day) | `app/(tabs)/calendar/[date].tsx` | `jobs`, status writes via `jobActions.applyStatusChange` | Quick status-flip modal + "Edit order" link. |
| `/jobs` (intake) | `app/(tabs)/jobs/index.tsx` | `vehicles`, `customers`, `customer_vehicles`, `services`, `staff`, `jobs` (insert) | The <30s intake flow — see `audits/intake-speed.md`. |
| `/jobs/[id]/edit` | `app/(tabs)/jobs/[id]/edit.tsx` | `jobs` (update), `job_products` (via `consumption.ts`), `job_conditions`, `vehicle_photos` (kind='condition'), `payments`, quote fields on `jobs` | Full edit: consumption, condition check-in + photos, payments, quote flow, PDF receipt (complete/paid only). |
| `/reminders` | `app/reminders/index.tsx` | `rebooking_reminders` (via `lib/rebookingReminders.ts`) | Due/upcoming rebooking nudges; linked from Home. Outside tab group. |
| `/inventory` | `app/(tabs)/inventory/index.tsx` | `products`, `suppliers` | Reorder-point math via `lib/inventory.ts`. |
| `/inventory/product` | `app/(tabs)/inventory/product.tsx` | `products` | Create/edit one product. |
| `/inventory/suppliers` | `app/(tabs)/inventory/suppliers.tsx` | `suppliers`, `business_directory` | Supplier linking for the importer loop. |
| `/inventory/orders` → `/orders/[id]` | `app/(tabs)/inventory/orders/*.tsx` | `purchase_orders`, `purchase_order_items` | Draft → sent → received via `purchaseOrders.ts`. |
| `/inventory/incoming` | `app/(tabs)/inventory/incoming.tsx` | `purchase_orders` (cross-tenant, `is_linked_supplier` RLS) | Read-only incoming queue for a linked supplier. |
| `/settings` | `app/(tabs)/settings.tsx` | `businesses`, `services`, `staff` | Owner-only (tab hidden for staff). |
| `/vehicles` → `/vehicles/[id]` | `app/vehicles/*.tsx` | `vehicles`, `jobs`, `customer_vehicles` | CRM, outside tab group. |
| `/customers` → `/customers/[id]` | `app/customers/*.tsx` | `customers`, `jobs`, `customer_vehicles` | CRM, outside tab group. |

## 4. Data model

Tables live in `supabase/*.sql`, run by hand in order (Claude has no DB access — see [CLAUDE.md](CLAUDE.md)). Every table is per-business RLS via `member_business_ids()` (security-definer fn, migration 009: owner OR linked staff).

| Table | Migration | Purpose |
|---|---|---|
| `businesses` | 001 | Tenant root. `owner_id`, `working_hours` jsonb, `whatsapp_number`. |
| `services` | 001, 014 (+`reminder_interval_days`), 017 (+`price_min`/`price_max`, `price_gel` now dormant), 019 (+`archived`) | Per-business service catalog. Price is a guide *range*, not fixed — detailers quote after inspecting (see CLAUDE.md pivot). Archived services are excluded from new bookings but still resolve on old jobs. |
| `business_type_catalog`, `default_service_templates` | 002, 008 (+`label_ka`/`name_ka`) | Read-only reference data seeding onboarding. |
| `vehicles` | 003 | Plate is the effective key (unique per business, not global). |
| `customers`, `customer_vehicles` | 003 | M2M — supports multiple owners per car. |
| `jobs` | 003, 005 (+`scheduled_end`), 009 (+`assigned_staff_id`), 018 (+`quote_price`/`quote_description`/`quote_status`/`quote_sent_at`/`quote_expires_at`/`quote_token`) | Core booking record. `status` enum: booked/in_progress/awaiting_collection/complete/paid/cancelled. Quote fields hold the per-job inspect→quote→accept/decline flow (`lib/quotes.ts`); `quote_token` is reserved for the Stage 6 public link. |
| `suppliers` | 006 | Per-business; `linked_business_id` optionally points at a real platform business (the importer loop). |
| `products` | 006 | Stock, reorder inputs, dormant landed-cost columns (see `IMPORTER_MODULE_PLAN.md`). |
| `purchase_orders`, `purchase_order_items` | 006, 007 (+name/sku snapshot) | draft→sent→received. Cross-tenant read/update for linked suppliers via `is_linked_supplier()`. |
| `job_products` | 007 | Stock consumption per job; adjusts stock at logging time, not on status change (prevents double-count). |
| `business_directory` | 007 | Minimal cross-tenant view (id/name/type) for supplier-linking UI. |
| `staff` | 009 | Owner-added by email; `claim_staff_membership()` attaches `user_id` on matching login. |
| `vehicle_photos` | 012, 013 (+`'condition'` kind) | Private Storage bucket, path-based tenant RLS. `kind`: before/after/other/condition. Signed URLs only, never public. |
| `job_conditions` | 013 | One row per job (upsert on `job_id`): body/glass/wheels/interior damage flags + note. |
| `rebooking_reminders` | 014 | One row per completed job with a service `reminder_interval_days` set; `status` pending/dismissed/booked. |
| `business_closures` | 015 | Inclusive date ranges the business is shut; respected by the calendar (and, later, public booking). |
| `payments` | 016 | One or more rows per job (deposit + balance etc.); `method` cash/transfer/bog_link. Job auto-flips to `paid` once payments cover `price_total`. |
| `push_tokens` | 020 | Expo push token per device, registration-only seam — no sends until Stage 6's Edge Function + cron exist. |

Full RLS/constraint detail: `audits/security-data-integrity.md` (includes the migration 011 draft — constraints + indexes, not yet run).

## 5. Library index (`src/lib/`)

| File | Purpose |
|---|---|
| `supabase.ts` | Client init, SSR-safe storage shim. |
| `i18n.ts` | `StringKey` union + `en`/`ka` string tables (type-enforced parity), `useT()`, `formatGel`, `localeFor`. |
| `theme.ts` | Design tokens — `lightColors`/`darkColors`, semantic `status` tone map. |
| `jobStatus.ts` | `JobStatus` type, status→tone mapping, `summarizeJobs` (period GEL totals). |
| `jobActions.ts` | `applyStatusChange`/`fireStatusSeams` — single place a status change fires WhatsApp/BOG seams. |
| `inventory.ts` | Reorder-point math, stock status, suggested order qty (BRD §6.2/§6.3 formulas). |
| `consumption.ts` | Product-consumption-per-job stock deltas, via the atomic `adjust_stock` RPC. |
| `purchaseOrders.ts` | Draft-PO creation/merge, receive-stock flow. |
| `calendarDate.ts` | Pure date helpers (no timezone lib — local `Date` only). |
| `number.ts` | `parseDecimal`/`parseDecimalOr`/`parseIntOr` — comma-decimal-safe (Georgian keyboards). |
| `confirm.ts` | Cross-platform (web/native) confirm dialog. |
| `businessTypes.ts` | `BusinessType`, `WorkingHours`, `Weekday` types. |
| `integrations.ts` | Inert WhatsApp/BOG seam placeholders — `TODO` markers, not working stubs. |
| `vehiclePhotos.ts` | Storage upload/compress/signed-URL calls for `vehicle_photos` — the whole R2 migration seam lives in this one file. |
| `jobConditions.ts` | Get/upsert one job's condition check-in row. |
| `rebookingReminders.ts` | Creates a reminder on job completion; lists/dismisses/marks-booked. |
| `closures.ts` | List/create/delete `business_closures`; pure `isDateClosed` (unit-tested). |
| `payments.ts` | Pure `sumPayments`/`outstandingBalance`/`isSettled` (unit-tested) + `recordPayment` (auto-flips to `paid`). |
| `quotes.ts` | Per-job quote flow: `saveQuoteDraft`/`sendQuote`/`respondToQuote`; pure `quoteDisplayStatus`/`isQuoteExpired` (unit-tested, expiry is derived not stored). |
| `receipt.ts` | Pure `buildReceiptHtml` (unit-tested) + `printReceipt` (expo-print/expo-sharing side effect). |
| `alerts.ts` | Pure `computeLowStockAlerts`/`computeJobAlerts` (unit-tested) — owner alerts computed client-side, no cron yet. |
| `pushTokens.ts` | Best-effort Expo push token registration — Stage 6 seam, no-ops on web/without an EAS project id. |

Tests: `src/lib/__tests__/*.test.ts` — covers `number`, `calendarDate`, `inventory`, `jobStatus`, `consumption` (Supabase mocked). Run via `npm test`.

## 6. Component index (`src/components/`)

| File | Purpose |
|---|---|
| `PlateChip.tsx` | The signature visual element — Georgian plate styling. |
| `FieldLabel.tsx` | Visible form-field label (design guidance §9). |
| `FetchError.tsx` | Retry banner for failed fetches (vs. empty state). |
| `RootErrorBoundary.tsx` | Crash screen, exported as Expo Router's `ErrorBoundary`. |
| `PeriodSummary.tsx` | GEL summary pill row (total/completed/pending/paid). |
| `DashboardStats.tsx` | Home screen stat balloons. |
| `CalendarFiltersButton.tsx` | Status/service/staff filter modal for the calendar. |
| `QuickSettingsButton.tsx` / `QuickSettingsDrawer.tsx` | Floating gear → theme/language/settings-link/sign-out drawer. |
| `AlertsBanner.tsx` | Home-screen owner alerts (low stock/overdue/no-show) — only renders when there's something to say. |

## 7. Quick index — "where do I look for X"

| Task | File(s) |
|---|---|
| Change a status color/label | `lib/jobStatus.ts` (+ both `i18n.ts` string tables) |
| Change reorder-point math | `lib/inventory.ts` (+ `lib/__tests__/inventory.test.ts`) |
| Add a new bilingual string | `lib/i18n.ts` — add to **both** `en` and `ka` (compiler-enforced parity) |
| Add a DB column/table | Next `supabase/0NN_*.sql` file; update §4 above |
| Change intake flow | `app/(tabs)/jobs/index.tsx`; speed constraints in `audits/intake-speed.md` |
| Change calendar query logic | `app/(tabs)/calendar/index.tsx` (month), `[date].tsx` (day) — both use overlap queries |
| Wire a WhatsApp/BOG trigger | `lib/integrations.ts` (seam) + `lib/jobActions.ts` (where it's called) |
| Change RLS/security | `supabase/009_staff.sql` (current policies) + `audits/security-data-integrity.md` (migration 011 draft) |
| Theme tokens | `lib/theme.ts`; web-only doc background gotcha in `DESIGN.md` |
| CI pipeline | `.github/workflows/ci.yml` |
| Full roadmap / what's next | `ROADMAP.md` |
