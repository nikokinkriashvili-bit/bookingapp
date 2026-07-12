import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ErrorBoundaryProps } from "expo-router";

// Rendered by Expo Router when a screen throws. It sits ABOVE the providers
// (the crash may be inside one of them), so it can't use useThemeColors/useT —
// everything here is self-contained and bilingual (both languages shown, since
// we can't trust the language provider survived). Wired via the ErrorBoundary
// export in app/_layout.tsx.
export function RootErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>⚠️</Text>
      <Text style={styles.title}>რაღაც შეფერხდა</Text>
      <Text style={styles.titleEn}>Something went wrong</Text>
      <Text style={styles.message} numberOfLines={4}>
        {error?.message ?? "Unexpected error"}
      </Text>
      <Pressable style={styles.button} onPress={() => retry()}>
        <Text style={styles.buttonText}>ხელახლა ცდა · Reload</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 8,
    backgroundColor: "#F6F7F9",
  },
  emoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#16181D",
  },
  titleEn: {
    fontSize: 15,
    color: "#4A5058",
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: "#8A9099",
    textAlign: "center",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#0B4DA2",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
