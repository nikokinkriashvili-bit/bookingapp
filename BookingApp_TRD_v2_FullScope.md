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

**Planned architectural change (July 2026, details blocked on access — see Risk #6 and Open Decision #7):** this app is to be integrated with an already-built external **backend engine** (separate project, Niko's) that provides user management, stock management, rs.ge integrations, and product catalogues as shared platform services. Today the app is self-contained on Supabase and several of those domains (auth, stock/inventory, service catalogues) are implemented locally; once access to the backend engine and its API surface exists, an integration spec must decide, domain by domain, what moves behind the engine, what stays in Supabase, and how the two stay consistent. **No further build-out of the overlapping domains should assume they stay Supabase-local long-term** — but nothing is ripped out or refactored speculatively before the engine's actual interface is known. Until then the diagram above remains the as-built truth.

---

## 5. Full Data Model

Tables already live (migrations 001–005): `businesses`, `services`, `business_type_catalog`, `default_service_templates`, `vehicles`, `customers`, `customer_vehicles`, `jobs` (incl. `scheduled_end`).

Tables still to add, by phase:

| Phase | Table | Purpose |
|---|---|---|
| 1b | `staff` | Multi-user businesses (Team tier), role permissions |
| 1b | `payments` | Payment status per job. Dual-path: `payment_mode` ('bank' \| 'manual_transfer') on the business determines whether status is set by the bank's webhook or a manual "Mark as paid" tap — same schema either way. See §6.6.1. |
| 1b | `bank_credentials` | Per-business merchant credentials (`business_id`, `provider` ['bog' \| 'tbc'], `client_id`, `client_secret` [encrypted at rest], `connected_at`, `status`) — each business connects its own bank's merchant account; there is no shared platform-level credential and no single assumed bank. See §6.6.1. |
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

#### 6.6.1 Payment architecture (revised, July 2026): per-business bank credentials (BOG, TBC) + a manual-transfer fallback

Further research after v2's original draft surfaced corrections to the payment design, driven by the reality of the pilot group — most detailers are individuals without a registered company, not businesses with an existing merchant relationship.

**Multi-tenant, multi-bank credentials — not a single platform account, not a single bank.** The original assumption of one BOG merchant integration shared across all businesses doesn't hold on either axis: merchant credentials are issued per business, and different businesses bank with different banks — **BOG and TBC are both in scope** (TBC has its own e-commerce/payments API), with the provider field open to further Georgian banks later. Each business connects its *own* credentials (Client ID + Secret from its own merchant account at its bank). These are stored in the `bank_credentials` table (see §5) with a `provider` discriminator (`'bog' | 'tbc'`). The payment Edge Function looks up the calling business's row, dispatches to the matching provider adapter (BOG and TBC have different APIs — link creation and webhook verification are provider-specific, hidden behind one internal interface), and never holds or uses a single global credential set. A business with no `bank_credentials` row simply isn't payment-connected yet (see the fallback below), not an error state.

Connecting either bank requires the business to hold a merchant account there, which in turn requires the business to be registered — Individual Entrepreneur (IE, ინდივიდუალური მეწარმე) status or equivalent. This is a business-status prerequisite, not company incorporation specifically; see Risk #2 (updated) in §10.

**Dual-path payment flow: bank link or manual transfer.** Since a detailer may not have bank credentials connected (yet, or ever), each business carries a `payment_mode` setting — `'bank'` or `'manual_transfer'`:
- **`bank`**: the WhatsApp payment-request message carries a payment link generated via the business's connected provider (BOG or TBC); the provider's webhook flips `payments.status` to `paid` and fires the payment-confirmed WhatsApp message automatically.
- **`manual_transfer`** (fallback): the WhatsApp payment-request message instead carries the detailer's personal bank account / IBAN and a short reference code (the job's plate number or job ID), with instructions for the customer to put that reference in the transfer's purpose field. There's no automatic confirmation in this mode — the detailer manually taps **"Mark as paid"** in the app once they've checked their own bank app for the incoming transfer. That tap sets the exact same `payments.status = 'paid'` and fires the exact same payment-confirmed WhatsApp message the webhook path would.

Both paths write to the same `payments` schema and differ only in *how* status gets set (webhook vs. manual tap), never in what gets stored or which downstream message fires. This means a business that starts on `manual_transfer` and later connects real bank credentials upgrades to automatic payment confirmation with a single settings flag flip — no schema change, no UI rebuild. Likewise a business switching banks (BOG → TBC) just replaces its `bank_credentials` row.

**Payments onboarding screen.** Bank connection gets its own dedicated onboarding screen/step (not crammed into the existing 3-step business onboarding, which must stay fast): pick your bank (BOG / TBC / "no merchant account yet"), enter credentials for the chosen bank OR enter a personal IBAN for `manual_transfer` mode, with a plain-language explainer of what each mode means for how customers pay. Reachable both during first onboarding and later from Settings, since most pilot detailers will start on `manual_transfer` and connect a bank months later.

Onboarding should present IE registration as a fast, cheap, worthwhile step toward `bank` mode (most solo detailers will need IE status anyway for rs.ge tax compliance) rather than a blocker — a business stays fully functional on `manual_transfer` in the meantime.

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

### Risk #2 (updated, July 2026): a bank merchant account is a per-business prerequisite, not a single platform one
Every business that wants `payment_mode: 'bank'` needs its own merchant account with its bank (businessonline.ge for BOG; TBC's equivalent for TBC), which in turn requires the business to hold Individual Entrepreneur (IE) status or equivalent — most pilot detailers are individuals without a registered company today, so this is a real onboarding step for them, not paperwork Niko handles once centrally. IE registration in Georgia is fast and cheap, and most solo detailers will need it anyway for rs.ge tax compliance, so this should be positioned in onboarding as a worthwhile step, not a hard blocker — see §6.6.1. The `manual_transfer` fallback (§6.6.1) means a business is fully functional before, during, and independent of getting a bank connected. Supporting two provider APIs (BOG + TBC) roughly doubles the Phase 1b payment-integration surface (two link-creation flows, two webhook verifiers) — budget for it. Not blocking Phase 1 (app-only) work.

### Risk #2b (new, July 2026): Automatic detection of personal-account bank transfers is out of scope for MVP
The `manual_transfer` fallback (§6.6.1) relies on the detailer manually confirming a transfer landed — there's no automatic reconciliation for payments into a personal (non-merchant) bank account. Georgia's Open Banking regulation could theoretically enable reading a detailer's personal account transactions to auto-detect a matching incoming transfer, but that requires either becoming a licensed provider or partnering with one that already is — meaningfully out of scope for MVP. Noted here only as a possible Phase 3+ direction, not something to plan or build against now.

### Risk #3: WhatsApp template approval timeline
Meta review can take days to weeks — start business verification and template submission now, in parallel with Phase 1 build, so it's ready by the time Phase 1b starts.

### Risk #4 (new): Stock Intelligence needs a live carbros.pro data feed
BRD §9.2 requires purchase history from carbros.pro as a core signal. This is a new integration between the Booking App and the existing WooCommerce store (carbros.pro), not covered by any existing plugin or documented API on the carbros.pro side yet. Needs its own technical investigation before Phase 3 planning finalizes — likely a WooCommerce REST API integration or a custom endpoint added to carbros.pro's `functions.php`.

### Risk #5 (new): App Store / Play Store review timelines
Not relevant while testing via Expo Go, but once EAS builds are submitted for real distribution, Apple's review in particular can take days and reject for policy reasons unrelated to code quality (e.g. payment flow policies, since BOG payment links inside an app can trigger extra scrutiny). Budget time for this before any planned public launch date.

### Risk #6 (new, July 2026): Backend-engine integration is decided but unspecified — overlap with already-built app domains
The app is to be integrated with Niko's separately-built backend engine (user management, stock management, rs.ge integrations, catalogues — see §4). Niko does not currently have access to that project, so its API surface, auth model, data ownership, and deployment story are all unknown here. The risk is twofold: (a) **double-build** — auth, stock/inventory, and service catalogues already exist in this app on Supabase, and every further feature built on them deepens the eventual migration; (b) **integration unknowns** — until the engine's interface is seen, no honest estimate of the integration effort is possible, and it could range from "point the app's queries at new endpoints" to a structural rework of the data layer. Mitigation for now: keep the overlapping domains behind their existing lib-module seams (`supabase.ts` is already the single client entry point), avoid new architectural coupling to Supabase-specific features in those domains where a cheap alternative exists, and treat obtaining access + an interface document as a **Stage 5-level paperwork item with long-pole priority**. No speculative refactoring before the interface is known.

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
7. **New (July 2026):** Backend-engine integration (Risk #6) — obtain access to the built backend project and produce/share its interface documentation (endpoints, auth model, data schemas for users/stock/catalogues/rs.ge). Until this lands, the integration stays a recorded intent with no buildable spec; once it lands, a dedicated integration TRD section must map each overlapping domain (auth, stock, catalogues) to "moves to engine" / "stays in Supabase" / "syncs between both."
