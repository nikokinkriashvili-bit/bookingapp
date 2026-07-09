import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme";

// Renders a plate number styled after a Georgian license plate: blue EU-style
// band with "GE" on the left, bold spaced lettering on a white field. Used as
// the visual anchor across the CRM screens.
export function PlateChip({
  plate,
  size = "small",
}: {
  plate: string;
  size?: "small" | "large";
}) {
  const large = size === "large";
  return (
    <View style={[styles.chip, large && styles.chipLarge]}>
      <View style={[styles.band, large && styles.bandLarge]}>
        <Text style={[styles.bandText, large && styles.bandTextLarge]}>GE</Text>
      </View>
      <Text style={[styles.plate, large && styles.plateLarge]} numberOfLines={1}>
        {plate}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "stretch",
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#1a1a1a",
    borderRadius: 5,
    overflow: "hidden",
  },
  chipLarge: {
    borderWidth: 2,
    borderRadius: 7,
  },
  band: {
    backgroundColor: colors.plateBand,
    justifyContent: "flex-end",
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  bandLarge: {
    paddingHorizontal: 6,
    paddingBottom: 4,
  },
  bandText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "700",
  },
  bandTextLarge: {
    fontSize: 11,
  },
  plate: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: "#1a1a1a",
  },
  plateLarge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 24,
    letterSpacing: 3,
  },
});
