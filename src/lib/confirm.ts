import { Alert, Platform } from "react-native";

// Cross-platform confirmation. react-native-web's Alert.alert is a no-op, so
// fall back to window.confirm on web; use a native two-button Alert on phones.
// Returns true if the user confirmed. Pass already-localized strings.
export function confirmAsync(
  message: string,
  confirmLabel: string,
  cancelLabel: string
): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(
      typeof window !== "undefined" ? window.confirm(message) : true
    );
  }
  return new Promise((resolve) => {
    Alert.alert("", message, [
      { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
      { text: confirmLabel, style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}
