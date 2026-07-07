import { Stack } from "expo-router";
import { AuthProvider } from "@/providers/AuthProvider";
import { BusinessProvider } from "@/providers/BusinessProvider";
import { CatalogProvider } from "@/providers/CatalogProvider";

export default function RootLayout() {
  return (
    <AuthProvider>
      <BusinessProvider>
        <CatalogProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </CatalogProvider>
      </BusinessProvider>
    </AuthProvider>
  );
}
