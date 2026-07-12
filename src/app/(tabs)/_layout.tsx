import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/providers/ThemeProvider";
import { useT } from "@/providers/LanguageProvider";
import { useBusiness } from "@/providers/BusinessProvider";

// Primary sections as a bottom tab bar (BookingApp_UXUI_Guidance_v1.md §6).
// Vehicles/Customers (CRM) and onboarding/auth stay outside this group —
// reached via Link from Home — since 6 top-level sections is too many for a
// phone-width tab bar (confirmed with Niko: 5 tabs, CRM lives under Home).
export default function TabsLayout() {
  const colors = useThemeColors();
  const t = useT();
  const { role } = useBusiness();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
        },
        // The Tabs navigator's scene container has its own default background,
        // separate from the parent Stack's contentStyle -- without this, every
        // screen inside the tab group (Home, Calendar, Inventory, Settings,
        // +New) stayed white in dark mode even though the Stack-level fix and
        // the tab bar chrome itself were both correctly themed.
        sceneStyle: {
          backgroundColor: colors.bg,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tab.home"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t("home.calendar"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: t("job.newOrderTitle"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: t("home.inventory"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("home.settings"),
          // Business settings stay owner-only; hide the tab for staff rather
          // than showing a screen that immediately blocks them.
          href: role === "owner" ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
