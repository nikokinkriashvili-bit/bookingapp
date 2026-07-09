import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/providers/BusinessProvider";
import { useT } from "@/providers/LanguageProvider";
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

  return (
    <View style={styles.grid}>
      <View style={[styles.balloon, { backgroundColor: "#2ECC71" }]}>
        <Text style={styles.value}>{stats.carsServiced}</Text>
        <Text style={styles.label}>{t("dash.carsServiced")}</Text>
      </View>
      <View style={[styles.balloon, { backgroundColor: "#16A085" }]}>
        <Text style={styles.value}>{formatGel(stats.revenue)}</Text>
        <Text style={styles.label}>{t("dash.revenue")}</Text>
      </View>
      <View style={[styles.balloon, { backgroundColor: "#607D8B" }]}>
        <Text style={styles.value}>{formatGel(stats.pendingPayments)}</Text>
        <Text style={styles.label}>{t("dash.pendingPayments")}</Text>
      </View>
      <View style={[styles.balloon, { backgroundColor: colors.primary }]}>
        <Text style={styles.value}>{stats.currentJobs}</Text>
        <Text style={styles.label}>{t("dash.currentJobs")}</Text>
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

const styles = StyleSheet.create({
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
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  label: {
    color: "#fff",
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
