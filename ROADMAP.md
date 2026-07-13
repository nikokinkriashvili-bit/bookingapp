# BookingApp — Master Roadmap (step-by-step execution plan)

**This is the single ordered to-do list to get the app from today to a running pilot.**
Work top to bottom. Check items off here (`[ ]` → `[x]`, add the date). Each step says what "done" means.

- Deep detail lives in: [TECHNICAL_AUDIT.md](TECHNICAL_AUDIT.md) (gap analysis) and [audits/](audits/) (specialist findings). CLAUDE.md stays the build log.
- Feature-gap proposals ([audits/feature-gap-analysis.md](audits/feature-gap-analysis.md)) were decided July 2026: F1/F2/F4/F5 merged below (3.6, 4.1b, 4.3-prereq, 4.3b), F6–F10 = Stage 4½, **F3 coating warranty rejected — do not build**.
- UX clarity findings ([audits/ux-clarity.md](audits/ux-clarity.md), Audit 8): **C2, C1 (quick-chip half), C3, C4 done and committed (ea9eeaf)**. C1's quick-chip half satisfies the chip portion of Stage 3.2 below — see that line for what's still open. C5/C6 explicitly deferred, not folded into the numbered stages.
- Importer/wholesaler module planning: [IMPORTER_MODULE_PLAN.md](IMPORTER_MODULE_PLAN.md) — feature proposals feeding Niko's importer TRD (5.3); builds as Stage 8 after the TRD is confirmed.
- ⚙️ = code (Claude builds) · 🖐 = Niko action (dashboard/paperwork/decision) · 🧪 = verification gate
- Standing rule per step: typecheck + lint clean, tested at 375px where visual, CLAUDE.md updated, committed. One step per commit unless marked as a batch.

---

## Stage 0 — Land what's already done ✅ *(complete July 2026)*

- [x] **0.1** ⚙️ Commit the July bug-audit fixes (migration 010 file, atomic stock wiring, PO mark-sent fix, calendar overlap, parseDecimal, jobActions seams, confirm/error surfacing, WhatsApp field, i18n additions, audit docs).
- [x] **0.2** 🖐 Run `supabase/010_atomic_stock.sql` in the Supabase SQL Editor.
- [~] **0.3** Email confirmation confirmed **ON** (observed live: sign-up blocks login until confirmed). Backup-settings half still unconfirmed — 🖐 Niko still needs the Database dashboard check.

## Stage 1 — Safety net ✅ *(complete July 2026)*

- [x] **1.1** ⚙️ GitHub Actions workflow: typecheck + lint + **test** + web export on every push/PR (`.github/workflows/ci.yml`).
- [x] **1.2** ⚙️ Jest (`jest-expo`) + 38 unit tests across `number`, `calendarDate`, `inventory`, `jobStatus`, `consumption` (Supabase mocked). `npm test` in CI.
- [x] **1.3** ⚙️ Root error boundary — self-contained bilingual reload screen (`RootErrorBoundary`, exported from `app/_layout.tsx`).
- [x] **1.4** ⚙️ Auth gate in the root layout: signed-out deep links → `/login` (login/sign-up public); verified `/vehicles` → login.
- [x] **1.5** ⚙️ Error-vs-empty states: failed fetches show a retry banner (`FetchError`) on calendar month+day, vehicles, customers, inventory, POs, dashboard.

## Stage 2 — Database integrity ✅ *(complete July 2026)*

- [x] **2.1** ⚙️ `supabase/011_integrity_and_indexes.sql` written (858475e) — matches the audit's draft spec verbatim.
- [x] **2.2** 🖐 Migration 011 run by Niko in the Supabase SQL Editor.
- [x] **2.3** ⚙️ Housekeeping done (858475e): removed 4 unused beta deps (zero imports confirmed first); moved jest/jest-expo/@types/jest to devDependencies (an earlier install misplaced them). Verified: tsc/lint/jest clean, app boots with no console errors, production export succeeds.

## Stage 3 — Intake speed + polish quick wins ✅ *(complete July 2026)*

- [x] **3.1** ⚙️ Intake defaults done (f7dee2b): From = today + now rounded up to 15 min when no date param (`roundUpToNextQuarterHour`, unit tested).
- [x] **3.2** ⚙️ Date/time quick chips (ea9eeaf) + numeric keyboards (f7dee2b) — **fully done.**
- [x] **3.3** ⚙️ Accessibility quick pass done (a76852e): hitSlop on all 11 icon-only controls (steppers, ×, nav arrows, settings gear); accessibilityLabel/Role on the same; light-theme `muted` darkened #8A9099→#6E747D (~3.0:1 → ~4.7:1, computed).
- [x] **3.4** ⚙️ Localization fixes done (8b1645d): `po.expectedDeliveryShort` key replaces the `.split(" (")` hack (L2); `common.to` renamed to `common.timeRangeSeparator` (L3).
- [x] **3.5** 🖐⚙️ Done (7a8519a): Niko's brief — total GEL + status-count badges per day, awaiting-collection folded into the same row.
- [x] **3.6** ⚙️ Materials balloons done (ab44887): real spend from received POs, split this-month/last-month; dead placeholder styles + i18n key removed.

## Stage 4 — Feature backlog *(Niko-approved order; one feature per step, stop-and-confirm between each)*

- [~] **4.1** ⚙️ Photo capture + before/after gallery done (1ae75bf): `vehicle_photos` table + private Storage bucket (migration 012, **not yet run**), client-side resize/compress to ~300KB before upload, before/after gallery on the vehicle profile, R2 migration seam isolated to `src/lib/vehiclePhotos.ts`. **Blocked on Niko for two things:** (a) run migration 012, (b) confirm the actual capture flow on a real phone — camera/photo-library access can't be tested in the browser preview.
- [~] **4.1b** ⚙️ Vehicle condition check-in done (29eae3c): checklist (body/glass/wheels/interior) + note at both intake and edit; tagged 'condition' photos on the edit screen (photo capture needs a job_id, which doesn't exist mid-intake). **Blocked on Niko:** run migration 013; confirm the photo capture flow on a real phone (same limitation as 4.1). Receipt inclusion (4.7) still pending — not yet built.
- [ ] **4.2** ⚙️ Rebooking/maintenance reminders (BRD §5.1): reminder schedule per job/service, due-reminders surface for the owner; WhatsApp send stays a seam. *(Coating-warranty variant F3 rejected by Niko — generic reminders only.)*
- [ ] **4.3** ⚙️ Public booking link (`/book/<slug>`, BK-01): public route (carve-out in the 1.4 auth gate), business slug, service+slot picker respecting working hours, booking lands as `booked` job. Anti-abuse via Edge Function rate limit. **Prerequisite (F4): `business_closures` table (holiday/vacation date ranges) respected by the slot picker and the calendar.**
- [ ] **4.3b** ⚙️ Manual payment recording (F5): `payments` table arrives now (migration) — record amount + method (cash/transfer/BOG-link) on a job; partial payments tracked; `paid` status auto-flips at zero balance; "pending payments" stat uses true remaining balances. BOG (6.3) later becomes one more writer to the same table.
- [ ] **4.4** ⚙️ Deposit collection at booking (BOG seam): deposit fields on job + booking flow, recorded through 4.3b's payments table; real charge waits for Stage 6.
- [ ] **4.5** 🖐→⚙️ Capacity limits — **blocked on Niko's definition** (bays? staff count? max concurrent jobs?). Define, then build into intake + public booking.
- [ ] **4.6** ⚙️ Push notifications (`expo-notifications` + device-tokens table): owner alerts (low stock, overdue, no-show). **Customer-facing confirmations carry confirm/reject actions that update job status** (standing Niko requirement — applies to WhatsApp later too).
- [ ] **4.7** ⚙️ Downloadable receipt (PDF) from a completed/paid job.
- [ ] **4.8** ⚙️ Repeat-last-order shortcut (completes the intake-speed story for regulars).
- [ ] **4.9** ⚙️ Services soft-delete (`archived` flag, migration 012) — closes audit finding D3 properly.

## Stage 4½ — Post-pilot wave *(F6–F10, order set by pilot feedback — re-rank before starting)*

- [ ] **4½.1** ⚙️ Customer-facing live status page (F6): tokenized public job URL — status, ETA, progress photos; link sent in the WhatsApp confirmation once 6.2 is live.
- [ ] **4½.2** ⚙️ Job profitability (F7): margin per job & per service type from consumption cost — needs a few months of real PO/consumption data first.
- [ ] **4½.3** ⚙️ Waiting list / cancellation backfill (F8).
- [ ] **4½.4** ⚙️ Staff commission report (F9): % per staff member, monthly earned-per-staff.
- [ ] **4½.5** ⚙️ Owner end-of-day digest push (F10, on 4.6 infrastructure).

## Stage 5 — Paperwork track 🖐 *(start NOW, runs parallel to Stages 1–4; these are the long poles)*

- [ ] **5.1** 🖐 **Bank of Georgia merchant account** (businessonline.ge) — weeks of lead time; blocks 6.3.
- [ ] **5.2** 🖐 Resolve WhatsApp Business entity (Niko's entity vs. Carbros') and start Meta business verification — blocks 6.2.
- [ ] **5.3** 🖐 Importer-module TRD (in Cowork) — unblocks landed cost/FX, fulfilment pipeline, NBG (6.4). **Feature proposals + the 7 decisions the TRD must settle are pre-drafted in [IMPORTER_MODULE_PLAN.md](IMPORTER_MODULE_PLAN.md); confirmed scope becomes Stage 8.**
- [ ] **5.4** 🖐 Decisions: open vs. invite-only signup for pilot (S4) · Vercel Hobby→Pro · pilot detailer shortlist.

## Stage 6 — Integrations *(last by design; each behind its existing seam)*

- [ ] **6.1** ⚙️ Supabase Edge Functions skeleton: functions repo layout, secrets, deploy flow documented in the runbook.
- [ ] **6.2** ⚙️ WhatsApp Cloud API: send function called from `fireStatusSeams`, `messages_log` table (migration), bilingual template pairs approved by Meta, customer language preference column. *Depends on 5.2.*
- [ ] **6.3** ⚙️ BOG payments: payment-link creation + webhook receiver Edge Function, `payments` table (migration), `paid` status driven by webhook; deposits (4.4) go live. *Depends on 5.1.*
- [ ] **6.4** ⚙️ NBG rate fetch — only when the importer TRD (5.3) lands.

## Stage 7 — Pilot readiness 🧪 *(gates launch)*

- [ ] **7.1** 🖐 **Supabase Pro upgrade** (real backups — non-negotiable before real business data) + staging project; ⚙️ `.env` split; every migration runs on staging first from now on.
- [ ] **7.2** ⚙️ Sentry wired to production (crash visibility on pilot phones).
- [ ] **7.3** 🧪 Real-device pass (iOS + Android, unblocked network): Georgian 375px layout sweep (L1) · Android `ka-GE` dates (L4) · font-scaling + web tab-through (A5/A6) · **stopwatch intake measurement** per the protocol in audits/intake-speed.md (target: Flow 1 median <25s).
- [ ] **7.4** ⚙️🖐 Seed Carbros production data: real services, products, suppliers, staff; owner walkthrough.
- [ ] **7.5** ⚙️ Ops runbook (RUNBOOK.md): run a migration, restore a backup, read Sentry, rotate keys, add a pilot business.
- [ ] **7.6** 🧪 **Pilot launch:** Carbros live for 2 weeks → fix what breaks → onboard 2–3 network detailers (5.4 shortlist).

---

## Definition of "the app works"

Every box in Stages 0–3 and 7, plus 4.1–4.4 + 4.6–4.8, plus 6.1–6.3, checked. Stage 4.5 ships if defined; 6.4 waits for the importer TRD. When that set is green, the platform does end-to-end what the TRD promised: book → work → notify → pay → restock — bilingually, on a phone, in under 30 seconds per booking.

## Progress log

| Date | Step(s) | Notes |
|---|---|---|
| July 2026 | Audits complete | Bug audit fixes built; 6 specialist audits + feature-gap analysis in `audits/` |
| July 2026 | Stage 0 ✅ | Audit fixes committed + pushed (88a413d); migration 010 run by Niko |
| July 2026 | Stage 1 ✅ | CI + 38 unit tests, error boundary, auth gate, error-vs-empty states (03b3efb, c134b77, e94c1de) |
| July 2026 | Ad-hoc fixes (outside the numbered stages) | Real-phone testing surfaced 2 bugs: web dark-mode background (d2e2da8) and an unclickable tab bar on mobile touch + the Tabs scene background (fa5eb1f); CI itself was failing on Node 20's Metro floor, bumped to Node 22 (94004e6); ARCHITECTURE.md added as a hand-maintained navigation index (9d0d132) |
| July 2026 | UX clarity pass ✅ | C2 (field labels), C1 quick-chip half (Today/Tomorrow/Now/+1h/09:00/14:00), C3 (scroll-to-error), C4 (new-vehicle framing copy) — all committed (ea9eeaf). C5/C6 deferred. Overlaps/closes the chip half of Stage 3.2. |
| July 2026 | Stage 2.1 + 2.3 ✅ | Migration 011 written (constraints, S1/S2 RLS fixes, indexes, schema_migrations bookkeeping) + dependency housekeeping (858475e). **2.2 still blocked on Niko running the migration.** |
| July 2026 | Stage 3.1 + 3.2 ✅ | Intake From-field now defaults to today+now-rounded (f7dee2b); numeric keyboards on all 4 schedule inputs. Combined with the earlier UX-clarity chips (ea9eeaf), Stage 3.2 is fully closed. |
| July 2026 | Stage 3.4 ✅ | `po.expectedDeliveryShort` key + `common.to`→`common.timeRangeSeparator` rename (8b1645d) |
| July 2026 | Stage 3.3 ✅ | hitSlop + accessibilityLabel on all 11 icon-only controls; light-theme `muted` darkened for AA contrast (a76852e) |
| July 2026 | Stage 3.6 ✅ | Materials dashboard balloons now show real received-PO spend; dead placeholder code removed (ab44887) |
| July 2026 | Stage 2.2 ✅ | Migration 011 run by Niko in Supabase — Stage 2 fully complete |
| July 2026 | Stage 3.5 ✅ | Month-grid redesigned to total GEL + status-count badges per Niko's brief (7a8519a) — Stage 3 fully complete |
| July 2026 | Stage 4.1 (code done, needs Niko) | Photo capture + before/after gallery built (1ae75bf) — migration 012 not yet run, real-device capture flow not yet confirmed |
| July 2026 | Stage 4.1b (code done, needs Niko) | Vehicle condition check-in built (29eae3c) — migration 013 not yet run, real-device capture flow not yet confirmed |
