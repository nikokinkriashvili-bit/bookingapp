// Visual system tokens — the single source of truth for color/shape decisions.
// The brand blue derives from the Georgian license plate band (see PlateChip),
// the app's signature element. Change palette here, not in screen styles.

export const colors = {
  primary: "#0B4DA2", // brand blue, from the GE plate band
  primaryFaint: "#EAF1FB", // selected-state / highlight fill
  plateBand: "#003DA5", // exact plate band color, PlateChip only

  ink: "#16181D", // primary text
  inkSoft: "#4A5058", // secondary text
  muted: "#8A9099", // hints, captions, empty states

  line: "#DFE3E8", // input & card borders
  faintLine: "#F0F2F5", // hairlines, row separators
  bg: "#F6F7F9", // screen background behind cards
  surface: "#FFFFFF", // cards, inputs, modals

  danger: "#D64541",
  success: "#2E9E5B",
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
};
