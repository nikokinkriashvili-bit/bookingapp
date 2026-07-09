# Design

The visual system for BookingApp. Tokens live in `src/lib/theme.ts` — screens
must reference them, never hardcode palette hex values. Strategic context
(users, brand personality, principles) is in [PRODUCT.md](PRODUCT.md).

## Signature element

The **license-plate chip** (`src/components/PlateChip.tsx`): plate numbers
render styled after a real Georgian plate — blue band with "GE", bold spaced
lettering on a white field. It anchors the CRM screens and is where the brand
color comes from. Use it wherever a plate identifies a vehicle; don't render
plates as plain text.

## Color

| Token | Value | Use |
|---|---|---|
| `primary` | `#0B4DA2` | Brand blue (derived from the GE plate band). Buttons, links, selected states, "booked" status. |
| `primaryFaint` | `#EAF1FB` | Selected-option fill, today-cell highlight. |
| `plateBand` | `#003DA5` | Exact plate band color — PlateChip only. |
| `ink` / `inkSoft` / `muted` | `#16181D` / `#4A5058` / `#8A9099` | Text hierarchy: primary / secondary / hints & empty states. |
| `line` / `faintLine` | `#DFE3E8` / `#F0F2F5` | Input & card borders / hairline separators. |
| `bg` / `surface` | `#F6F7F9` / `#FFFFFF` | Screen background behind cards / cards, inputs, modals. |
| `danger` / `success` | `#D64541` / `#2E9E5B` | Errors / confirmations. |

Job status colors are semantic and live in `src/lib/jobStatus.ts`
(`STATUS_COLORS`); booked maps to `primary`, the rest keep their own hues
(amber in-progress, purple awaiting collection, green complete, teal paid,
gray cancelled). Status color appears as a card's left border or a small dot —
never as a full card fill.

## Typography

System font. Scale:

- **Screen title:** 24 / 700 (profile names, form titles)
- **Card primary line:** 15–16 / 600–700
- **Section label:** 12 / 700, uppercase, letterSpacing 0.8, `inkSoft` — the
  recurring structural device on form and profile screens
- **Body / detail:** 13–14, `inkSoft`
- **Caption / hint:** 11–12, `muted`
- Plate numbers: 800 weight with wide letterSpacing (via PlateChip)

## Shape & layout

- Cards and inputs: white surface, 1px `line` border, radius 8–10
- Screens with card lists sit on `bg` gray; form screens stay white
- Primary button: `primary` fill, white 16/600 text, radius 8, padding 14
- Secondary button: white fill, `primary` 1px border and text
- Mobile-first: single column, 24px screen padding, verified at ~375px width

## Language in UI

All strings go through the i18n table (`src/lib/i18n.ts`) — Georgian primary,
English secondary. Money renders as `250 ₾` via `formatGel()`, never "GEL".
Copy is written from the owner's side of the screen: plain verbs, sentence
case, errors say what to fix ("Enter a plate number."), empty states say what
will appear and how.
