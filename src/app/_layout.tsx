import { Stack } from "expo-router";
import { AuthProvider } from "@/providers/AuthProvider";
import { BusinessProvider } from "@/providers/BusinessProvider";
import { CatalogProvider } from "@/providers/CatalogProvider";
import { LanguageProvider } from "@/providers/LanguageProvider";

export default function RootLayout() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BusinessProvider>
          <CatalogProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </CatalogProvider>
        </BusinessProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
