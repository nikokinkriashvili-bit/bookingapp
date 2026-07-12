# Audit 6 — Cost & Scaling Posture

**Date:** July 2026 · **Method:** current stack vs. published free-tier limits and integration pricing models. ⚠️ Prices/limits change — treat numbers as "verify at signup," not gospel. This is a planning note, not a code audit.

## Current stack cost: $0/month

| Service | Tier | The limits that matter |
|---|---|---|
| Supabase | Free | ~500 MB database · ~1 GB file storage · ~5 GB egress/mo · 2 projects per org · **no point-in-time recovery; only limited backups** · projects pause after ~1 week of inactivity |
| Vercel | Hobby | Fine technically; **Hobby ToS is non-commercial** — a pilot with real businesses arguably crosses that line |
| GitHub | Free | Actions minutes ample for CI |
| EAS Build | Free | ~30 builds/mo — fine (builds only needed for device testing + releases) |

## When each ceiling gets hit

1. **Supabase backups — before pilot, not at a data threshold.** Real businesses' booking data with no PITR is the single biggest operational risk in the stack. **Pro (~$25/mo) is the price of sleeping at night; upgrade before pilot** (also removes project-pausing and raises limits). This is roadmap item D1/D5 territory.
2. **File storage — the moment photos ship (backlog B1).** Detailing before/after photos at ~2–4 MB each: the 1 GB free cap is ~300 photos, i.e. weeks. Pro's 100 GB covers the pilot; the planned R2 migration seam is the long-term answer. **Decision point: B1 should compress client-side (expo-image-manipulator, ~200–400 KB/photo) from day one** — 10× more runway on any tier.
3. **Database size — not a concern.** Booking rows are tiny; years of pilot data fit in 500 MB, let alone Pro's 8 GB.
4. **Two-project limit — hit immediately by staging** (TECHNICAL_AUDIT G10): prod + staging = exactly 2. Fine, but a third environment or a second app means paying or a second org.

## Integration costs (Phase C, per-unit economics)

- **WhatsApp Cloud API:** Meta charges per 24-hour *conversation*, rates vary by country and category; utility conversations are the cheap class, and replies inside a customer-initiated window are free. Order of magnitude for Georgia: **cents per booking** — negligible per job, but verify the current rate card when C2 starts and put the real number here: ☐ ____/conversation.
- **BOG payments:** merchant commission is contractual (typical local range 1.5–3%). This is the only integration whose cost scales with *revenue*, not usage — get the actual rate during the merchant-account paperwork: ☐ ____%.
- **NBG rates:** free public data.
- **Sentry (D2):** free tier ~5k errors/mo — ample.

## Unit economics sanity check (fill in when real numbers exist)

Per completed job: WhatsApp ≈ ¢2–10 (2–3 conversations) + BOG ≈ 2–3% of ticket (only on online payments) + infra amortized ≈ ~0. **A 200 ₾ detail carries well under 1% platform cost.** Pricing the product to pilot detailers (if ever non-free) is a business decision with huge margin room.

## Actions
- ☐ **Upgrade Supabase to Pro before pilot** (backups) — fold into Phase D1.
- ☐ Vercel: move to Pro (~$20/mo) at pilot, or accept the ToS gray zone knowingly (Niko's call).
- ☐ B1 (photos): client-side compression is a requirement, not an optimization.
- ☐ Record actual WhatsApp/BOG rates in this file when contracts land.
