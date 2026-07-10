import { StyleSheet, Text, View } from "react-native";
import { useMemo } from "react";
import { useThemeColors, type ThemeColors } from "@/providers/ThemeProvider";
import { statusTone, type JobPeriodSummary } from "@/lib/jobStatus";
import { formatGel } from "@/lib/i18n";
import { useT } from "@/providers/LanguageProvider";

export function PeriodSummary({ total, completed, pending, paid }: JobPeriodSummary) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const completedTone = statusTone(colors, "complete");
  const paidTone = statusTone(colors, "paid");
  return (
    <View style={styles.row}>
      <View style={[styles.pill, { backgroundColor: colors.faintLine }]}>
        <Text style={[styles.pillValue, { color: colors.ink }]}>{formatGel(total)}</Text>
        <Text style={[styles.pillLabel, { color: colors.inkSoft }]}>
          {t("summary.total")}
        </Text>
      </View>
      <View style={[styles.pill, { backgroundColor: completedTone.bg }]}>
        <Text style={[styles.pillValue, { color: completedTone.text }]}>
          {formatGel(completed)}
        </Text>
        <Text style={[styles.pillLabel, { color: completedTone.text }]}>
          {t("summary.completed")}
        </Text>
      </View>
      <View style={[styles.pill, { backgroundColor: colors.faintLine }]}>
        <Text style={[styles.pillValue, { color: colors.ink }]}>{formatGel(pending)}</Text>
        <Text style={[styles.pillLabel, { color: colors.inkSoft }]}>
          {t("summary.pending")}
        </Text>
      </View>
      <View style={[styles.pill, { backgroundColor: paidTone.bg }]}>
        <Text style={[styles.pillValue, { color: paidTone.text }]}>{formatGel(paid)}</Text>
        <Text style={[styles.pillLabel, { color: paidTone.text }]}>{t("summary.paid")}</Text>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pill: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 2,
    alignItems: "center",
  },
  pillValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  pillLabel: {
    color: colors.ink,
    fontSize: 9,
    marginTop: 2,
    textAlign: "center",
  },
});
}
