# Audit 5 — Localization (Georgian-first)

**Date:** July 2026 · **Method:** review of the i18n layer, string tables, formatting helpers, and layout risk. Baseline: key parity is **type-enforced** (`Record<StringKey, string>` for both languages — a missing key fails `tsc`), so this audit is about quality, not coverage.

## Verified sound ✅
- Full en/ka parity, compiler-enforced; Georgian is the default; choice persists; toggle available pre-login (login screen) and everywhere (drawer).
- Dates/times format through `localeFor()` → `ka-GE`/`en-GB`, no hand-built date strings.
- Catalog data (business types, service templates) bilingual since migration 008, seeded in the active language at onboarding.
- GEL formatting (`45 ₾`, sign after amount) matches Georgian convention; plate input is Latin-only, which is correct — Georgian plates use Latin letters.

## Findings

### L1 — Georgian text expansion never layout-tested 🟠
Georgian runs ~10–25% longer than English and has no capital letters (losing a visual emphasis channel). Never systematically checked at 375px. Highest-risk spots:
- **5 bottom-tab labels** (e.g. "პარამეტრები" = 11 chars where "Settings" is 8);
- service-row column headers (Name/Min/GEL) over narrow inputs;
- segmented controls in the drawer; period-summary pill labels (9px + long words).
**Fix:** one 375px pass in Georgian through every screen (fold into the Phase D device pass); log breakages here. ☐ done ____

### L2 — String surgery on a translation 🔴 (bug-class, cheap fix)
`t("po.expectedDelivery").split(" (")[0]` (PO list + detail) assumes the translated string contains ` (`. Any rewording silently changes UI text.
**Fix:** add a `po.expectedDeliveryShort` key (both languages); delete the `.split()` calls.

### L3 — `common.to` is "–" in Georgian, "to" in English 🟡
Used as the separator between open/close time inputs. A dash is defensible, but the *same key* meaning a word in one language and punctuation in another is a trap for reuse.
**Fix:** rename to `common.timeRangeSeparator` (or split keys) so nobody reuses "to" as a preposition; confirm with Niko that "–" is the intended Georgian rendering.

### L4 — `ka-GE` month/weekday names unverified on Android 🟡
Web and iOS render Georgian month names via `Intl`; Android/Hermes ships a limited ICU set in some configurations and may silently fall back to English month names.
**Fix:** check `new Date().toLocaleDateString("ka-GE", {month:"long"})` on a real Android device during Phase D. If it falls back: add a tiny month/weekday name table to `i18n.ts` (12+7 strings). ☐ verified ____

### L5 — Future: WhatsApp templates are a bilingual deliverable 🟢
When C2 lands, every template needs ka + en variants and per-customer language selection (customer records don't store a language preference yet — that column arrives with the WhatsApp work, not before).

## Standing rules (already in CLAUDE.md, restated for this file's audience)
- Never hardcode a user-visible string; always a `StringKey` in **both** languages in the same commit.
- Georgian copy is the primary text, not a translation afterthought — write ka first when adding features, then en.
