# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Git is initialized, pushed to [github.com/nikokinkriashvili-bit/bookingapp](https://github.com/nikokinkriashvili-bit/bookingapp), and the Expo project is scaffolded (downgraded to SDK 54 to match the Expo Go App Store release, Expo Router, TypeScript, `src/app` directory structure). A Supabase project is connected: client lives at `src/lib/supabase.ts`, credentials in `.env` (gitignored, see `.env.example` for the required keys). No Supabase tables/auth screens exist yet — that's the next roadmap step. No features are built yet; this is a blank app.

Commands:
- `npm start` — start the Expo dev server (scan the QR code with Expo Go to preview on a phone)
- `npm run android` / `npm run ios` / `npm run web` — start targeting a specific platform
- `npm run lint` — run `expo lint`

See [AGENTS.md](AGENTS.md) for the Expo SDK version note (docs.expo.dev/versions/v57.0.0/ — check versioned docs, not general docs, since APIs have changed since SDK 57).

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

## Build roadmap (intended order)

1. Scaffold Expo project + Supabase project + business-owner auth
2. Onboarding flow: business type → working hours → services
3. Supabase tables from the data model above, with per-business RLS
4. Job intake screen: manual plate/vehicle entry, service multi-select, slot assignment
5. Whiteboard: kanban board, drag-and-drop, realtime sync via Supabase Realtime
6. WhatsApp integration: Edge Function sending template messages on the 5 in-scope trigger events
7. BOG payment integration: Edge Function to generate payment links + webhook receiver
8. Basic day/week calendar view (same underlying job data as the whiteboard)
9. Internal pilot with Carbros + 1-2 network detailers
10. Phase 2 kickoff (photo/video, tech inspection reminders) — only after MVP is validated

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
