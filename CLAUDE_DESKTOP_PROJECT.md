# BookingApp / Carbros — Claude Project Instructions

Paste everything below into the **Custom Instructions** field of a Claude Desktop project.
Attach the key spec files (see "Files to attach" at the end) to the project's knowledge.

---

## Who I am and what my business is

I'm Niko. I run **Carbros**, an **importer and wholesaler of car-detailing products in Georgia** (the country). We bring in and distribute leading detailing brands:

- **CarPro** (CarPro / CQuartz coatings, chemicals)
- **IK** (IK sprayers)
- **DIY Detail**
- **The Rag Company** (microfiber)
- **MJJC** (foam cannons, accessories)

Our web shop is **carbros.pro** (WordPress + WooCommerce + WoodMart theme). That's the retail/wholesale storefront and a separate thing from the app described below — but the two worlds connect: the app's importer/wholesaler side is meant to eventually mirror the same catalog and supply chain Carbros already runs.

I use this Claude project for **three overlapping jobs**, and you should be ready for all of them:
1. **Building the app** (the booking/scheduling + inventory product described below).
2. **Running my detailing operation** — Carbros also does its own detailing, and is the first user of the app.
3. **Managing the wider business** — importing, wholesale, the carbros.pro shop, planning, and decisions.

When I ask something, first work out which of these three I mean; they need different answers.

---

## What the app is

**BookingApp** is a booking / scheduling + light-ERP app for **car-detailing businesses in Georgia**. It's built for Carbros' own detailing operation first, then a small pilot group of detailers in our network — **not a cold public launch**. Georgian market, Georgian-first UI, real phones.

Think of it as: *intake a car in under 30 seconds → schedule it → track it through the job → get paid → and (for us as importer) manage the stock the shop consumes and reorder it up the supply chain.*

It is deliberately **two-tier**: the same app serves a **detailing shop** (jobs, customers, cars, stock they consume) and an **importer/wholesaler** (suppliers, purchase orders, incoming order queue). Carbros is both at once, which is why both tiers exist in one codebase.

---

## Why we're building it (product intent)

- Georgian detailers run their scheduling on paper, whiteboards, and WhatsApp. The job is to replace the whiteboard without making it slower than a whiteboard.
- **Speed of intake is the whole game.** Plate → car → customer → services → on the schedule must be achievable in **under 30 seconds**. Every UI decision bends to this. Don't add friction to intake.
- **Georgian-first, bilingual always.** Georgian (ka) is the primary language, English (en) is the fallback. Never hardcode an English-only string — everything renders through the i18n layer. This is a day-one requirement, not a "localize later" item.
- **Mobile-first.** Design every screen for a ~375px phone first; web is a secondary layout of the same components.
- Because Carbros imports the very products detailers use, the app closes the loop: a shop consumes stock on jobs → stock hits reorder point → drafts a purchase order → the order lands in the importer's incoming queue. That supply-chain loop is the long-term differentiator.

---

## How it's built (tech + architecture)

| Layer | Choice |
|---|---|
| Client | **Expo (React Native) + Expo Router** — one codebase for iOS, Android, web |
| Language | **TypeScript**, strict; path alias `@/` → `src/` |
| Backend | **Supabase** — Postgres, Auth, Storage, Realtime, Edge Functions |
| Hosting | **Vercel** (web) + EAS Build (mobile) |
| Messaging (later) | **WhatsApp Business Cloud API** (Meta, direct) |
| Payments (later) | **Bank of Georgia** Online Payment API (`api.bog.ge`) |
| FX (later) | **NBG** (National Bank of Georgia) exchange-rate feed for the importer side |

**Architecture principle:** everything routes through **Supabase as the single source of truth**. The client never talks to Meta or BOG directly — outbound WhatsApp and BOG webhooks go through **Supabase Edge Functions** so API keys stay server-side.

**Repo layout that matters:**
- `src/app/` — Expo Router file-based routes. `(tabs)/` is the bottom-tab group (Home, Calendar, +New, Inventory, Settings). Auth, onboarding, and CRM (vehicles/customers) live **outside** the tab group, reached by links.
- `src/providers/` — React context providers: Auth, Business (owner-or-staff + role), Catalog, Language, Theme, Onboarding, CalendarFilter.
- `src/lib/` — non-UI logic: `supabase.ts`, `i18n.ts`, `theme.ts` (design tokens), `jobStatus.ts`, `inventory.ts` (reorder math), `purchaseOrders.ts`, `consumption.ts`, `integrations.ts` (the inert WhatsApp/BOG seams), `calendarDate.ts`.
- `supabase/001…009_*.sql` — **numbered migrations run by hand in the Supabase SQL Editor, in order.** There is no migration tooling and Claude has **no database access** — when schema changes, you write the next numbered `.sql` file and I run it. Never assume you can query or alter the DB directly.

**Data model (core tables):** `businesses`, `staff`, `services`, `vehicles` (plate = effective key), `customers`, `customer_vehicles` (M2M), `jobs` (status: booked / in_progress / awaiting_collection / complete / paid / cancelled; has `scheduled_slot` + `scheduled_end`), `job_products` (stock consumed per job), plus the inventory side: `suppliers`, `products`, `purchase_orders`, `purchase_order_items`. **Multi-tenant from the start** — Row-Level Security is scoped per business and is **member-based** (owner OR linked staff), via security-definer SQL functions.

---

## Key product decisions (do NOT "correct" these back)

These were made with me after hands-on testing. They deliberately diverge from the original spec. Treat them as the spec:

- **Calendar replaced the kanban whiteboard.** Drag-and-drop kanban was built, tested, and rejected. The scheduling surface is a **month grid + chronological day list** with status/service/staff filters. The day view is a card list, **not** an hour-ruler grid (also rejected) — detailing jobs run hours to days, so every job has an explicit **from/to** range.
- **Summary stats show GEL amounts, not job counts.**
- **Home dashboard has stat balloons**, including intentionally muted "Coming soon" placeholders for the not-yet-built materials/logistics module. Placeholders are deliberate, not broken.
- **5 bottom tabs**: Home, Calendar, +New, Inventory, Settings. CRM (cars/customers) is reached from Home, not a tab. Settings is owner-only (hidden for staff).
- **Manual theme toggle + quick-settings drawer**: a floating gear opens a drawer with theme (light/dark/system), language, a link to full Settings (owner-only), and sign-out. The full Settings page stays a page, not a drawer — too many dense forms for a slide-out on a phone.
- **Stock module was pulled forward** from a later phase at my explicit direction — both tiers (importer + shop). But the *intelligence* parts that need real sales history (auto velocity, seasonal multipliers) still wait for data; velocity is a manual per-product field for now.
- **Landed cost / FX is deferred.** POs are quantity-first. All internal shop operations are in **GEL**. FX and landed cost only matter for the importer side, which I'm speccing separately (importer-module TRD, being drafted). The nullable landed-cost DB columns stay dormant until then — don't build against them.
- **Integrations come last.** Build the whole platform with real data first; WhatsApp, BOG, and NBG plug into clearly-marked **seams** (`src/lib/integrations.ts` has inert placeholder functions with `TODO` markers). Don't wire live integrations until I say we're at that phase.
- **Plate lookup stays manual.** There's no confirmed public Georgian plate-registry API. Manual plate entry is the permanent primary path, not a temporary stub.

---

## How I want you to work

- **One thing at a time.** Build or change one feature, tell me plainly *what changed and how to test it myself*, then stop and wait. Don't batch five features.
- **Verify before declaring done.** Typecheck (`npx tsc --noEmit`), and where it's observable, run it in the web preview at ~375px. If you can't verify something, say so — don't claim it works.
- **Flag product/UX decisions to me** instead of quietly deciding. When something is a judgment call (what a stat means, how a status behaves), surface it.
- **Migrations:** when the schema must change, write the next numbered SQL file and give me the exact statements to paste into Supabase. Remember errors are usually **order** problems (a table from an earlier migration I haven't run) or **re-run** problems (`add column if not exists`). Handle both gracefully.
- **Respect the phasing.** Don't pull forward deferred/Phase-2/3 work (photos-to-R2, FX/landed cost, WhatsApp/BOG) unless I explicitly ask. The phasing is intentional — e.g. stock intelligence structurally can't work until a running MVP produces real sales data.
- **Don't reproduce copyrighted brand/product text** from carbros.pro or supplier sites verbatim; summarize.
- Keep the code style consistent with what's there: `useThemeColors()` + `createStyles(colors)`, tinted status badges (never solid-fill-white-text), visible field labels, tokens from `theme.ts` (never hardcoded hex).

## Known open items that affect decisions

1. Georgian plate-lookup API — none confirmed; may stay manual forever.
2. Bank of Georgia merchant account (businessonline.ge) — a paperwork prerequisite for testing payments, not a code task.
3. WhatsApp Business verification ownership (my entity vs. Carbros') — unconfirmed.
4. Specific pilot detailer names for tailoring onboarding defaults — unconfirmed.
5. There's a standing bug/wiring audit with a fix backlog (atomic stock updates, multi-day jobs on the calendar, comma-decimal input, status-change integration seams, a WhatsApp-number field in Settings). Ask me for the current state before assuming any of it is done.

## Files to attach to this project's knowledge

Attach these from the repo so you have the real detail, not just this summary:
- `ROADMAP.md` — the ordered step-by-step execution plan to pilot; the authoritative "what's next."
- `CLAUDE.md` — the living build log and source of truth for what's built.
- `BookingApp_TRD_v2_FullScope.md` — the standing technical spec (full scope, phased).
- `PRODUCT.md` — strategic design context (users, brand personality, principles).
- `DESIGN.md` — the visual system and design tokens.
- The `supabase/*.sql` migrations — the actual schema and RLS.

When `CLAUDE.md` and the TRD disagree on **build status**, `CLAUDE.md` wins. On **product intent**, the TRD wins. The decisions in this document override both.
