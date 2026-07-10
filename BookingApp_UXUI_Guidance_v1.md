# Booking App — UX/UI Design Guidance
**Version 1.0 | July 2026 | For the in-app product (not the future marketing site)**
**Direction confirmed: Trustworthy & Simple, light + dark mode both required**

---

## 1. What This Covers

This is guidance for the actual app screens being built in Claude Code (onboarding, job intake, calendar, CRM) — a mobile-first product used daily by a busy detailer on a phone between jobs, not a marketing page. It's a companion to `TRD.md`, not a replacement.

Note on the `design-taste-frontend` skill: it's built for web landing pages (Tailwind/Next.js/GSAP), and explicitly excludes dense product UI and native mobile from its scope. Its underlying taste principles (avoid generic AI defaults, one consistent system, real design decisions instead of clichés) still apply here conceptually — but the code-level guidance doesn't transfer directly to React Native. This doc adapts the same taste, for this stack.

---

## 2. Design Direction: Trustworthy & Simple

Confirmed direction (chosen over "modern/polished consumer" and "match carbros.pro branding"): clean, high-contrast, boring-in-a-good-way. The test for every screen: can a detailer glance at it for two seconds between jobs and know exactly what to do next? If a design choice doesn't serve that, cut it.

Reference points: think banking apps, POS systems, utility tools — not lifestyle or social apps. One accent color, thin dividers instead of heavy card boxes, no decorative motion, no gradients.

---

## 3. Light + Dark Mode (both required)

Every screen ships in both modes from the start — not light-only with dark bolted on later. Practical approach:

- Use a token-based color system (semantic names like `background`, `surface`, `textPrimary`, `textSecondary`, `border`, `accent`, `success`, `warning`, `danger`) rather than hardcoded hex values anywhere in component code. Each token resolves to a light value and a dark value.
- Respect the phone's system setting (`prefers-color-scheme` equivalent in Expo: `useColorScheme()`) by default. No separate in-app toggle needed for MVP unless you want one — system-follow is the simpler, more standard behavior.
- Never use pure black (`#000000`) or pure white (`#FFFFFF`) as backgrounds — use off-black/off-white for better depth and less eye strain (e.g. `#111214` dark background, `#FAFAFA` light background).
- Test every screen in both modes before calling it done. A screen you've only looked at in light mode is not finished.

---

## 4. Color System

One accent color, used consistently everywhere it means "primary action" or "selected/active state." Recommend a blue (reads as trustworthy, standard for utility tools, avoids the "AI purple" cliché) — but this is a real decision, not locked yet: pick one and use it identically across every screen, do not vary it per section.

Status colors carry real meaning and should map onto the job states from the TRD data model:
- Booked → neutral/gray
- In Progress → amber/warning
- Awaiting Collection → accent color
- Complete → gray/neutral (transitional)
- Paid → green/success
- Cancelled → red/danger, muted

Use the tinted-background + darker-text-of-same-color pattern for status badges (e.g. pale amber background with dark amber text), not solid color fills with white text — softer, more legible at a glance, and easier to keep accessible in both light and dark modes.

---

## 5. Typography

Two weights only (regular + medium/semibold) — avoid a large type scale with many weights, it adds visual noise without adding clarity. Avoid Inter as the automatic default; something like Geist, Inter Display, or a similarly neutral, highly legible sans works well for a trustworthy-utility feel — but any clean system font (San Francisco on iOS, Roboto on Android, via Expo's default) is a perfectly acceptable, zero-effort starting point for MVP. Don't over-invest in custom fonts before the core product works.

**Bilingual (Georgian + English) note:** Georgian script (Mkhedruli) has different letterforms and line-height needs than Latin script. Test every text-heavy screen with real Georgian strings, not just English placeholders — Georgian text often runs longer than the English equivalent, so don't design layouts with tight, exact-fit text containers.

---

## 6. Layout & Component Patterns (React Native specifics)

- **Component library:** for MVP, don't hand-roll every UI primitive. Recommend `react-native-paper` or `gluestack-ui` for buttons, inputs, and form controls — both support theming (light/dark, custom accent color) out of the box, saving significant build time versus building from scratch.
- **Tailwind bridge:** if you want the utility-class workflow (fast to write, easy to keep consistent), use **NativeWind** — it lets Tailwind classes work directly in React Native. This is optional but worth considering since it makes spacing/color consistency much easier to enforce across many screens.
- **Cards vs. dividers:** per the trustworthy-simple direction, prefer thin dividers between list rows (job lists, CRM entries) over boxed cards with shadows — matches the direction shown in the mockup comparison. Reserve elevated cards for genuinely distinct, tappable objects (e.g. a job summary you're about to edit), not for every list row.
- **Touch targets:** minimum 44x44pt tap targets throughout — this is a phone used with one hand, often with the detailer's hands not perfectly clean/precise.
- **Navigation:** bottom tab bar for primary sections (Schedule, Intake/+New, CRM, Settings) is the standard, low-risk pattern for this kind of app — don't reinvent navigation with something unfamiliar.

---

## 7. Screen-Specific Notes

### Job Intake
This is the highest-frequency, most time-critical screen (30-second target). One large plate-number field should dominate the screen — nothing else competes for attention until that's filled. Resist the urge to add extra fields or options visible by default; progressive disclosure (show service selection only after plate/vehicle is set) keeps it fast.

### Calendar / Schedule (already built, replacing the kanban)
Status color-coding should be the primary way information is scanned — a detailer should be able to tell job status from color alone, at a glance, without reading text. Keep the GEL period summaries visually secondary (smaller, muted color) to the actual job list, since the list is the primary task.

### Vehicle & Customer CRM (not yet built)
Vehicle profile and customer profile should follow the same list-with-dividers pattern as the schedule, not introduce a new visual language. Service history is naturally chronological — a simple reverse-chronological list (most recent first) with date, service, price per row is enough for MVP; no need for a visual timeline component.

### Onboarding
Each step should feel short and skippable-if-obvious (e.g. pre-filled working hours for the selected business type, with an "edit" affordance rather than requiring input). Progress indication (step 1 of 3) reduces anxiety for a first-time, non-technical user setting this up alone.

---

## 8. Interaction States (don't skip these)

Every screen needs, at minimum:
- **Loading state** — a simple skeleton or spinner matching the eventual layout shape, not a blank white screen.
- **Empty state** — e.g. "No jobs today" should look intentional, not like a bug, with a clear next action (the "+ New job" button).
- **Error state** — inline, plain-language messaging (e.g. "Couldn't save. Check your connection.") — never raw error codes or technical text shown to the detailer.

---

## 9. What to Deliberately Avoid

Carried over from the broader design-taste principles, adapted for this context:
- No decorative motion/animation — this app is a work tool, not a showcase. Simple, fast transitions only (screen changes, button press feedback).
- No gradients, glassmorphism, or "premium consumer" visual flourishes — those belong to the "modern & polished" direction that was explicitly not chosen.
- No more than one accent color on screen at once.
- No placeholder-as-label in forms (a field's label should always be visible, not just shown as grayed-out placeholder text that disappears on input).

---

## 10. Suggested Next Step

Since you've got the Figma plugin installed, once Claude Code has a few screens built (or even before, if you want to design first), it's worth using Figma to mock up the core screens (Schedule, Intake, CRM) properly before more code gets written around them — cheaper to iterate on a design than on shipped code. Happy to help set that up when you're ready.
