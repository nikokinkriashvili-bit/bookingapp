# BookingApp — Technical Audit & Roadmap

**Date:** July 2026 · **Auditor:** Claude (full codebase + schema review)
**Scope:** architecture, security, data integrity, resilience, delivery pipeline, and the path to pilot.

> **⚠️ Execution moved:** the ordered step-by-step plan now lives in [ROADMAP.md](ROADMAP.md) — check items off **there**. This document remains the gap analysis (section 2) and debt register (section 3) behind those steps; its section 4 phases were merged into ROADMAP.md and are kept only as reference.

**Detailed specialist audits live in [`audits/`](audits/)** — each is the guidance doc for its area:
[security & data integrity](audits/security-data-integrity.md) (incl. migration 011 draft) · [intake speed](audits/intake-speed.md) · [performance](audits/performance.md) · [accessibility](audits/accessibility.md) · [localization](audits/localization.md) · [cost & scaling](audits/cost-scaling.md)

---

## 1. Where the system stands

**Verified in this audit:** TypeScript strict compile clean · ESLint clean · production web export clean · app boots with no console errors · all `t()` keys type-enforced in both languages · every route link resolves · RLS member-based on all 12 operational tables.

| Area | State |
|---|---|
| Client | Expo SDK 54, React 19, Expo Router 6, typed routes, React Compiler enabled |
| Backend | Supabase (Postgres + Auth + Realtime), 10 hand-run migrations, per-business RLS |
| Auth | Email/password; owner + staff roles; email-claim staff linking |
| Features built | Onboarding, job intake (<30s), calendar (month/day), order edit, CRM (vehicles/customers), inventory (products/suppliers/POs/consumption), staff, settings, bilingual UI, light/dark theme |
| Integrations | Inert seams only (WhatsApp / BOG / NBG) — by design, wired at the end |
| Bug audit (July 2026) | 10 findings fixed in working tree — **uncommitted; migration 010 not yet run** |

---

## 2. Gaps found in this audit

Ordered by risk to the pilot, not by effort.

### G1 — No automated tests at all 🔴
There is not a single test in the repo. The pure-logic modules are exactly the ones where silent regressions hurt: reorder math (`inventory.ts`), stock deltas (`consumption.ts`), date handling (`calendarDate.ts`), comma parsing (`number.ts`), job summaries (`jobStatus.ts`). These are all pure functions — trivially testable without mocking Supabase.
**Fix:** Jest + `jest-expo`; unit-test the five lib modules first (~1 session). UI/E2E tests can wait; lib tests cannot.

### G2 — No CI pipeline 🔴
No `.github/workflows`. Typecheck/lint/export run only when someone remembers. Vercel deploys whatever is pushed — a broken commit ships to the pilot URL.
**Fix:** one GitHub Actions workflow on push/PR: `tsc --noEmit` → `expo lint` → (once G1 lands) `jest`. ~30 minutes of work, permanent safety net.

### G3 — No error boundary / crash surface 🟠
No React error boundary anywhere. Any render-time exception white-screens the whole app with no recovery and no report. On a pilot user's phone this is a silent death.
**Fix:** Expo Router supports per-route `ErrorBoundary` exports; add a root-level one with a "something went wrong — reload" screen (bilingual). Pair with a crash reporter (Sentry has a first-class Expo SDK) **before pilot**, or at minimum log to a Supabase `client_errors` table.

### G4 — Deep-linked screens have no auth guard 🟠
Only Home redirects to `/login`. Opening `/calendar`, `/vehicles`, `/settings` etc. while signed out renders a blank/broken screen (RLS protects the *data*, so this is UX not security — but on web, where URLs are shareable, blank screens will happen).
**Fix:** an auth gate in the root layout (or a shared `useRequireAuth` hook): if `!session && !isAuthLoading` → redirect to `/login`. One place, covers every screen.

### G5 — No offline / connection-failure behaviour 🟠
Every query assumes the network succeeds; most list screens set state from `data ?? []`, so a failed fetch looks like "no data" rather than "no connection". A detailing bay with bad WiFi will see empty calendars and think their bookings are gone.
**Fix (phased):** short term — distinguish error from empty in list screens (banner + retry). Long term (post-pilot) — proper offline cache (TanStack Query + persistence) if pilot feedback demands it. Don't build full offline-first now.

### G6 — Session claim runs only at business fetch 🟡
`claim_staff_membership()` fires once inside `BusinessProvider.fetchBusiness`. If an owner adds a staff email *while that user is already signed in*, the user must sign out/in (or the app must refetch) to gain access. Minor for the pilot, but undocumented.
**Fix:** call `refetch()` on app foreground (AppState listener), or document "sign out and back in" in the staff hint text.

### G7 — Supabase free-tier & backup posture unverified 🟡
Migrations are hand-run with no record of what's actually applied; there's no confirmation that PITR/backups are enabled on the project, and the SQL files are the only schema record.
**Fix:** (a) create a `schema_migrations` table (one insert line at the bottom of each migration file from 011 on); (b) verify backup settings in the Supabase dashboard; (c) confirm email-confirmation is ON in Auth settings (protects `claim_staff_membership` from email squatting — flagged in the bug audit, still needs the 30-second dashboard check).

### G8 — Web bundle ships all screens to everyone 🟢
Static export is fine for now (~30KB/route). No action; noted so nobody "optimizes" prematurely.

### G9 — `@expo/ui`, `expo-glass-effect`, `expo-symbols` unused beta deps 🟢
Installed by the template, imported nowhere. Dead weight and beta-version churn risk.
**Fix:** remove in the next housekeeping commit (`npm uninstall @expo/ui expo-glass-effect expo-symbols expo-device`) — verify with export after.

### G10 — Single `.env`, no staging environment 🟡
One Supabase project serves development and (soon) the pilot. Testing migration 011+ against live pilot data is how data gets lost.
**Fix before pilot:** second Supabase project ("staging"), `.env.staging`, and run every migration there first. Vercel preview deployments can point at staging via environment variables.

---

## 3. Debt register (known, accepted, don't re-litigate)

These are deliberate deferrals with an owner decision behind them — listed so they aren't re-discovered as "gaps" every audit:

- **Landed cost / FX dormant** until Niko's importer TRD (columns exist, unused).
- **Stock intelligence manual** (`sales_per_week` hand-entered) until real sales history exists.
- **Incoming-orders queue read-only** — fulfilment pipeline waits for importer TRD.
- **Multi-day jobs in month grid** render as repeated chips per day, not spanning bars — cosmetic upgrade later.
- **`payments` / `messages_log` tables** arrive with BOG/WhatsApp integrations, not before.
- **Phone testing via Expo Go** blocked by firewall on the dev machine — web preview at 375px is the stand-in; real-device pass required before pilot (see Phase D).

---

## 4. Roadmap

Order matters: hardening (A) protects everything after it; features (B) finish the user-facing surface; integrations (C) are last per the standing decision; pilot prep (D) gates launch.

### Phase A — Hardening (do first, ~2–3 sessions)
| # | Item | Gap |
|---|---|---|
| A1 | Commit the July bug-audit fixes; **run migration 010** in Supabase | — |
| A2 | CI: GitHub Actions (typecheck + lint + export) | G2 |
| A3 | Jest + unit tests for `inventory`, `consumption` (mocked rpc), `calendarDate`, `number`, `jobStatus` | G1 |
| A4 | Root error boundary + bilingual crash screen | G3 |
| A5 | Auth gate for all screens (root-layout redirect) | G4 |
| A6 | Error-vs-empty states on list screens (banner + retry) | G5 |
| A7 | Housekeeping: remove unused beta deps; `schema_migrations` table; verify Supabase backups + email-confirmation ON | G7, G9 |
| A8 | **Migration 011**: integrity constraints, customer_vehicles both-sides RLS fix, drop supplier PO-update policy, all missing indexes (draft spec in [audits/security-data-integrity.md](audits/security-data-integrity.md)) | S1, S2, D1–D5, P1 |
| A9 | Intake speed R1–R3: default From = now (rounded), date/time quick chips, numeric keyboard — gets Flow 1 under 20s ([audits/intake-speed.md](audits/intake-speed.md)) | intake <30s req |
| A10 | Accessibility quick pass: hitSlop ≥44pt on steppers/×/nav arrows, accessibilityLabels on icon buttons, darken light-theme `muted` token; `po.expectedDeliveryShort` key replaces the `.split(" (")` hack ([audits/accessibility.md](audits/accessibility.md), [audits/localization.md](audits/localization.md) L2) | a11y baseline |

### Phase B — Feature backlog (Niko-approved order, unchanged)
| # | Item | Notes |
|---|---|---|
| B1 | Photo capture + before/after gallery on vehicle profile | Supabase Storage now, R2 seam for Phase 2 |
| B2 | Rebooking/maintenance reminders (BRD §5.1) | WhatsApp seam |
| B3 | Public booking link (`/book/shopname`, BK-01) | First unauthenticated surface — needs G4's gate to distinguish public routes; rate-limiting via Edge Function |
| B4 | Deposit collection at booking | BOG seam |
| B5 | Capacity limits | **Blocked on product definition from Niko** (bays? staff? concurrent jobs?) |
| B6 | Push notifications (owner: low stock/overdue/no-show) | Customer-facing ones carry **confirm/reject that updates job status** (Niko requirement); needs `expo-notifications` + a device-tokens table |
| B7 | Downloadable receipt (PDF) | |
| B8 | Repeat-last-order shortcut | Feeds the <30s intake goal |

### Phase C — Integrations (end-phase by design)
| # | Item | Prerequisite |
|---|---|---|
| C1 | Supabase Edge Functions skeleton + secrets setup | — |
| C2 | WhatsApp Business Cloud API (send via Edge Function, `messages_log` table, template approval with Meta) | Open item #3: WhatsApp entity ownership |
| C3 | BOG payments (payment links + webhook receiver, `payments` table) | Open item #2: BOG merchant account paperwork — **start this paperwork now, it's the long pole** |
| C4 | NBG exchange-rate fetch | Only needed when importer TRD lands |

### Phase D — Pilot readiness (gates launch)
| # | Item | Gap |
|---|---|---|
| D1 | Staging Supabase project + env split | G10 |
| D2 | Crash reporting (Sentry) wired to production | G3 |
| D3 | Real-device pass: EAS build or Expo Go on unblocked network, iOS + Android — includes the Georgian-layout 375px sweep (L1), Android `ka-GE` date check (L4), font-scaling + web tab-through (A5/A6), and the stopwatch intake measurement (audits/intake-speed.md protocol) | debt register + audits |
| D3b | **Supabase Pro upgrade before pilot** (backups/PITR — see [audits/cost-scaling.md](audits/cost-scaling.md)); Niko decisions: open vs. invite-only signup (S4), Vercel Hobby→Pro | G7, G10 |
| D4 | Pilot onboarding: seed Carbros' real services/products/staff; walkthrough with 1–2 network detailers | Open item #4 |
| D5 | Runbook: how to run a migration, restore a backup, read client_errors/Sentry | G7 |

### Parallel track (not code)
- **Start BOG merchant account paperwork** (businessonline.ge) — weeks of lead time, blocks C3.
- **Resolve WhatsApp Business entity ownership** — blocks C2 template approval.
- **Importer TRD** (Niko, in Cowork) — unblocks landed cost, fulfilment pipeline, NBG.

---

## 5. Definition of "pilot-ready"

All of Phase A · B1–B4 + B6–B8 (B5 if defined) · C1–C3 · all of Phase D.
When every box above is checked, ship to Carbros first, then the network detailers.
