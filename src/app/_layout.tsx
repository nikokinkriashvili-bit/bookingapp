import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { BusinessProvider } from "@/providers/BusinessProvider";
import { CatalogProvider } from "@/providers/CatalogProvider";
import { LanguageProvider } from "@/providers/LanguageProvider";
import { ThemeProvider, useThemeColors } from "@/providers/ThemeProvider";
import { QuickSettingsButton } from "@/components/QuickSettingsButton";
import { RootErrorBoundary } from "@/components/RootErrorBoundary";

// Expo Router renders this if any screen throws (Stage 1.3).
export { RootErrorBoundary as ErrorBoundary };

// Only these top-level segments are reachable signed-out; everything else
// (tabs, onboarding, CRM) redirects to /login (Stage 1.4). RLS already
// protects the data — this closes the blank-screen UX hole on shared web URLs.
const PUBLIC_SEGMENTS = ["login", "sign-up"];

function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inPublicRoute = PUBLIC_SEGMENTS.includes(segments[0] as string);
    if (!session && !inPublicRoute) {
      router.replace("/login");
    }
  }, [session, isLoading, segments, router]);

  return <>{children}</>;
}

// Screens don't each set their own root background, so the themed backdrop
// (light/dark) is applied once here via the Stack's contentStyle.
function ThemedStack() {
  const colors = useThemeColors();
  return (
    <AuthGate>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      />
      <QuickSettingsButton />
    </AuthGate>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
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
    </SafeAreaProvider>
  );
}
