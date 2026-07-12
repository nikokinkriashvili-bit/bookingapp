import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeColors, type ThemeColors } from "@/providers/ThemeProvider";
import { useT } from "@/providers/LanguageProvider";

// Shown when a fetch fails, so a connection problem reads as "couldn't load,
// retry" instead of an empty list that looks like "you have no data" (Stage 1.5).
export function FetchError({ onRetry }: { onRetry: () => void }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{t("common.loadError")}</Text>
      <Pressable style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>{t("common.retry")}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      gap: 12,
    },
    message: {
      color: colors.inkSoft,
      fontSize: 14,
      textAlign: "center",
    },
    button: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 24,
    },
    buttonText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: "600",
    },
  });
}
