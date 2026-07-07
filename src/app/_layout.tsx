import { Stack } from "expo-router";
import { AuthProvider } from "@/providers/AuthProvider";
import { BusinessProvider } from "@/providers/BusinessProvider";

export default function RootLayout() {
  return (
    <AuthProvider>
      <BusinessProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </BusinessProvider>
    </AuthProvider>
  );
}
