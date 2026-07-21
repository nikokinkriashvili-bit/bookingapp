import { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeColors, type ThemeColors } from "@/providers/ThemeProvider";
import { useBusiness } from "@/providers/BusinessProvider";
import { useT } from "@/providers/LanguageProvider";
import { supabase } from "@/lib/supabase";
import { computeJobAlerts, computeLowStockAlerts, type Alert } from "@/lib/alerts";
import type { JobStatus } from "@/lib/jobStatus";

const OPEN_STATUSES: JobStatus[] = ["booked", "in_progress", "awaiting_collection"];

// Owner alerts (roadmap 4.6): low stock, overdue jobs, no-shows. Computed
// from data already needed elsewhere -- no separate alerts table. Only
// renders when there's something to say (no empty-state clutter on Home).
export function AlertsBanner() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { business } = useBusiness();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const load = useCallback(async () => {
    if (!business) return;
    const [productsResult, jobsResult] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, stock_qty, sales_per_week, safety_stock, lead_time_days_override, supplier_id")
        .eq("business_id", business.id),
      supabase
        .from("jobs")
        .select("id, status, scheduled_slot, scheduled_end, vehicles(plate_number)")
        .eq("business_id", business.id)
        .in("status", OPEN_STATUSES),
    ]);
    if (productsResult.error || jobsResult.error) return; // best-effort; not worth an error banner on Home

    const supplierIds = [
      ...new Set(
        (productsResult.data ?? []).map((p) => p.supplier_id).filter((id): id is string => !!id)
      ),
    ];
    const { data: suppliers } = supplierIds.length
      ? await supabase.from("suppliers").select("id, lead_time_days").in("id", supplierIds)
      : { data: [] as { id: string; lead_time_days: number | null }[] };
    const leadTimeBySupplier = new Map((suppliers ?? []).map((s) => [s.id, s.lead_time_days]));

    const lowStock = computeLowStockAlerts(
      (productsResult.data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        stock_qty: p.stock_qty,
        sales_per_week: p.sales_per_week,
        safety_stock: p.safety_stock,
        lead_time_days_override: p.lead_time_days_override,
        supplierLeadTimeDays: p.supplier_id ? leadTimeBySupplier.get(p.supplier_id) ?? null : null,
      }))
    );

    type JobRow = {
      id: string;
      status: JobStatus;
      scheduled_slot: string;
      scheduled_end: string;
      vehicles: { plate_number: string } | null;
    };
    const jobAlerts = computeJobAlerts(
      ((jobsResult.data ?? []) as unknown as JobRow[]).map((j) => ({
        id: j.id,
        status: j.status,
        scheduled_slot: j.scheduled_slot,
        scheduled_end: j.scheduled_end,
        plate_number: j.vehicles?.plate_number ?? "",
      }))
    );

    setAlerts([...lowStock, ...jobAlerts]);
  }, [business]);

  useEffect(() => {
    load();
  }, [load]);

  if (alerts.length === 0) return null;

  const onPress = (alert: Alert) => {
    if (alert.kind === "low_stock") router.push("/inventory");
    else router.push(`/jobs/${alert.jobId}/edit`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("alerts.title")}</Text>
      {alerts.map((alert, i) => (
        <Pressable
          key={`${alert.kind}-${alert.kind === "low_stock" ? alert.productId : alert.jobId}-${i}`}
          style={styles.row}
          onPress={() => onPress(alert)}
        >
          <Text style={styles.rowText}>
            {alert.kind === "low_stock"
              ? `${t("alerts.lowStock")}: ${alert.productName}`
              : alert.kind === "overdue"
                ? `${t("alerts.overdue")}: ${alert.plateNumber}`
                : `${t("alerts.noShow")}: ${alert.plateNumber}`}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      borderWidth: 1,
      borderColor: colors.status.warning.border,
      backgroundColor: colors.status.warning.bg,
      borderRadius: 10,
      padding: 12,
      gap: 6,
      marginTop: 10,
    },
    title: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.status.warning.text,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    row: {
      paddingVertical: 4,
    },
    rowText: {
      fontSize: 14,
      color: colors.status.warning.text,
    },
  });
}
