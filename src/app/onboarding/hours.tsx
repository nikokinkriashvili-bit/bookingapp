import { Redirect, router } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMemo } from "react";
import { useThemeColors, type ThemeColors } from "@/providers/ThemeProvider";
import { WEEKDAYS, type Weekday } from "@/lib/businessTypes";
import { useOnboarding } from "@/providers/OnboardingProvider";
import { useT } from "@/providers/LanguageProvider";
import type { StringKey } from "@/lib/i18n";

export default function HoursStep() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { workingHours, setWorkingHours } = useOnboarding();
  const t = useT();

  if (!workingHours) {
    // Shouldn't happen in practice — business-type step always sets this
    // before navigating here.
    return <Redirect href="/onboarding/business-type" />;
  }

  const toggleDay = (day: Weekday, isOpen: boolean) => {
    setWorkingHours({
      ...workingHours,
      [day]: isOpen ? { open: "09:00", close: "18:00" } : null,
    });
  };

  const updateTime = (day: Weekday, field: "open" | "close", value: string) => {
    const current = workingHours[day];
    if (!current) return;
    setWorkingHours({
      ...workingHours,
      [day]: { ...current, [field]: value },
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t("onboarding.hoursTitle")}</Text>

      {WEEKDAYS.map((day) => {
        const hours = workingHours[day];
        return (
          <View key={day} style={styles.dayRow}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayLabel}>{t(`weekday.${day}` as StringKey)}</Text>
              <Switch value={!!hours} onValueChange={(v) => toggleDay(day, v)} />
            </View>
            {hours ? (
              <View style={styles.timeRow}>
                <TextInput
                  style={styles.timeInput}
                  value={hours.open}
                  onChangeText={(v) => updateTime(day, "open", v)}
                  placeholder="09:00"
                />
                <Text style={styles.timeSeparator}>{t("common.timeRangeSeparator")}</Text>
                <TextInput
                  style={styles.timeInput}
                  value={hours.close}
                  onChangeText={(v) => updateTime(day, "close", v)}
                  placeholder="18:00"
                />
              </View>
            ) : (
              <Text style={styles.closedText}>{t("common.closed")}</Text>
            )}
          </View>
        );
      })}

      <Pressable
        style={styles.button}
        onPress={() => router.push("/onboarding/services")}
      >
        <Text style={styles.buttonText}>{t("onboarding.continue")}</Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  container: {
    padding: 24,
    gap: 12,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  dayRow: {
    borderWidth: 1,
    borderColor: colors.faintLine,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayLabel: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "500",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeInput: {
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    width: 80,
    textAlign: "center",
  },
  timeSeparator: {
    color: colors.muted,
  },
  closedText: {
    color: colors.muted,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
}
