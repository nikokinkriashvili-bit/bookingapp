import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/providers/ThemeProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useBusiness } from "@/providers/BusinessProvider";
import { QuickSettingsDrawer } from "@/components/QuickSettingsDrawer";

// Floating trigger for the quick-settings drawer (theme/language/sign-out) —
// rendered once at the root so it's reachable from every screen, including
// ones pushed outside the (tabs) group. Only shows once signed in with a
// business set up; login/onboarding have no need for it.
//
// Deliberately NOT wrapped in a full-screen overlay View: an earlier version
// covered the whole screen with an absoluteFill container using
// pointerEvents="box-none" to let touches pass through to whatever's
// underneath. That's a real CSS mechanism and worked with mouse clicks in
// desktop preview, but blocked real touch taps on the bottom tab bar on an
// actual phone. The button already has its own position:absolute with
// explicit offsets, so it doesn't need a full-screen parent — rendering it
// as a bare sibling means there is no invisible full-screen element for a
// touch event to ever land on in the first place.
export function QuickSettingsButton() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { business } = useBusiness();
  const [open, setOpen] = useState(false);

  if (!session || !business) return null;

  return (
    <>
      <Pressable
        style={[
          styles.button,
          { top: insets.top + 8, backgroundColor: colors.surface, borderColor: colors.line },
        ]}
        onPress={() => setOpen(true)}
      >
        <Ionicons name="settings-outline" size={20} color={colors.inkSoft} />
      </Pressable>
      <QuickSettingsDrawer visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
});
