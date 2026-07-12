# Audit 7 — Feature Gap Analysis (the app as a *solution*)

**Date:** July 2026 · **Method:** walked every built screen and every planned item (ROADMAP Stage 4, TRD Phase 2/3) from the perspective of a detailing-studio operator's actual day, then listed what *no* document covers. Benchmarked mentally against what detailing-shop software converges on (condition intake, aftercare, status transparency, margins) — convergent because the pains are universal.

**Rule applied:** nothing here duplicates the existing backlog (photos, reminders, public booking, deposits, capacity, push, receipts, repeat-order) or TRD Phase 2/3 (photo/video system, marketplace, stock intelligence, calendar sync, personal mode). These are the *misses*.

**Status (decided by Niko, July 2026):** F1, F2, F4, F5 **approved** and merged into ROADMAP.md (steps 3.6, 4.1b, 4.3-prereq, 4.3b). F3 **rejected** — see below. Tier 2 (F6–F10) registered as the post-pilot wave, ordered by pilot feedback. Tier 3 parked.

---

## Tier 1 — recommended before pilot (each closes a real operating gap)

### F1 — Light up the "materials" dashboard balloons with real data · *quick win, data already exists*
The two "Coming soon" placeholder balloons were built when no purchasing data existed. It exists now: received POs (`purchase_orders.received_at` + item qty × unit price). Material spend this month / last month is a straight aggregation — no new tables, no new screens.
**Why it matters:** the owner's #2 money question after "what did I earn" is "what did I spend on chemicals."
**Effort:** small. **Fits:** anytime after Stage 2.

### F2 — Vehicle condition check-in (damage record at intake) · *dispute protection*
Industry-standard in detailing and the single biggest missing *workflow* piece: before work starts, record existing scratches/dents/interior damage. Without it, "you scratched my bumper" is your word against the customer's — one dispute costs more than the feature.
**Shape:** a per-job condition section — checklist (body/glass/wheels/interior) + free note + photos (extends backlog 4.1's photo work; condition photos are just tagged photos). Shown on the job, printable into the receipt (4.7).
**Effort:** medium; ride on 4.1. **Fits:** immediately after 4.1 photos.

### ~~F3 — Coating & aftercare record (warranty card)~~ — **REJECTED (Niko, July 2026)**
Proposed warranty/aftercare records for ceramic coatings. Niko decided against building it. Do not resurrect without a new explicit decision; generic rebooking reminders (backlog 4.2) remain the only aftercare mechanism.

### F4 — Working-hours exceptions (holidays/vacations) · *prerequisite, not a feature*
`working_hours` is a weekly pattern only. The public booking link (4.3) will happily let a customer book on Orthodox Christmas. A simple `business_closures` table (date ranges + reason) checked by the calendar and the public booking flow.
**Effort:** small. **Fits:** MUST land before 4.3 goes live — added as a stated prerequisite there.

### F5 — Manual payment recording (method + partial payments) · *cash is king in Georgia*
Today "paid" is a bare status flip — no record of *how* (cash/transfer/BOG-link) or *how much*. Most pilot payments will be cash; deposits (4.4) make partial payment normal. Without amounts, "pending payments" can't show the true remaining balance on a half-paid job.
**Shape:** the `payments` table arrives earlier than Stage 6 (it was always planned — BOG just becomes *one more writer* to it), with a "record payment" action (amount + method) on the job; paid-status auto-flips when balance reaches zero.
**Effort:** medium (migration + job-screen section). **Fits:** before 4.4 deposits, which needs partial-payment math anyway.

## Tier 2 — high value, right after pilot feedback

### F6 — Customer-facing live status page ("where's my car?")
Tokenized public job URL (no login): status, ETA, and (with 4.1) progress photos. Kills the #1 interruption in every shop — the "is it ready?" phone call. Pairs perfectly with WhatsApp (6.2): the booking confirmation carries the link.
**Why Tier 2:** wants photos + WhatsApp live first to shine.

### F7 — Job profitability (margin per job)
`job_products` consumption × product cost + (later) staff time = real margin per job and per *service type* — "ceramic coats earn 3× what interior details do per hour." No detailing tool in this market shows this; we already collect both sides of the equation.
**Why Tier 2:** needs a few months of consumption + PO cost data to be truthful (same logic as deferring stock intelligence).

### F8 — Waiting list / cancellation backfill
"Fully booked Saturday" → standby list; a cancellation offers the slot (manually at first, WhatsApp later). Recovers directly lost revenue.

### F9 — Staff commission report
Assigned jobs already exist; add a commission % per staff member → monthly earned-per-staff report. In this industry staff are near-universally paid per job — today the owner does this in a notebook.

### F10 — Owner's end-of-day digest
One evening push (4.6 infrastructure): today's completed GEL, collected vs. outstanding, tomorrow's bookings, low-stock count. The "close the garage door" ritual, automated.

## Tier 3 — parked (real, but not now)

- **F11 Analytics screen** (monthly trends, top services/customers) — grows out of F1+F7 naturally; premature before real data.
- **F12 Per-service checklists/SOPs** for staff consistency — valuable at >3 staff; pilot shops are smaller.
- **F13 Non-inventory expenses (rent, utilities) / full P&L** — accounting-tool territory; resist scope creep.
- **F14 Job templates/bundles** (wash+wax combo price) — partially covered by multi-select services; revisit if pilots ask.
- **F15 Customer language preference** on the customer record — becomes necessary *at* WhatsApp time (6.2); noted there already.

---

## Insertion into ROADMAP.md (applied July 2026)

| Proposal | Outcome |
|---|---|
| F1 materials balloons | ✅ merged as step 3.6 |
| F4 closures/holidays | ✅ merged as prerequisite inside 4.3 (public booking) |
| F2 condition check-in | ✅ merged as step 4.1b |
| F5 manual payments | ✅ merged as step 4.3b (before deposits) |
| F3 coating warranty | ❌ rejected by Niko — not built |
| F6–F10 | ✅ registered as ROADMAP "Stage 4½ — post-pilot wave" |
