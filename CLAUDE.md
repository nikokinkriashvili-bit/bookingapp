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

**Not built yet:** Vehicle & Customer CRM screens (TRD §5.4), bilingual UI (Georgian/English), WhatsApp integration, BOG payments. Migrations must be run manually in the Supabase SQL Editor — Claude has no DB access.

**Testing surfaces:** localhost web preview + Vercel. Phone testing via Expo Go has been blocked by firewall/tunnel issues on this machine — design mobile-first and verify at ~375px width in the web preview.

Commands:
- `npm start` — start the Expo dev server (scan the QR code with Expo Go to preview on a phone)
- `npm run android` / `npm run ios` / `npm run web` — start targeting a specific platform
- `npm run lint` — run `expo lint`

See [AGENTS.md](AGENTS.md) for the Expo SDK version note (docs.expo.dev/versions/v57.0.0/ — check versioned docs, not general docs, since APIs have changed since SDK 57).

## Design Context

[PRODUCT.md](PRODUCT.md) captures the strategic design context (users, product purpose, brand personality, anti-references, design principles, accessibility baseline). Read it before making UI/UX decisions.

When building or reworking UI, apply the `frontend-design` skill's principles (if not registered in the session, its SKILL.md is readable at `~/.claude/plugins/marketplaces/claude-plugins-official/plugins/frontend-design/skills/frontend-design/SKILL.md`): deliberate palette/type choices grounded in the subject, one signature element, restraint elsewhere, copy written from the user's side of the screen. Goal (confirmed with Niko): one consistent, considered visual language across the whole app — new screens follow it and already-built screens (onboarding, intake, calendar, dashboard) get brought in line, not a patchwork redesigned later.

The `impeccable` design skill payload lives at `.claude/skills/impeccable/` (gitignored; reinstall via `npx impeccable install`). A `DESIGN.md` (visual system: colors, typography, components) hasn't been generated yet — produce one once the design system settles.

## What this project is

A booking/scheduling app for car detailing businesses in Georgia (the country), built for Carbros' own detailing operation and a small pilot group of Carbros-network detailers — not a cold public launch. The TRD (`BookingApp_TRD_v1.md`) is derived from a separate BRD (Business Requirements Document, not in this repo) and is written to be handed to Claude Code directly as the build spec. Read it in full before starting implementation work; it is short and the source of truth for scope decisions.

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

**Approach change (confirmed with Niko):** build the full MVP app experience — all core screens and flows working with real data — *before* touching external integrations. WhatsApp and BOG move to the end. Where they will eventually plug in (e.g. "send WhatsApp confirmation" after job creation, "generate payment link" on completion), add clearly marked seams — placeholder functions/UI states with `TODO` comments referencing the TRD section — not working stubs.

1. ~~Scaffold + Supabase + business-owner auth~~ ✅
2. ~~Onboarding flow~~ ✅
3. ~~Supabase tables with per-business RLS~~ ✅ (`staff`, `payments`, `messages_log` deferred to their features)
4. ~~Job intake screen~~ ✅
5. ~~Scheduling surface~~ ✅ (calendar, not kanban — see Confirmed product decisions)
6. Vehicle & Customer CRM screens (TRD §5.4): vehicle profile with service history, customer profile with visit count/total spend
7. Bilingual UI (Georgian + English): set up the i18n string pattern, backfill existing screens, apply to everything new
8. Remaining MVP-scope gaps vs. the TRD + design consistency pass over existing screens
9. WhatsApp integration: Edge Function sending template messages on the in-scope trigger events
10. BOG payment integration: Edge Function to generate payment links + webhook receiver
11. Internal pilot with Carbros + 1-2 network detailers
12. Phase 2 kickoff (photo/video, tech inspection reminders) — only after MVP is validated

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
