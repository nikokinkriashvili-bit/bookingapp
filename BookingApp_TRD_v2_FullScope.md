# Booking App — Technical Requirements Document (TRD)
**Version 2.0 | July 2026 | Full BRD scope, phased**
**Supersedes: BookingApp_TRD_v1.md (MVP-only)**

---

## 1. Document Purpose & Change Log

v1 covered MVP scope only. Since then, real build work has started and a few product decisions were made in practice, not just on paper. This version:
- Extends coverage to the **full BRD** (all 12 original sections, all phases), so the whole vision has a technical spec, not just what's being built right now.
- Still recommends **building MVP first** — this doc phases the work, it doesn't change the build order.
- Incorporates real decisions already made during build:
  - Kanban whiteboard (BRD §4.1) replaced with a **month-grid + day-list calendar** with status/service filters and GEL period summaries — user-tested, kept.
  - **Integrations moved to the end of the build**, not interleaved. WhatsApp, BOG, Google Calendar, Gmail, Cloudflare R2 are all built as clearly-marked placeholder seams first, wired up for real only after the full app UX exists.
  - **Design system approach**: a consistent design language (via the design-taste-frontend skill) applied across all screens as they're built, and retrofitted to already-built screens, so there's no late-stage redesign pass.
  - **Bilingual (Georgian/English) UI** structured from the start of remaining screens, not bolted on at the end.

This document is meant to be handed to Claude Code (any model) as the standing project spec, alongside `CLAUDE.md` and the original BRD.

---

## 2. Product Scope & Phasing

| Phase | Contents | Status |
|---|---|---|
| **Phase 1 — MVP app, no live integrations** | Onboarding, job intake, calendar/schedule, vehicle & customer CRM, core UI fully designed and bilingual. Integration seams placeholder-only. | In progress |
| **Phase 1b — Integrations** | Wire up WhatsApp Cloud API, BOG payments, into the seams built in Phase 1. | Not started |
| **Phase 2** | Photo & video system, tech inspection reminders, Google Calendar/Gmail/iCal sync. | Not started |
| **Phase 3** | CarPro Stock Intelligence, Partner Marketplace, Personal Mode, plugin-based monetisation gating. | Not started |

The reasoning for this order stays the same as v1: prove the core loop first, and Stock Intelligence specifically can't be built usefully until real purchase-to-purchase cycle data exists (BRD §9.4). What's new in v2 is the **integration-last** approach: even within Phase 1, WhatsApp/BOG are the last things wired up, so the entire user-facing app can be reviewed, tested, and design-polished without waiting on external API approvals (Meta template review, BOG merchant account) that are outside your control.

---

## 3. Tech Stack (confirmed, as actually implemented)

| Layer | Choice | Status |
|---|---|---|
| Client | Expo SDK 54 + Expo Router + TypeScript | Live — deployed to Vercel, pushed to GitHub |
| Backend | Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) | Live — auth, migrations 001–005 applied |
| Hosting (web) | Vercel | Live (bookingapp-beta-two.vercel.app) |
| Hosting (mobile builds) | EAS Build | Not yet used — needed when moving beyond Expo Go preview |
| Media storage (Phase 2) | Cloudflare R2 | Not yet provisioned |
| Messaging | WhatsApp Business Cloud API (Meta, direct) | Not yet integrated — seam only |
| Payments | Bank of Georgia Online Payment API (`api.bog.ge`) | Not yet integrated — seam only |
| Calendar/email (Phase 2) | Google Calendar & Gmail OAuth 2.0, iCal feed | Not yet integrated |
| Design | design-taste-frontend skill applied across all screens | Applied going forward + retrofit pass |
| Version control | Git + GitHub | Live |

---

## 4. System Architecture (updated)

```
┌───────────────────────────────────────────┐
│  Expo App (iOS / Android / Web)             │
│  - Onboarding, Job Intake, Calendar          │
│  - Vehicle & Customer CRM                    │
│  - [Phase 2] Photo/Video capture             │
│  - [Phase 3] Stock dashboard, Marketplace,   │
│    Personal Mode                              │
└───────────────┬───────────────────────────┘
                │
                ▼
┌───────────────────────────────────────────┐
│  Supabase (Postgres, Auth, Storage,          │
│  Realtime, Edge Functions, RLS per business) │
└───────┬─────────────┬──────────────┬────────┘
        │              │               │
        ▼              ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌─────────────────────┐
│ WhatsApp      │ │ BOG Payment   │ │ Cloudflare R2 (Ph.2) │
│ Cloud API     │ │ API           │ │ Google Cal/Gmail(Ph.2)│
│ [seam only]   │ │ [seam only]   │ │ [not started]         │
└──────────────┘ └──────────────┘ └─────────────────────┘
```

All external integrations sit behind Edge Functions, called from clearly marked placeholder functions in the client (e.g. `sendWhatsAppNotification()`, `generatePaymentLink()`) that currently no-op or show a "coming soon" UI state, tagged with `// TODO(TRD §7.x)` comments pointing to the relevant integration spec.

---

## 5. Full Data Model

Tables already live (migrations 001–005): `businesses`, `services`, `business_type_catalog`, `default_service_templates`, `vehicles`, `customers`, `customer_vehicles`, `jobs` (incl. `scheduled_end`).

Tables still to add, by phase:

| Phase | Table | Purpose |
|---|---|---|
| 1b | `staff` | Multi-user businesses (Team tier), role permissions |
| 1b | `payments` | BOG payment link + webhook status per job |
| 1b | `messages_log` | WhatsApp send/receive audit trail |
| 2 | `photo_media` | Before/after photos, walkaround videos, R2 object keys, panel labels, watermark metadata |
| 2 | `tech_inspection_reminders` | Expiry dates per vehicle, reminder send log |
| 2 | `calendar_connections` | OAuth tokens per staff member for Google Calendar |
| 2 | `gmail_parsing_rules` | Keyword/intent config for booking request detection |
| 3 | `stock_products` | Product catalog per business (CarPro items) |
| 3 | `purchase_history` | carbros.pro order history feed, per product per business |
| 3 | `job_type_consumption` | Consumption weight per service type per product |
| 3 | `partner_partners`, `partner_referrals` | Marketplace partner directory + referral tracking |
| 3 | `personal_tasks` | Personal Mode appointments (no business_id, user-owned only) |
| 3 | `plan_entitlements` | Which plugins/tiers are active per business, for feature gating |

---

## 6. Feature Specs by BRD Section

### 6.1 Onboarding (BRD §2) — Phase 1, built
Business type selection, working hours, service list review, WhatsApp number capture (stored, not yet connected). Calendar connection step and plugin activation step deferred — no plugins/integrations exist yet.

### 6.2 Job Intake (BRD §3) — Phase 1, built
Manual plate entry, vehicle/customer creation, service multi-select, scheduling, editable price. Government plate-lookup API remains unresolved (see Risk #1) — manual entry is the durable primary path, not a temporary stopgap.

### 6.3 Booking & Schedule (BRD §4) — Phase 1, built (deviated by design)
Kanban whiteboard replaced with calendar (month grid + day list, status/service filters, GEL period summaries) after user testing. This satisfies the underlying job — "see and manage today's/this week's jobs at a glance" — better for this user's workflow than the original whiteboard metaphor. Capacity management (BRD §4.4, blocking overbooked slots) not yet implemented — add to Phase 1 remaining work.

### 6.4 Vehicle & Customer CRM (BRD §5) — Phase 1, in progress
Vehicle profile screen (plate, make/model/year/colour, full service history) and customer profile screen (name, phone, linked vehicles, total spend, visit count, communication log) — not yet built as dedicated screens; data exists from intake but has no browsing/detail UI yet. Paint correction / ceramic coating detailed logs and tech inspection tracking are Phase 2 (they depend on Photo/Video and Tech Inspection plugins respectively).

### 6.5 Photo & Video System (BRD §6) — Phase 2
Drop-off walkaround video, before/after photos by panel, auto-watermarking, Cloudflare R2 storage, customer time-limited links, social content export. Full spec unchanged from BRD — no build started.

### 6.6 Communication & Payment (BRD §7) — Phase 1b (seams in Phase 1, live wiring in 1b)
Six WhatsApp trigger events (booking confirmed, job started, job complete, payment request, payment confirmed, tech inspection reminder — last one is Phase 2 since it depends on the Tech Inspection plugin). BOG payment link generation + webhook reconciliation. rs.ge automatic invoice submission deferred until InvoiceGE's receiving side is ready — start with a simple PDF invoice.

### 6.7 Partner Marketplace (BRD §8) — Phase 3
Unchanged from BRD. Needs a vetted partner list before any technical work is useful — that's a business development task, not a coding one, and should start independently of the build timeline.

### 6.8 Stock Intelligence (BRD §9) — Phase 3
Unchanged from BRD. Cannot function without real purchase-to-purchase cycle data from live detailers — technically buildable earlier, but would ship broken/empty. Needs the carbros.pro purchase history feed as a data source (integration work with your existing WooCommerce/carbros.pro site, not just the new app).

### 6.9 Integration Layer (BRD §10) — Phase 2
Google Calendar two-way sync, Gmail booking request parsing, Apple Calendar/Outlook iCal feed. Standard OAuth patterns, low technical risk, mostly a matter of build time.

### 6.10 Personal Mode (BRD §11) — Phase 3
Unchanged from BRD. Low technical complexity (subset of existing scheduling with no business-specific tables), but low priority until the core business product is proven.

### 6.11 Monetisation (BRD §12) — Phase 3 (mechanism), ongoing (pricing)
Plugin/tier gating requires the `plan_entitlements` table and feature-flag checks throughout the app. Recommend building this mechanism in Phase 3 alongside the first paid plugin (likely Photo & Video or Vehicle CRM, since those are Phase 2 features that would naturally become the first paid unlocks). Pricing itself (BRD §12.1–12.2 tables) is a business decision, not a technical one — no changes needed to the BRD's numbers unless Niko revises them.

---

## 7. Design System & Localization

- All new screens built using the design-taste-frontend skill's principles for visual consistency; already-built screens (onboarding, intake, calendar, dashboard) get a retrofit pass so the whole app reads as one product, not a patchwork.
- Bilingual (Georgian/English) support structured now via a proper i18n pattern (string keys, not hardcoded text), applied going forward and backfilled onto existing screens — per BRD §7.1's requirement that WhatsApp templates and UI both need Georgian, this is cheaper to do now than after every screen exists.

---

## 8. Integration Seam Strategy

Every point where the app will eventually call an external service (WhatsApp, BOG, Google, Gmail, R2) is being built now as a clearly marked placeholder: a named function or UI state with a `TODO(TRD §x.x)` comment, so Phase 1b/2 work is "fill in this function" rather than "figure out where this goes." This lets the full app UX be built, tested, and refined without blocking on external approvals (Meta business verification, BOG merchant account) that run on their own timelines outside this project.

---

## 9. Non-Functional Requirements

- **Intake speed:** under 30 seconds, plate to job-on-schedule (BRD §3.1) — unchanged, already the design basis for the intake screen.
- **Mobile-first, responsive to web:** unchanged from v1, Expo Router handles both.
- **Bilingual:** Georgian + English from Phase 1, per Section 7 above.
- **Security:** Supabase Row-Level Security scoped per business on every table; Personal Mode tasks (Phase 3) scoped per user instead, with no business_id.
- **Data retention:** photo/video media (Phase 2) defaults to 12-month retention per BRD §6.4, configurable per plan.
- **Compliance:** rs.ge tax submission deferred to when InvoiceGE integration is ready; no other compliance requirements currently specified.

---

## 10. Risks & Open Items (carried forward + new)

### Risk #1 (unresolved): No confirmed public API for Georgian vehicle plate lookup
Unchanged from v1 — still needs direct investigation (rs.ge, Ministry of Internal Affairs, or a private data broker). Manual entry remains the durable primary path in the meantime.

### Risk #2: BOG merchant account is a prerequisite
Needs Niko to open a Bank of Georgia merchant account via businessonline.ge before Phase 1b payment work can be tested end-to-end. Not blocking Phase 1 (app-only) work.

### Risk #3: WhatsApp template approval timeline
Meta review can take days to weeks — start business verification and template submission now, in parallel with Phase 1 build, so it's ready by the time Phase 1b starts.

### Risk #4 (new): Stock Intelligence needs a live carbros.pro data feed
BRD §9.2 requires purchase history from carbros.pro as a core signal. This is a new integration between the Booking App and the existing WooCommerce store (carbros.pro), not covered by any existing plugin or documented API on the carbros.pro side yet. Needs its own technical investigation before Phase 3 planning finalizes — likely a WooCommerce REST API integration or a custom endpoint added to carbros.pro's `functions.php`.

### Risk #5 (new): App Store / Play Store review timelines
Not relevant while testing via Expo Go, but once EAS builds are submitted for real distribution, Apple's review in particular can take days and reject for policy reasons unrelated to code quality (e.g. payment flow policies, since BOG payment links inside an app can trigger extra scrutiny). Budget time for this before any planned public launch date.

---

## 11. Build Roadmap (updated)

**Phase 1 — App complete, no live integrations**
1. ✅ Scaffold + auth (Expo, Supabase, Vercel, GitHub)
2. ✅ Onboarding
3. ✅ Core data model (businesses, services, vehicles, customers, jobs)
4. ✅ Job intake
5. ✅ Calendar/schedule (replacing kanban)
6. ◻ Vehicle & Customer CRM screens
7. ◻ Bilingual UI pass (new + retrofit)
8. ◻ Design system consistency pass (new + retrofit)
9. ◻ Integration placeholder seams for WhatsApp, BOG (UI states + TODO-marked functions)
10. ◻ Capacity management (BRD §4.4)

**Phase 1b — Wire up integrations**
11. WhatsApp Cloud API (business verification, templates, Edge Function, `messages_log`)
12. BOG payment API (merchant account, payment link generation, webhook, `payments` table)
13. Simple PDF invoice generation

**Phase 2**
14. Photo & video system (R2 storage, walkaround video, before/after, watermarking, social export)
15. Tech inspection reminders
16. Google Calendar two-way sync
17. Gmail booking request parsing
18. Apple Calendar/Outlook iCal feed

**Phase 3**
19. carbros.pro purchase history integration (prerequisite for Stock Intelligence)
20. CarPro Stock Intelligence (pattern learning, Monday dashboard, one-tap reorder)
21. Partner Marketplace (needs vetted partner list — business task in parallel)
22. Personal Mode
23. Plugin/tier monetisation gating (`plan_entitlements`, feature flags)

---

## 12. Open Decisions Needed From Niko

1. Resolution on Risk #1 (plate lookup) — still open from v1.
2. Confirm Bank of Georgia merchant account status/timeline.
3. Confirm who owns WhatsApp Business verification (which legal entity).
4. Confirm pilot business name(s)/detailer(s) for onboarding defaults.
5. **New:** Decide which feature becomes the first paid plugin at launch (affects Phase 3 monetisation build order) — likely candidate is Photo & Video or Vehicle CRM per BRD §12.2 pricing, but worth confirming based on what pilot detailers value most once they're using the MVP.
6. **New:** Confirm technical approach for carbros.pro purchase history feed (Risk #4) — worth a short scoping conversation once Phase 3 planning starts, not urgent now.
