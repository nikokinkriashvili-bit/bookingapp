import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useThemeColors, type ThemeColors } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/providers/BusinessProvider";
import { useT } from "@/providers/LanguageProvider";
import { statusTone } from "@/lib/jobStatus";
import { formatGel } from "@/lib/i18n";
import { addMonths, startOfMonth } from "@/lib/calendarDate";
import { FetchError } from "@/components/FetchError";

type Stats = {
  carsServiced: number;
  revenue: number;
  pendingPayments: number;
  currentJobs: number;
  materialsThisMonth: number;
  materialsLastMonth: number;
};

type ReceivedPo = {
  received_at: string;
  purchase_order_items: { qty: number; unit_price: number | null }[];
};

const CURRENT_STATUSES = ["booked", "in_progress", "awaiting_collection"];

export function DashboardStats() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { business } = useBusiness();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!business) return;
    setError(false);

    const now = new Date();
    const prevMonthStart = addMonths(startOfMonth(now), -1);
    const prevMonthEnd = startOfMonth(now);
    const thisMonthEnd = addMonths(prevMonthEnd, 1);

    const [prevMonthResult, allTimeResult, receivedPoResult, paymentsResult] =
      await Promise.all([
        supabase
          .from("jobs")
          .select("vehicle_id, status, price_total")
          .eq("business_id", business.id)
          .gte("scheduled_slot", prevMonthStart.toISOString())
          .lt("scheduled_slot", prevMonthEnd.toISOString()),
        supabase.from("jobs").select("id, status, price_total").eq("business_id", business.id),
        // Both months in one query (previous month start through now) --
        // split client-side rather than firing two near-identical queries.
        supabase
          .from("purchase_orders")
          .select("received_at, purchase_order_items(qty, unit_price)")
          .eq("business_id", business.id)
          .eq("status", "received")
          .gte("received_at", prevMonthStart.toISOString()),
        supabase.from("payments").select("job_id, amount").eq("business_id", business.id),
      ]);

    if (
      prevMonthResult.error ||
      allTimeResult.error ||
      receivedPoResult.error ||
      paymentsResult.error
    ) {
      setError(true);
      return;
    }

    const prevMonthJobs = prevMonthResult.data ?? [];
    const allJobs = allTimeResult.data ?? [];
    const receivedPos = (receivedPoResult.data as unknown as ReceivedPo[]) ?? [];
    const paymentRows = (paymentsResult.data ?? []) as { job_id: string; amount: number }[];

    // Sum recorded payments per job so "pending" reflects the true remaining
    // balance on partially-paid jobs, not the whole price (roadmap 4.3b / F5).
    const paidByJob = new Map<string, number>();
    for (const p of paymentRows) {
      paidByJob.set(p.job_id, (paidByJob.get(p.job_id) ?? 0) + Number(p.amount));
    }

    const finishedPrevMonth = prevMonthJobs.filter(
      (j) => j.status === "complete" || j.status === "paid"
    );
    const carsServiced = new Set(finishedPrevMonth.map((j) => j.vehicle_id)).size;
    const revenue = prevMonthJobs
      .filter((j) => j.status === "paid")
      .reduce((sum, j) => sum + (j.price_total ?? 0), 0);

    const pendingPayments = allJobs
      .filter((j) => j.status === "complete")
      .reduce((sum, j) => {
        const remaining = (j.price_total ?? 0) - (paidByJob.get(j.id) ?? 0);
        return sum + Math.max(0, remaining);
      }, 0);
    const currentJobs = allJobs.filter((j) => CURRENT_STATUSES.includes(j.status)).length;

    const poSpend = (po: ReceivedPo) =>
      po.purchase_order_items.reduce(
        (sum, item) => sum + Number(item.qty) * Number(item.unit_price ?? 0),
        0
      );
    const materialsThisMonth = receivedPos
      .filter((po) => po.received_at >= prevMonthEnd.toISOString() && po.received_at < thisMonthEnd.toISOString())
      .reduce((sum, po) => sum + poSpend(po), 0);
    const materialsLastMonth = receivedPos
      .filter((po) => po.received_at >= prevMonthStart.toISOString() && po.received_at < prevMonthEnd.toISOString())
      .reduce((sum, po) => sum + poSpend(po), 0);

    setStats({
      carsServiced,
      revenue,
      pendingPayments,
      currentJobs,
      materialsThisMonth,
      materialsLastMonth,
    });
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

  if (error) return <FetchError onRetry={fetchStats} />;
  if (!stats) return null;

  const successTone = statusTone(colors, "complete");
  const tealTone = statusTone(colors, "paid");
  const warningTone = statusTone(colors, "in_progress");
  const infoTone = statusTone(colors, "booked");
  const neutralTone = statusTone(colors, "cancelled");

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
      <View style={[styles.balloon, { backgroundColor: neutralTone.bg }]}>
        <Text style={[styles.value, { color: neutralTone.text }]}>
          {formatGel(stats.materialsThisMonth)}
        </Text>
        <Text style={[styles.label, { color: neutralTone.text }]}>
          {t("dash.materialsThisMonth")}
        </Text>
      </View>
      <View style={[styles.balloon, { backgroundColor: neutralTone.bg }]}>
        <Text style={[styles.value, { color: neutralTone.text }]}>
          {formatGel(stats.materialsLastMonth)}
        </Text>
        <Text style={[styles.label, { color: neutralTone.text }]}>
          {t("dash.materialsLastMonth")}
        </Text>
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
});
}
