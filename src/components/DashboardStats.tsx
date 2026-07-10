import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useThemeColors, type ThemeColors } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/providers/BusinessProvider";
import { useT } from "@/providers/LanguageProvider";
import { statusTone } from "@/lib/jobStatus";
import { formatGel } from "@/lib/i18n";
import { addMonths, startOfMonth } from "@/lib/calendarDate";

type Stats = {
  carsServiced: number;
  revenue: number;
  pendingPayments: number;
  currentJobs: number;
};

const CURRENT_STATUSES = ["booked", "in_progress", "awaiting_collection"];

export function DashboardStats() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { business } = useBusiness();
  const [stats, setStats] = useState<Stats | null>(null);

  const fetchStats = useCallback(async () => {
    if (!business) return;

    const now = new Date();
    const prevMonthStart = addMonths(startOfMonth(now), -1);
    const prevMonthEnd = startOfMonth(now);

    const [prevMonthResult, allTimeResult] = await Promise.all([
      supabase
        .from("jobs")
        .select("vehicle_id, status, price_total")
        .eq("business_id", business.id)
        .gte("scheduled_slot", prevMonthStart.toISOString())
        .lt("scheduled_slot", prevMonthEnd.toISOString()),
      supabase.from("jobs").select("status, price_total").eq("business_id", business.id),
    ]);

    const prevMonthJobs = prevMonthResult.data ?? [];
    const allJobs = allTimeResult.data ?? [];

    const finishedPrevMonth = prevMonthJobs.filter(
      (j) => j.status === "complete" || j.status === "paid"
    );
    const carsServiced = new Set(finishedPrevMonth.map((j) => j.vehicle_id)).size;
    const revenue = prevMonthJobs
      .filter((j) => j.status === "paid")
      .reduce((sum, j) => sum + (j.price_total ?? 0), 0);

    const pendingPayments = allJobs
      .filter((j) => j.status === "complete")
      .reduce((sum, j) => sum + (j.price_total ?? 0), 0);
    const currentJobs = allJobs.filter((j) => CURRENT_STATUSES.includes(j.status)).length;

    setStats({ carsServiced, revenue, pendingPayments, currentJobs });
  }, [business]);

  useEffect(() => {
    if (!business) return;
    fetchStats();

    const channel = supabase
      .channel(`jobs-dashboard-${business.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs",
          filter: `business_id=eq.${business.id}`,
        },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [business, fetchStats]);

  if (!stats) return null;

  const successTone = statusTone(colors, "complete");
  const tealTone = statusTone(colors, "paid");
  const warningTone = statusTone(colors, "in_progress");
  const infoTone = statusTone(colors, "booked");

  return (
    <View style={styles.grid}>
      <View style={[styles.balloon, { backgroundColor: successTone.bg }]}>
        <Text style={[styles.value, { color: successTone.text }]}>{stats.carsServiced}</Text>
        <Text style={[styles.label, { color: successTone.text }]}>
          {t("dash.carsServiced")}
        </Text>
      </View>
      <View style={[styles.balloon, { backgroundColor: tealTone.bg }]}>
        <Text style={[styles.value, { color: tealTone.text }]}>
          {formatGel(stats.revenue)}
        </Text>
        <Text style={[styles.label, { color: tealTone.text }]}>{t("dash.revenue")}</Text>
      </View>
      <View style={[styles.balloon, { backgroundColor: warningTone.bg }]}>
        <Text style={[styles.value, { color: warningTone.text }]}>
          {formatGel(stats.pendingPayments)}
        </Text>
        <Text style={[styles.label, { color: warningTone.text }]}>
          {t("dash.pendingPayments")}
        </Text>
      </View>
      <View style={[styles.balloon, { backgroundColor: infoTone.bg }]}>
        <Text style={[styles.value, { color: infoTone.text }]}>{stats.currentJobs}</Text>
        <Text style={[styles.label, { color: infoTone.text }]}>
          {t("dash.currentJobs")}
        </Text>
      </View>
      <View style={[styles.balloon, styles.placeholder]}>
        <Text style={styles.placeholderValue}>{t("dash.comingSoon")}</Text>
        <Text style={styles.placeholderLabel}>{t("dash.materialsThisMonth")}</Text>
      </View>
      <View style={[styles.balloon, styles.placeholder]}>
        <Text style={styles.placeholderValue}>{t("dash.comingSoon")}</Text>
        <Text style={styles.placeholderLabel}>{t("dash.materialsLastMonth")}</Text>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  balloon: {
    width: "47%",
    borderRadius: 10,
    padding: 12,
    minHeight: 72,
    justifyContent: "center",
  },
  value: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "700",
  },
  label: {
    color: colors.ink,
    fontSize: 11,
    marginTop: 4,
  },
  placeholder: {
    backgroundColor: colors.line,
  },
  placeholderValue: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    fontStyle: "italic",
  },
  placeholderLabel: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
  },
});
}
