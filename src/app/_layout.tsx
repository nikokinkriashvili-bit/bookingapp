import { Stack } from "expo-router";
import { AuthProvider } from "@/providers/AuthProvider";
import { BusinessProvider } from "@/providers/BusinessProvider";
import { CatalogProvider } from "@/providers/CatalogProvider";
import { LanguageProvider } from "@/providers/LanguageProvider";
import { ThemeProvider, useThemeColors } from "@/providers/ThemeProvider";

// Screens don't each set their own root background, so the themed backdrop
// (light/dark) is applied once here via the Stack's contentStyle.
function ThemedStack() {
  const colors = useThemeColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <BusinessProvider>
            <CatalogProvider>
              <ThemedStack />
            </CatalogProvider>
          </BusinessProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
