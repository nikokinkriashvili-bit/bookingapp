import { useCallback, useMemo, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useThemeColors, type ThemeColors } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/providers/BusinessProvider";
import { useT } from "@/providers/LanguageProvider";
import { poStatusLabelKey, poStatusTone, type PoStatus } from "@/lib/inventory";
import { toDateKey } from "@/lib/calendarDate";

type PoRow = {
  id: string;
  status: PoStatus;
  currency: string;
  expected_delivery: string | null;
  created_at: string;
  suppliers: { name: string } | null;
  purchase_order_items: { qty: number; unit_price: number | null }[];
};

export default function PurchaseOrders() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { business } = useBusiness();
  const [orders, setOrders] = useState<PoRow[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!business) return;
      supabase
        .from("purchase_orders")
        .select(
          "id, status, currency, expected_delivery, created_at, suppliers(name), purchase_order_items(qty, unit_price)"
        )
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => setOrders((data as unknown as PoRow[]) ?? []));
    }, [business])
  );

  if (!orders) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("po.title")}</Text>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{t("po.empty")}</Text>}
        renderItem={({ item }) => {
          const total = item.purchase_order_items.reduce(
            (sum, i) => sum + Number(i.qty) * Number(i.unit_price ?? 0),
            0
          );
          return (
            <Pressable
              style={[styles.card, { borderLeftColor: poStatusTone(colors, item.status).border }]}
              onPress={() => router.push(`/inventory/orders/${item.id}`)}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardName}>{item.suppliers?.name ?? "—"}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: poStatusTone(colors, item.status).bg },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: poStatusTone(colors, item.status).text },
                    ]}
                  >
                    {t(poStatusLabelKey(item.status))}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardDetail}>
                {toDateKey(new Date(item.created_at))} ·{" "}
                {item.purchase_order_items.length} {t("po.items").toLowerCase()}
                {total > 0 ? ` · ${total.toFixed(2)} ${item.currency}` : ""}
              </Text>
              {item.expected_delivery ? (
                <Text style={styles.cardDetail}>
                  {t("po.expectedDelivery").split(" (")[0]}: {item.expected_delivery}
                </Text>
              ) : null}
            </Pressable>
          );
        }}
      />
    </View>
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
    flex: 1,
    padding: 24,
    gap: 12,
    backgroundColor: colors.bg,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
  },
  list: {
    gap: 8,
    paddingBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.surface,
    gap: 4,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  cardName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardDetail: {
    fontSize: 13,
    color: colors.inkSoft,
  },
  empty: {
    textAlign: "center",
    color: colors.muted,
    marginTop: 32,
    fontSize: 14,
  },
});
}
