import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
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
export function QuickSettingsButton() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { business } = useBusiness();
  const [open, setOpen] = useState(false);

  if (!session || !business) return null;

  return (
    <View style={[styles.overlay, { pointerEvents: "box-none" }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  button: {
    position: "absolute",
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
