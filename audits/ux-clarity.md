# Audit 8 — UX Clarity (confusing-UI pass)

**Date:** July 2026 · **Method:** code review of intake, home dashboard, and calendar day screens against PRODUCT.md's "legible at a glance" principle and the app's own established conventions (DESIGN.md, BookingApp_UXUI_Guidance_v1.md). Complements the existing intake-speed and accessibility audits — this one is about comprehension, not seconds or contrast.

## Findings

### C1 — Date/time entry is raw text, format-guessing 🔴
`jobs/index.tsx` from/to fields are plain `TextInput`s expecting `YYYY-MM-DD` and `HH:MM`, typed by hand. This is the single most confusing moment in the app for a non-technical user: no picker, no calendar widget, no keyboard restricted to digits. Get the format wrong and the only feedback is a generic error at the bottom of the screen after tapping Create — not next to the field. This overlaps with intake-speed audit R1–R3 (which frames it as a speed problem); it's equally a clarity problem. A detailer who mistypes `2026-7-12` has no idea why the order won't save.
**Fix:** native date/time pickers (`@react-native-community/datetimepicker`, already the standard Expo-compatible choice), or at minimum the quick-chip shortcuts from R2 plus a persistent (not placeholder-only) format hint.

### C2 — Date/time fields break the app's own "visible label" rule 🟠
DESIGN.md explicitly carves out an exception for the plate field and search boxes to be placeholder-only; every other field is supposed to get a `FieldLabel`. The from/to date and time inputs in `jobs/index.tsx` don't use `FieldLabel` — they rely on placeholder text (`YYYY-MM-DD`, `HH:MM`) that disappears the moment the user starts typing. That's inconsistent with how every other field on the same screen behaves (vehicle/customer fields all have real labels), and it's the one place on the screen most likely to need a reminder of expected format.
**Fix:** add `FieldLabel` above each date/time input (small, mechanical fix, same pattern already used elsewhere on the screen).

### C3 — Form-level error, not field-level 🟠
All eight validation checks in `onSubmit` (`errorPlate`, `errorService`, `errorFromTo`, `errorDateFormat`, `errorEndAfterStart`, `errorCustomerDetails`, `errorSelectCustomer`) render into a single `Text` at the very bottom of a long scrolling form. On a phone, if the problem is the plate field (top of screen) but the error renders at the bottom, the user sees a message with no visual link to the field that caused it — they have to guess and scroll. This is exactly the failure mode the UX guidance doc's "inline, plain-language" error rule (§8) was meant to prevent, but the implementation puts it at the wrong end of a long screen.
**Fix:** either scroll-to-error on submit failure, or move validation errors inline under each relevant field (bigger change, lower priority — scroll-to-error is the cheap fix).

### C4 — Vehicle-not-found state isn't announced 🟡
When a plate lookup finds nothing, `hasLookedUp && !foundVehicle` silently reveals a "vehicle details" form and a "customer details" form with no explanatory text (no equivalent of the `job.found` message shown on the match path). A first-time user typing a new plate sees two forms appear with no "this is a new car — let's add it" framing; it works, but it's implicit rather than told.
**Fix:** one line of copy, same slot as `job.found`, e.g. "New car — add a few details" (already have the i18n pattern to extend).

### C5 — Dashboard mixes time periods in one visual grid 🟡
`DashboardStats` renders four live balloons in the same grid: two scoped to *last month* (cars serviced, revenue), two scoped to *all-time* (pending payments, current jobs). The labels do correctly say "(last month)" in the copy — so this isn't a bug — but at 11px muted text in a dense grid (already flagged in the accessibility audit, A2/A4) the distinction is easy to miss at a glance, which undercuts the "legible at a glance" principle PRODUCT.md sets as the test for every screen. An owner glancing between customers could easily read "last month's revenue" as "today's."
**Fix:** group by period visually — a subtle divider or two-row layout (this month/all-time) rather than four undifferentiated tiles — next time the dashboard gets touched. Low urgency, pairs naturally with the A2 month-grid fix already queued.

### C6 — CRM entry point is easy to miss 🟡
Vehicles/Customers live as two small outline buttons squeezed into the home screen's top row (`navRow`), visually secondary to the stat balloons below. Given CRM is a core daily task (checking a customer's history, adding a car) and not a rare action, it's easy for a new user to not notice it's there at all — nothing on the Calendar or +New screens points back to it either, aside from the vehicle-profile "new order" fast path in the other direction. Not wrong (5-tab decision was already deliberately made with Niko), just worth flagging as the one navigation spot most likely to cause "where do I find X" confusion for a first-time owner.
**Fix:** low-cost option — make the two buttons visually match primary actions more (they currently read as secondary/outline styling identical to less important actions elsewhere), or add a one-line onboarding tooltip pointing at them on first login. Not urgent.

## Suggested order
1. C2 (mechanical, ~10 min) + C1 quick-chip half of the fix, since intake-speed audit already scoped R1–R3.
2. C3 scroll-to-error (small, meaningfully reduces "why won't this save" confusion).
3. C4 (five minutes, one new i18n string pair).
4. C5 and C6 — fold into the next dashboard/navigation pass; not urgent, flagged for awareness.

## What's already right (don't regress these)
- Status color-coding, tinted badges, and consistent `FieldLabel` usage on every field *except* the ones flagged in C2.
- Auto-selecting the single linked customer, auto-summing price, auto-suggesting end time — genuinely removes decisions, not just keystrokes.
- Multi-day job overlap logic on the calendar is correct and non-obvious to get right; no confusion risk found there.
