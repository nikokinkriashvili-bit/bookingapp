import { Link, Redirect } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors } from "@/lib/theme";
import { useAuth } from "@/providers/AuthProvider";
import { useBusiness } from "@/providers/BusinessProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { DashboardStats } from "@/components/DashboardStats";

export default function Index() {
  const { session, isLoading: isAuthLoading, signOut } = useAuth();
  const { business, isLoading: isBusinessLoading } = useBusiness();
  const { language, setLanguage, t } = useLanguage();

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
        <View>
          <Text style={styles.businessName}>{business.name}</Text>
          <Text style={styles.email}>{session.user.email}</Text>
        </View>
        <View style={styles.langToggle}>
          {(["ka", "en"] as const).map((lang) => (
            <Pressable
              key={lang}
              style={[styles.langOption, language === lang && styles.langOptionActive]}
              onPress={() => setLanguage(lang)}
            >
              <Text
                style={
                  language === lang ? styles.langTextActive : styles.langText
                }
              >
                {lang === "ka" ? "ქარ" : "EN"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Link href="/jobs/new" style={styles.newJobButton}>
        {t("home.addNewOrder")}
      </Link>

      <Link href="/calendar" style={styles.outlineButton}>
        {t("home.calendar")}
      </Link>

      <View style={styles.navRow}>
        <Link href="/vehicles" style={[styles.outlineButton, styles.navButton]}>
          {t("home.vehicles")}
        </Link>
        <Link href="/customers" style={[styles.outlineButton, styles.navButton]}>
          {t("home.customers")}
        </Link>
      </View>

      <View style={styles.navRow}>
        <Link href="/inventory" style={[styles.outlineButton, styles.navButton]}>
          {t("home.inventory")}
        </Link>
        <Link href="/settings" style={[styles.outlineButton, styles.navButton]}>
          {t("home.settings")}
        </Link>
      </View>

      <DashboardStats />

      <Text style={styles.signOut} onPress={signOut}>
        {t("home.signOut")}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  businessName: {
    fontSize: 20,
    fontWeight: "700",
  },
  email: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  langToggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    overflow: "hidden",
  },
  langOption: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  langOptionActive: {
    backgroundColor: colors.primary,
  },
  langText: {
    fontSize: 13,
    color: colors.inkSoft,
    fontWeight: "600",
  },
  langTextActive: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "600",
  },
  newJobButton: {
    backgroundColor: colors.primary,
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    padding: 14,
    borderRadius: 8,
    overflow: "hidden",
  },
  outlineButton: {
    backgroundColor: "#fff",
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
    gap: 10,
  },
  navButton: {
    flex: 1,
  },
  signOut: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    marginTop: 16,
  },
});
