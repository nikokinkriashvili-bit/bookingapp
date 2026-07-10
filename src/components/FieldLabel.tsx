import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";
import { useThemeColors } from "@/providers/ThemeProvider";

// Visible label above a form field — per BookingApp_UXUI_Guidance_v1.md §9,
// a field's label must always be shown, not just as placeholder text that
// disappears on input. `styleOverride` is for lining up with a sibling input
// in a row layout (e.g. matching its flex sizing).
export function FieldLabel({
  children,
  styleOverride,
}: {
  children: string;
  styleOverride?: StyleProp<TextStyle>;
}) {
  const colors = useThemeColors();
  return (
    <Text style={[styles.label, { color: colors.inkSoft }, styleOverride]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: -4,
  },
});
