import { Link, Redirect } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMemo } from "react";
import { useThemeColors, type ThemeColors } from "@/providers/ThemeProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useBusiness } from "@/providers/BusinessProvider";
import { useT } from "@/providers/LanguageProvider";
import { DashboardStats } from "@/components/DashboardStats";

export default function Index() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { session, isLoading: isAuthLoading } = useAuth();
  const { business, isLoading: isBusinessLoading } = useBusiness();
  const t = useT();

  if (isAuthLoading || (session && isBusinessLoading)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!business) {
    return <Redirect href="/onboarding/business-type" />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.businessName} numberOfLines={1}>
          {business.name}
        </Text>
        <Text style={styles.email}>{session.user.email}</Text>
      </View>

      <View style={styles.navRow}>
        <Link href="/vehicles" style={[styles.outlineButton, styles.navButton]}>
          {t("home.vehicles")}
        </Link>
        <Link href="/customers" style={[styles.outlineButton, styles.navButton]}>
          {t("home.customers")}
        </Link>
        <Link href="/reminders" style={[styles.outlineButton, styles.navButton]}>
          {t("home.reminders")}
        </Link>
      </View>

      <DashboardStats />
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    padding: 24,
    gap: 10,
  },
  topRow: {
    marginBottom: 6,
    marginRight: 48,
  },
  businessName: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "700",
  },
  email: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  outlineButton: {
    backgroundColor: colors.surface,
    color: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    padding: 14,
    borderRadius: 8,
    overflow: "hidden",
  },
  navRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  navButton: {
    flexGrow: 1,
    flexBasis: "45%",
  },
});
}
