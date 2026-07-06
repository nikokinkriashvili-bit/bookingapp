# Booking App — Technical Requirements Document (TRD)
**Version 1.0 | July 2026 | Derived from BookingApp_BRD_v1**
**Scope: MVP (Phase 1) only — full plugin ecosystem is phased in later**

---

## 1. Purpose & How to Use This Document

This TRD translates the Business Requirements Document into build-ready technical decisions. It is written to be handed directly to Claude Code as a project spec. Every section either states a decision (stack, data model, API) or flags an open question that needs Niko's input before build starts.

**Confirmed with Niko so far:**
- Build MVP first, not the full 12-section BRD at once.
- End-state target is both a mobile app and a web app.
- First real users: Carbros' own detailing pilot + a small number of Carbros-network detailers (not a cold launch).

---

## 2. Recommended Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Client (mobile + web from one codebase) | **Expo (React Native) + Expo Router** | Expo compiles the same codebase to iOS, Android, and web. You asked for "mobile app and web app" as the final version — building one codebase instead of two cuts build time and cost roughly in half, and it's the most Claude-Code-friendly way to hit both targets. |
| Backend | **Supabase** (managed Postgres + Auth + Storage + Realtime + Edge Functions) | No backend server to manage yourself. Handles login, database, file storage, and live updates (needed for the drag-and-drop whiteboard) out of the box. Generous free tier for MVP testing. |
| Media storage | Supabase Storage for MVP → migrate to **Cloudflare R2** when Photo/Video plugin (Phase 2) is built, per BRD 6.4 | MVP has no photo/video feature, so no need to stand up R2 yet. |
| Hosting | **Vercel** (web) + **EAS Build** (Expo's own service, for iOS/Android app builds) | Both integrate directly with Expo/Next-style projects, minimal DevOps. |
| Messaging | **WhatsApp Business Cloud API (Meta, direct)** | Confirmed via Meta docs: free to apply, pay-per-message (utility messages ~$0.007, lower than marketing tier). Direct integration avoids a middleman BSP fee for MVP volume. Revisit a BSP (360dialog/Twilio) later if template approval or number verification becomes a blocker. |
| Payments | **Bank of Georgia Online Payment API** (`api.bog.ge/docs`) | Confirmed: REST API, OAuth 2.0 + JWT, official docs live. Requires Niko to have a Bank of Georgia merchant account via businessonline.ge before integration can start — this is a business step, not a coding one. |
| Vehicle plate lookup | **Unresolved — see Risk #1 below** | No public API found for the Georgian government vehicle registry. Flagged as the single biggest technical risk in this document. |

---

## 3. High-Level Architecture

```
┌─────────────────────────────┐        ┌──────────────────────────┐
│   Expo App (iOS/Android/Web)│◄──────►│   Supabase (Postgres,     │
│   - Onboarding               │        │   Auth, Storage, Realtime,│
│   - Job intake                │        │   Edge Functions)         │
│   - Whiteboard schedule       │        └──────────┬───────────────┘
│   - Calendar view              │                   │
└──────────┬────────────────────┘                   │
           │                                          │
           ▼                                          ▼
┌─────────────────────────────┐        ┌──────────────────────────┐
│  WhatsApp Cloud API (Meta)   │        │  BOG Payment API          │
│  - booking confirmations     │        │  - payment link            │
│  - job status updates        │        │  - webhook on payment      │
└─────────────────────────────┘        └──────────────────────────┘
```

Everything routes through Supabase as the single source of truth. Edge Functions handle outbound WhatsApp sends and BOG webhook receipts, so the mobile/web client never talks to Meta or BOG directly (keeps API keys server-side).

---

## 4. MVP Data Model (core tables)

| Table | Key fields | Notes |
|---|---|---|
| `businesses` | id, name, business_type (enum: 8 roles from BRD 2.1), working_hours, whatsapp_number | Created at onboarding step 1 |
| `staff` | id, business_id, name, phone, role | Supports "Team" tier later; MVP can start with 1 owner-user |
| `services` | id, business_id, name, duration_minutes, price_gel | Pre-loaded per business_type, editable (BRD 2.2 step 3) |
| `vehicles` | id, plate_number (unique), make, model, year, colour, fuel_type | Plate is the primary key per BRD 3.3 |
| `customers` | id, name, phone (WhatsApp ID), email (optional) | Linked to vehicles many-to-many via `customer_vehicles` |
| `customer_vehicles` | customer_id, vehicle_id | Join table — supports "multiple owners per car" model |
| `jobs` | id, business_id, vehicle_id, customer_id, service_ids[], status (enum: Booked/InProgress/AwaitingCollection/Complete/Paid/Cancelled), scheduled_slot, price_total | Core booking record — maps to whiteboard cards (BRD 4.1) |
| `payments` | id, job_id, bog_payment_link_id, status, amount, paid_at | Updated via BOG webhook |
| `messages_log` | id, job_id, customer_id, direction, template_used, sent_at | WhatsApp audit trail (BRD 5.2) |

This is intentionally a subset of the full BRD data model — no `stock_products`, `partner_referrals`, or `photo_media` tables yet; those arrive with their respective plugins in Phase 2/3.

---

## 5. MVP Feature Scope

Maps to BRD sections. Everything else in the BRD is explicitly out of scope for v1 (Section 6).

### 5.1 Onboarding (BRD §2)
Business type selection (8 roles) → working hours → service list review/edit → WhatsApp number connect. **Cut for MVP:** Google/Apple Calendar connection step, plugin activation step (no plugins exist yet).

### 5.2 Job Intake (BRD §3)
Manual plate entry (large single field, auto-capitalised) → manual vehicle detail entry if not previously seen → service multi-select → assign to time slot → job created, WhatsApp confirmation sent. **Cut for MVP:** live government registry lookup (see Risk #1) — every plate is "manual entry" for now, which the BRD already specifies as the fallback path, so this isn't a broken flow, just the only path.

### 5.3 Whiteboard + Calendar (BRD §4)
Kanban view with configurable columns, drag-and-drop status changes, color-coded status. Basic day/week calendar view. **Cut for MVP:** Google Calendar bidirectional sync, iCal feed generation.

### 5.4 Vehicle & Customer CRM (BRD §5, partial)
Vehicle profile with service history list, customer profile with visit count/total spend. **Cut for MVP:** paint correction/ceramic coating detailed logs, tech inspection reminders (own plugin, Phase 2).

### 5.5 Communication & Payment (BRD §7)
WhatsApp template messages for the 6 events listed in BRD's message table (booking confirmed, job started, job complete, payment request, payment confirmed — tech inspection reminder excluded since that's Phase 2). BOG payment link generation + webhook reconciliation. **Cut for MVP:** rs.ge automatic invoice submission — start with a simple PDF invoice, add rs.ge integration once InvoiceGE side is ready to receive it.

---

## 6. Explicitly Out of Scope for MVP (Phase 2/3 roadmap)

| Phase | Feature | BRD section |
|---|---|---|
| 2 | Photo & video system (walkaround video, before/after photos, social export) | §6 |
| 2 | Tech inspection reminders | §5.3 |
| 2 | Google Calendar / Gmail / iCal integrations | §10 |
| 3 | CarPro Stock Intelligence (pattern learning, Monday dashboard, one-tap reorder) | §9 |
| 3 | Partner Marketplace | §8 |
| 3 | Personal Mode | §11 |

Reasoning: the MVP proves the core loop (intake → schedule → notify → pay) with real Carbros-network detailers before investing in the more complex, harder-to-validate features. Stock Intelligence in particular needs at least one full purchase-to-purchase cycle of real data (BRD §9.4) before it can even function, so there's no way to build it usefully before the MVP has been running for a while.

---

## 7. Third-Party Integration Notes

### 7.1 WhatsApp Business Cloud API
Confirmed feasible. Apply directly through Meta (free), get a phone number verified, submit message templates for approval (utility category — cheaper than marketing tier and matches the BRD's use case). Budget: roughly $0.007/message at current utility rates, reviewed quarterly by Meta.

### 7.2 BOG Payment API
Confirmed feasible via `api.bog.ge/docs`. **Requires action from Niko before dev starts:** a Bank of Georgia merchant account and businessonline.ge access, plus registering callback URLs for payment confirmation. This is a banking/paperwork step, not something Claude Code can do — flagging it now so it's not a surprise later.

### 7.3 Google Calendar / Gmail
Standard OAuth 2.0, well-documented, low risk. Deferred to Phase 2 per scope decision above.

---

## 8. Risks & Open Items

### Risk #1 (highest priority): No confirmed public API for Georgian vehicle plate lookup
Searched for an official Georgian government vehicle registry API (equivalent to what BRD §3.2 describes). Nothing public was found — search results only surfaced U.S. state of Georgia DMV services, which are unrelated. This needs direct investigation, likely by:
- Checking with Georgia's Revenue Service (rs.ge) or the Ministry of Internal Affairs for any B2B/partner data API.
- Asking whether a data broker or scraping-based service already exists in the Georgian market that detailers or insurers use.
- Treating "manual entry" as the permanent primary path rather than a temporary fallback, if no API materializes. The BRD already designs for this gracefully (manual entry is saved for future visits), so the product isn't broken without it — it just loses the "auto-fill in 2 seconds" convenience.

**This should be resolved before Phase 1 planning finalizes**, since it affects whether "30-second intake" is achievable with manual entry alone.

### Risk #2: BOG merchant account is a prerequisite, not a build task
Flagged above — needs Niko to open the account before payment integration can be tested end-to-end.

### Risk #3: WhatsApp template approval timeline
Meta review of business verification and message templates can take days to weeks. Should be started in parallel with development, not after.

---

## 9. Non-Functional Requirements

- **Intake speed target:** plate/vehicle entry to job-on-schedule in under 30 seconds (BRD §3.1) — drives the "single field, auto-capitalised" UI decision.
- **Mobile-first:** every MVP screen designed for phone-sized viewport first; web is a secondary layout of the same components (Expo Router supports this natively).
- **Language:** Georgian and English UI strings from day one — do not hardcode English only, since WhatsApp templates require both per BRD §7.1.
- **Data residency/compliance:** none specified yet in BRD beyond rs.ge tax compliance (deferred to Phase 2) — no action needed for MVP.

---

## 10. Build Roadmap (for Claude Code sessions)

1. **Scaffold:** Expo project + Supabase project + auth (business owner login).
2. **Onboarding flow:** business type → hours → services.
3. **Data model:** create Supabase tables from Section 4, with row-level security scoped per business.
4. **Job intake screen:** manual plate/vehicle entry, service multi-select, slot assignment.
5. **Whiteboard view:** kanban board with drag-and-drop, realtime sync via Supabase Realtime.
6. **WhatsApp integration:** Edge Function to send template messages on the 5 in-scope trigger events.
7. **BOG payment integration:** Edge Function to generate payment link + webhook receiver.
8. **Basic calendar view:** day/week list view of the same jobs.
9. **Internal pilot:** run with the Carbros pilot business + 1-2 network detailers, gather feedback.
10. **Phase 2 kickoff:** photo/video system + tech inspection reminders, once MVP is validated.

---

## 11. Open Decisions Needed From Niko

1. Resolution on Risk #1 (plate lookup) — worth a short investigation before locking Phase 1 scope.
2. Confirm Bank of Georgia merchant account can be opened in parallel with development start.
3. Confirm who owns WhatsApp Business verification (Niko's business entity, or Carbros' existing entity).
4. Confirm the pilot business name(s)/detailer(s) so onboarding defaults can be tailored to them specifically rather than generic.
