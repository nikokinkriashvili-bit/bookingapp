// Visual system tokens — the single source of truth for color/shape decisions.
// Every screen resolves colors via useThemeColors() (ThemeProvider), never by
// importing a static palette — light and dark must both work from day one
// (per BookingApp_UXUI_Guidance_v1.md §3). The brand blue derives from the
// Georgian license plate band (see PlateChip), the app's signature element.

export type StatusTone = {
  border: string;
  bg: string;
  text: string;
};

export type ThemeColors = {
  mode: "light" | "dark";
  primary: string;
  primaryFaint: string; // selected-state / highlight fill
  plateBand: string; // exact plate band color, PlateChip only — not themed

  ink: string; // primary text
  inkSoft: string; // secondary text
  muted: string; // hints, captions, empty states

  line: string; // input & card borders
  faintLine: string; // hairlines, row separators
  bg: string; // screen background behind cards
  surface: string; // cards, inputs, modals

  danger: string;
  success: string;

  // Semantic tinted tones for status badges: pale bg + darker text of the
  // same hue (never a solid fill with white text — see UX guidance §4).
  // Job/stock/PO status colors all map onto these named tones.
  status: {
    info: StatusTone;
    warning: StatusTone;
    purple: StatusTone;
    success: StatusTone;
    teal: StatusTone;
    neutral: StatusTone;
    dangerSoft: StatusTone;
    dangerStrong: StatusTone;
  };
};

export const lightColors: ThemeColors = {
  mode: "light",
  primary: "#0B4DA2",
  primaryFaint: "#EAF1FB",
  plateBand: "#003DA5",

  ink: "#16181D",
  inkSoft: "#4A5058",
  muted: "#8A9099",

  line: "#DFE3E8",
  faintLine: "#F0F2F5",
  bg: "#F6F7F9",
  surface: "#FFFFFF",

  danger: "#D64541",
  success: "#2E9E5B",

  status: {
    info: { border: "#0B4DA2", bg: "#E4ECF9", text: "#0B4DA2" },
    warning: { border: "#C97A00", bg: "#FCEFD9", text: "#8A5300" },
    purple: { border: "#7C4FA6", bg: "#F1E9F7", text: "#6B3F94" },
    success: { border: "#2E9E5B", bg: "#E3F5EA", text: "#1F7A44" },
    teal: { border: "#0E7C6B", bg: "#DFF3EF", text: "#0B6357" },
    neutral: { border: "#8A9099", bg: "#EDEEEF", text: "#5B6068" },
    dangerSoft: { border: "#B23A2E", bg: "#FBE4E1", text: "#8C2A20" },
    dangerStrong: { border: "#7A1200", bg: "#F6DAD5", text: "#5C0E00" },
  },
};

export const darkColors: ThemeColors = {
  mode: "dark",
  primary: "#3E7BD6",
  primaryFaint: "#16283F",
  plateBand: "#003DA5",

  ink: "#F2F3F5",
  inkSoft: "#C3C8D1",
  muted: "#8B9099",

  line: "#33363C",
  faintLine: "#24262B",
  bg: "#121316", // off-black, never pure #000
  surface: "#1C1E22",

  danger: "#FF6B61",
  success: "#4CC985",

  status: {
    info: { border: "#5B9BEF", bg: "#16283F", text: "#8FBBF5" },
    warning: { border: "#F2B341", bg: "#3A2A0E", text: "#F2B341" },
    purple: { border: "#B98CDE", bg: "#2E2338", text: "#C9A6E6" },
    success: { border: "#4CC985", bg: "#163826", text: "#6FE0A3" },
    teal: { border: "#35BFA9", bg: "#0F2E2A", text: "#52D6C0" },
    neutral: { border: "#8B9099", bg: "#2A2C30", text: "#C4C8CD" },
    dangerSoft: { border: "#E06A5C", bg: "#3A1712", text: "#F0968A" },
    dangerStrong: { border: "#FF8A73", bg: "#3A1006", text: "#FFAE9E" },
  },
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
};
