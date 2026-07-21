import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { supabase } from "@/lib/supabase";

// Push notification registration seam (roadmap 4.6). Registers this device's
// Expo push token so a future Edge Function (Stage 6) can send owner alerts
// without the app open. Best-effort throughout: web doesn't support Expo
// push tokens, permission may be denied, and getExpoPushTokenAsync needs an
// EAS project id this app doesn't have configured yet -- none of that should
// ever break the screen that calls this.
export async function registerPushToken(businessId: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") return;

    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await supabase
      .from("push_tokens")
      .upsert(
        { business_id: businessId, token, platform: Platform.OS },
        { onConflict: "token" }
      );
  } catch {
    // No EAS project id configured yet, or permission/device issue -- this
    // is a seam for Stage 6, not a required capability today.
  }
}
