# Audit 4 — Accessibility

**Date:** July 2026 · **Method:** code review of touch-target sizes, font sizes, contrast values from `theme.ts`, and assistive-tech affordances. PRODUCT.md declares an accessibility baseline; this is its first verification. Context: users are detailing staff — often gloved, wet-handed, outdoors in sunlight — so touch size and contrast are *operational* requirements here, not just compliance.

## Findings

### A1 — Touch targets below the 44pt guideline 🟠
Measured from styles (padding + content):

| Control | Approx size | Where |
|---|---|---|
| Consumption stepper ±  | 30×30 | job edit |
| Remove "×" buttons | ~36×36 | services, staff, PO items |
| Calendar nav arrows `<` `>` | ~34×34 | month + day headers |
| Language/theme segments | ~32 tall | drawer, login |
| "Today" link | ~26 tall | day view |

**Fix:** bump to ≥44×44 via `hitSlop` (no visual change) or padding. One pass, mostly mechanical. Priority: steppers and × buttons (destructive + small is the worst combination).

### A2 — Text below readable minimums 🟠
- Month-grid chip text: **9px**; period-summary pill labels: **9px**; stat labels **10–11px**.
- The month chips are the app's densest information surface and are unreadable in sunlight.
**Fix:** floor at 11px; for the month grid consider count badges + color instead of 9px truncated text. (Design call — flag to Niko before changing the month grid.)

### A3 — Icon-only controls have no `accessibilityLabel` 🟡
Gear (QuickSettingsButton), stepper ±, remove ×, nav arrows. Screen readers announce nothing useful.
**Fix:** `accessibilityLabel={t(...)}` + `accessibilityRole="button"` on each — small pass, new i18n keys required (both languages).

### A4 — Contrast: `muted` fails AA for informational text 🟠
Computed from `theme.ts`:
- `muted` #8A9099 on `surface` #FFFFFF ≈ **3.0:1** — fails AA (4.5:1) for normal text. Fine for decorative hints; **not** fine where it carries real data, and it currently styles: last-visit dates, SKU lines, card details/timestamps, empty states.
- Status tones (light): text-on-bg pairs are all darkened-hue-on-pale-tint (e.g. warning #8A5300 on #FCEFD9) — these pass comfortably ✅. Dark-theme tones follow the same pattern ✅.
**Fix:** darken `muted` in the light theme to ≈ #6E747D (keeps the hierarchy, passes 4.5:1), or re-style data-bearing text from `muted` → `inkSoft`. Verify with a contrast checker after changing.

### A5 — Font scaling untested 🟡
RN scales text with OS settings by default; fixed-height rows (44px inputs, 90px calendar cells) may clip at 1.3×+.
**Fix:** test at max OS font size during the Phase D device pass; add `maxFontSizeMultiplier` only where layouts actually break.

### A6 — Web keyboard navigation untested 🟡
RN-Web Pressables are focusable, but focus *visibility* and tab order have never been checked.
**Fix:** 15-minute tab-through of login → intake → calendar during Phase D; fix what's invisible.

## Suggested order
1. A1 hitSlop pass + A3 labels (one session, mechanical).
2. A4 `muted` darkening (one token change + visual re-check both themes).
3. A2 month-grid density — **needs Niko's design sign-off**.
4. A5/A6 fold into the Phase D device pass; log results here: ☐ font-scale pass ____ · ☐ web tab-through ____.
