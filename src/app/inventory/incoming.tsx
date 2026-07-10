import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/providers/BusinessProvider";
import { useT } from "@/providers/LanguageProvider";
import { PO_STATUS_COLORS, poStatusLabelKey, type PoStatus } from "@/lib/inventory";
import { toDateKey } from "@/lib/calendarDate";

// Incoming purchase orders — POs sent by businesses that list this business
// as a linked supplier (BRD §6.6 / §17.6). Read-only for now: the richer
// fulfilment pipeline (picking/dispatch states) waits for the importer TRD.

type IncomingPo = {
  id: string;
  status: PoStatus;
  created_at: string;
  expected_delivery: string | null;
  business_id: string;
  purchase_order_items: { product_name: string | null; product_sku: string | null; qty: number }[];
};

export default function IncomingOrders() {
  const t = useT();
  const { business } = useBusiness();
  const [orders, setOrders] = useState<IncomingPo[] | null>(null);
  const [buyerNames, setBuyerNames] = useState<Map<string, string>>(new Map());

  useFocusEffect(
    useCallback(() => {
      if (!business) return;
      (async () => {
        // RLS returns own POs plus POs addressed to this business via a
        // linked supplier; keep only the incoming ones, drafts excluded.
        const { data } = await supabase
          .from("purchase_orders")
          .select(
            "id, status, created_at, expected_delivery, business_id, purchase_order_items(product_name, product_sku, qty)"
          )
          .neq("business_id", business.id)
          .neq("status", "draft")
          .order("created_at", { ascending: false });
        const incoming = (data as unknown as IncomingPo[]) ?? [];
        setOrders(incoming);

        const buyerIds = [...new Set(incoming.map((o) => o.business_id))];
        if (buyerIds.length > 0) {
          const { data: names } = await supabase
            .from("business_directory")
            .select("id, name")
            .in("id", buyerIds);
          setBuyerNames(new Map((names ?? []).map((n) => [n.id, n.name])));
        }
      })();
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
      <Text style={styles.title}>{t("incoming.title")}</Text>
      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{t("incoming.empty")}</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, { borderLeftColor: PO_STATUS_COLORS[item.status] }]}>
            <View style={styles.cardTop}>
              <Text style={styles.cardName}>
                {t("incoming.from")}: {buyerNames.get(item.business_id) ?? "…"}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: PO_STATUS_COLORS[item.status] },
                ]}
              >
                <Text style={styles.statusBadgeText}>
                  {t(poStatusLabelKey(item.status))}
                </Text>
              </View>
            </View>
            <Text style={styles.cardDetail}>
              {toDateKey(new Date(item.created_at))}
              {item.expected_delivery ? ` · ${item.expected_delivery}` : ""}
            </Text>
            {item.purchase_order_items.map((line, i) => (
              <Text key={i} style={styles.lineText}>
                {line.qty} × {line.product_name ?? "—"}
                {line.product_sku ? ` (${line.product_sku})` : ""}
              </Text>
            ))}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  cardDetail: {
    fontSize: 12,
    color: colors.muted,
  },
  lineText: {
    fontSize: 14,
    color: colors.inkSoft,
  },
  empty: {
    textAlign: "center",
    color: colors.muted,
    marginTop: 32,
    fontSize: 14,
  },
});
