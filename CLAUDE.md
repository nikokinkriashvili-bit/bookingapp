# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status (updated July 2026)

Git is initialized and pushed to [github.com/nikokinkriashvili-bit/bookingapp](https://github.com/nikokinkriashvili-bit/bookingapp). The Expo project is scaffolded (SDK 54 to match the Expo Go App Store release, Expo Router, TypeScript, `src/app` directory structure). Supabase is connected (`src/lib/supabase.ts`, credentials in `.env`, gitignored — see `.env.example`) and the web build deploys to Vercel at bookingapp-beta-two.vercel.app.

**Built and working** (roadmap steps 1–5, with step 5 replaced — see Confirmed product decisions):
- Email/password auth for business owners (`login.tsx`, `sign-up.tsx`, `AuthProvider`)
- 3-step onboarding: business type → working hours → services. The 8 business types and default service templates live in Supabase catalog tables (`business_type_catalog`, `default_service_templates`), seeded from the BRD, not hardcoded.
- Data model: migrations `supabase/001`–`005` (all run in the Supabase SQL Editor) create `businesses`, `services`, catalog tables, `vehicles`, `customers`, `customer_vehicles`, `jobs` (with `scheduled_slot` + `scheduled_end`), all with per-business RLS. **Not yet created:** `staff`, `payments`, `messages_log` — they arrive with their features.
- Job intake: plate entry, vehicle/customer creation, service multi-select, from/to scheduling, editable price (auto-suggested from selected services until manually edited)
- Month/day calendar with status+service filters and GEL period summaries (replaces the kanban whiteboard)
- Order edit screen (`jobs/[id]/edit.tsx`), home dashboard stat balloons (`DashboardStats.tsx`)

- Vehicle & Customer CRM screens (TRD §5.4): `vehicles/` and `customers/` list + profile screens, editable details, service history, "new order for this vehicle" fast path
- Bilingual UI: all screens render through `src/lib/i18n.ts` + `LanguageProvider` (ქარ/EN toggle on home, Georgian default, persisted). **Gap:** business-type/service-template names in the Supabase catalog tables are English-only — localizing them is a pending data migration.
- Design system: tokens in `src/lib/theme.ts` (light + dark palettes), documented in DESIGN.md. Every screen resolves colors via `useThemeColors()` (`ThemeProvider`, follows the OS light/dark setting — no in-app toggle) instead of a static import; job/stock/PO status colors are tinted badges (`statusTone`/`stockStatusTone`/`poStatusTone` in `jobStatus.ts`/`inventory.ts`), never solid-fill-with-white-text. Form fields get a visible label via `components/FieldLabel.tsx` (search boxes and the intake plate field stay placeholder-only by design). Bottom-tab navigation (`src/app/(tabs)/`): Home, Calendar, +New (job intake, route `/jobs`), Inventory, Settings (owner-only, hidden tab for staff) — 5 tabs confirmed with Niko (CRM/vehicles/customers didn't make the cut, reached via Link from Home instead, per BRD `home.vehicles`/`home.customers`). Auth, onboarding, and CRM screens stay outside the tab group. Per `BookingApp_UXUI_Guidance_v1.md` — this closes out that doc's remaining item.
- Integration seams: `src/lib/integrations.ts` has inert `sendWhatsAppMessage` / `generateBogPaymentLink` placeholders with `TODO(TRD §…)` markers, called from job creation and status changes — these become real at roadmap steps 9–10.

**Not built yet:** WhatsApp integration, BOG payments, post-onboarding business settings (edit hours/services). Migrations must be run manually in the Supabase SQL Editor — Claude has no DB access.

**Testing surfaces:** localhost web preview + Vercel. Phone testing via Expo Go has been blocked by firewall/tunnel issues on this machine — design mobile-first and verify at ~375px width in the web preview.

Commands:
- `npm start` — start the Expo dev server (scan the QR code with Expo Go to preview on a phone)
- `npm run android` / `npm run ios` / `npm run web` — start targeting a specific platform
- `npm run lint` — run `expo lint`

See [AGENTS.md](AGENTS.md) for the Expo SDK version note (docs.expo.dev/versions/v57.0.0/ — check versioned docs, not general docs, since APIs have changed since SDK 57).

## Design Context

[PRODUCT.md](PRODUCT.md) captures the strategic design context (users, product purpose, brand personality, anti-references, design principles, accessibility baseline). Read it before making UI/UX decisions.

When building or reworking UI, apply the `frontend-design` skill's principles (if not registered in the session, its SKILL.md is readable at `~/.claude/plugins/marketplaces/claude-plugins-official/plugins/frontend-design/skills/frontend-design/SKILL.md`): deliberate palette/type choices grounded in the subject, one signature element, restraint elsewhere, copy written from the user's side of the screen. Goal (confirmed with Niko): one consistent, considered visual language across the whole app — new screens follow it and already-built screens (onboarding, intake, calendar, dashboard) get brought in line, not a patchwork redesigned later.

[DESIGN.md](DESIGN.md) documents the visual system: tokens live in `src/lib/theme.ts` (brand blue derived from the Georgian plate band; the `PlateChip` component is the signature element) — screens reference tokens, never hardcoded palette hex. The `impeccable` design skill payload lives at `.claude/skills/impeccable/` (gitignored; reinstall via `npx impeccable install`).

## What this project is

A booking/scheduling app for car detailing businesses in Georgia (the country), built for Carbros' own detailing operation and a small pilot group of Carbros-network detailers — not a cold public launch. **The standing spec is `BookingApp_TRD_v2_FullScope.md`** (supersedes v1; full BRD scope, phased). Read it in full before implementation work. Note it slightly trails reality: its roadmap items 6–9 are built, and the stock-management module (built at Niko's explicit direction, see roadmap below) isn't reflected in it. Where v2 and this file disagree on build status, this file wins; on product intent, v2 wins. The InvoiceGE BRD (`InvoiceGE_BRD_v4_final.docx`) is background context. A separate importer-module TRD is being drafted by Niko (in Cowork) for the wholesaler/importer side detail.

## Tech stack (decided)

| Layer | Choice |
|---|---|
| Client | Expo (React Native) + Expo Router — single codebase targets iOS, Android, and web |
| Backend | Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) |
| Media storage | Supabase Storage for MVP; migrate to Cloudflare R2 in Phase 2 (photo/video plugin) |
| Hosting | Vercel (web) + EAS Build (iOS/Android) |
| Messaging | WhatsApp Business Cloud API (Meta, direct integration — no BSP middleman) |
| Payments | Bank of Georgia Online Payment API (`api.bog.ge`, OAuth 2.0 + JWT) |

Architecture: everything routes through Supabase as the single source of truth. Edge Functions handle outbound WhatsApp sends and BOG webhook receipts so the client never talks to Meta or BOG directly (API keys stay server-side).

## MVP scope discipline

The TRD deliberately cuts scope vs. the full BRD (Section 6 lists everything deferred to Phase 2/3: photo/video system, tech inspection reminders, Google Calendar/Gmail/iCal sync, Stock Intelligence, Partner Marketplace, Personal Mode). When implementing, do not pull forward Phase 2/3 features even if they seem easy to add alongside an MVP feature — the phasing is intentional (e.g. Stock Intelligence structurally cannot work until real purchase-cycle data exists from a running MVP).

Vehicle plate lookup has no confirmed public API for the Georgian government registry (TRD Risk #1). Manual plate/vehicle entry is the permanent primary path for MVP, not a temporary stub — do not block features on a future lookup API materializing.

## Data model (MVP core tables)

`businesses`, `staff`, `services`, `vehicles` (plate number is the effective primary key), `customers`, `customer_vehicles` (many-to-many join, supports multiple owners per car), `jobs` (core booking record, maps to whiteboard/kanban cards, status enum: Booked/InProgress/AwaitingCollection/Complete/Paid/Cancelled), `payments` (updated via BOG webhook), `messages_log` (WhatsApp audit trail).

Row-level security should be scoped per business — this is a multi-tenant data model from the start, not single-tenant with multi-tenancy bolted on later.

## Confirmed product decisions (do not revert)

These deliberately diverge from the original TRD text. They were made with Niko after hands-on testing — treat them as the spec, don't "correct" them back toward the TRD:

- **Calendar replaces the kanban whiteboard.** The TRD's drag-and-drop kanban (step 5) was built, tested, and rejected. The month-grid + day-list calendar with status/service filters is the scheduling surface. The day view is a chronological card list, **not** an hour-ruler grid (also explicitly rejected) — detailing jobs run from hours to days, so jobs have an explicit from/to range instead of a slot on a ruler.
- **Summary stats show GEL amounts, not counts** (period summaries and dashboard).
- **Order edit screen** exists at `jobs/[id]/edit.tsx`; the quick status-change modal on the day view stays one tap, with "Edit order" one tap further.
- **Home dashboard stat balloons**, including visually muted "Coming soon" placeholders for the Phase 2/3 logistics/material-purchases module — placeholders are intentional, not broken.

## Build roadmap (revised order, July 2026)

**Approach change (confirmed with Niko):** build the full platform experience — all screens and flows working with real data — *before* touching external integrations. WhatsApp, BOG, and NBG exchange-rate fetch all move to the end. Where they plug in, add clearly marked seams — placeholder functions/UI states with `TODO` comments referencing the TRD/BRD section — not working stubs (see `src/lib/integrations.ts`).

**Second scope change (confirmed with Niko, July 2026):** the BRD §6/§17 stock-management module is pulled forward from Phase 3 into the current build — Niko explicitly chose to build the whole platform including both inventory tiers (importer + shop) and landed cost before integrations. This supersedes the TRD's "don't pull Phase 2/3 forward" for this module specifically; the *intelligence* parts that need real sales history (auto velocity, seasonal multipliers) still wait for data — velocity is a manual per-product field for now.

1. ~~Scaffold + Supabase + business-owner auth~~ ✅
2. ~~Onboarding flow~~ ✅
3. ~~Data model with per-business RLS~~ ✅ (`staff`, `payments`, `messages_log` deferred to their features)
4. ~~Job intake screen~~ ✅
5. ~~Scheduling surface~~ ✅ (calendar, not kanban — see Confirmed product decisions)
6. ~~Vehicle & Customer CRM screens~~ ✅
7. ~~Bilingual UI foundation + backfill~~ ✅ (catalog table names still English-only — pending data migration)
8. ~~Design token system + consistency pass + integration seams~~ ✅ (see DESIGN.md)
9. **Stock management (BRD §6/§17), in slices:**
   a. ~~Foundation: migration 006 (suppliers/products/POs + RLS incl. linked-supplier visibility), suppliers & products CRUD, inventory dashboard with reorder statuses~~ ✅ (built; migration 006 must be run in Supabase)
   b. ~~Reorder engine + draft POs + receive-stock flow~~ ✅ (suggested qty respects supplier MOQ; one draft PO per supplier, merged on repeat taps; receive adds item qtys to product stock)
   c. ~~Landed cost / COGS calculator~~ **deferred (confirmed with Niko, July 2026):** POs are quantity-first for now — all internal operations are GEL, and FX/landed cost only matters for the importer side, which Niko will spec in a separate importer-module TRD (drafting it in Cowork). The nullable landed-cost columns in migration 006 stay dormant until then; don't build against them.
   d. ~~Shop tier: product consumption per job + §6.6 loop~~ ✅ (migration 007: job_products, business_directory view, linked-supplier RLS fix via security-definer function, name/SKU snapshot on PO items. Stock adjusts when consumption is logged, NOT on job status change — deliberate, prevents double-counting. Incoming-orders queue is read-only; fulfilment pipeline states wait for Niko's importer TRD.)
10. ~~Remaining gaps: business settings screen + catalog Georgian names migration~~ ✅ (migration 008 adds `label_ka`/`name_ka`; onboarding seeds service names in the active language; `/settings` edits name/hours/services; language toggle also on login)
11. **User-feedback backlog (July 2026, Niko approved building in this order):**
    a. ~~Staff accounts + job assignment~~ ✅ (migration 009: staff table, member-based RLS rewrite, email-claim linking; assignee picker on intake/edit; assignee on day cards; staff calendar filter; staff roster in /settings, owner-only)
    b. Photo capture + before/after gallery on vehicle profile (storage seam: Supabase Storage now, R2 later)
    c. Rebooking/maintenance reminders (BRD §5.1 schedule) — WhatsApp seam
    d. Public booking link (invoicege.ge/shopname style, BK-01)
    e. Deposit collection at booking (BOG seam)
    f. Capacity limits (needs product definition from Niko: bays? staff? max concurrent jobs?)
    g. Push notifications for owner (low stock, overdue, no-show) — **Niko requirement: customer-facing notifications carry confirm/reject feedback that updates the job status** (e.g. booking confirmation → customer confirms or rejects → job status flips accordingly; applies to WhatsApp messages when wired)
    h. Simple downloadable receipt (PDF)
    i. Repeat-last-order shortcut
12. WhatsApp integration · 13. BOG payments · 14. NBG rate fetch (all Phase 1b, per TRD v2 seam strategy)
15. Internal pilot with Carbros + network detailers

## Non-functional constraints

- **Intake speed:** plate/vehicle entry to job-on-schedule must be achievable in under 30 seconds — this drives UI decisions (e.g. single auto-capitalised plate field), don't add friction to this flow.
- **Mobile-first:** design every screen for phone viewport first; web is a secondary layout of the same components (Expo Router supports this natively).
- **Bilingual from day one:** UI strings and WhatsApp templates need both Georgian and English — do not hardcode English-only strings, since this isn't a "localize later" item per the BRD.

## Open items that block or affect build decisions

These are unresolved as of the TRD and may change scope once answered — check with Niko if a task depends on one of these:
1. Georgian vehicle plate lookup API — no public API confirmed; may remain permanently manual-entry-only.
2. Bank of Georgia merchant account (businessonline.ge) is a prerequisite for testing payment integration end-to-end — a business/paperwork step, not something buildable in code.
3. Ownership of WhatsApp Business verification (Niko's entity vs. Carbros' existing entity) is unconfirmed.
4. Specific pilot business name(s)/detailer(s) for tailoring onboarding defaults are unconfirmed.
