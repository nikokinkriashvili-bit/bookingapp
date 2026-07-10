import { useCallback, useMemo, useState } from "react";
import { Link, router, useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useThemeColors, type ThemeColors } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/providers/BusinessProvider";
import { useT } from "@/providers/LanguageProvider";
import {
  reorderPoint,
  stockStatus,
  stockStatusLabelKey,
  suggestedOrderQty,
  leadTimeDays,
  stockStatusTone,
  type StockStatus,
} from "@/lib/inventory";
import { draftPurchaseOrder } from "@/lib/purchaseOrders";

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  stock_qty: number;
  sales_per_week: number;
  safety_stock: number;
  lead_time_days_override: number | null;
  supplier_id: string | null;
  purchase_price: number | null;
};

type SupplierRow = { id: string; lead_time_days: number; moq: number | null };

const STATUS_SEVERITY: Record<StockStatus, number> = {
  critical: 0,
  order_now: 1,
  order_soon: 2,
  ok: 3,
};

export default function InventoryDashboard() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { business } = useBusiness();
  const t = useT();

  const [products, setProducts] = useState<ProductRow[] | null>(null);
  const [suppliers, setSuppliers] = useState<Map<string, SupplierRow>>(new Map());
  const [search, setSearch] = useState("");
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!business) return;
      Promise.all([
        supabase
          .from("products")
          .select(
            "id, sku, name, stock_qty, sales_per_week, safety_stock, lead_time_days_override, supplier_id, purchase_price"
          )
          .eq("business_id", business.id)
          .order("name"),
        supabase
          .from("suppliers")
          .select("id, lead_time_days, moq")
          .eq("business_id", business.id),
      ]).then(([productsResult, suppliersResult]) => {
        setProducts(productsResult.data ?? []);
        setSuppliers(new Map((suppliersResult.data ?? []).map((s) => [s.id, s])));
      });
    }, [business])
  );

  const rows = useMemo(() => {
    if (!products) return null;
    const q = search.trim().toLowerCase();
    const filtered = q
      ? products.filter(
          (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
        )
      : products;
    return filtered
      .map((p) => {
        const input = {
          ...p,
          supplierLeadTimeDays: p.supplier_id
            ? suppliers.get(p.supplier_id)?.lead_time_days ?? null
            : null,
        };
        const supplier = p.supplier_id ? suppliers.get(p.supplier_id) : undefined;
        return {
          product: p,
          status: stockStatus(input),
          point: reorderPoint(input),
          leadDays: leadTimeDays(input),
          orderQty: suggestedOrderQty(input, supplier?.moq ?? null),
        };
      })
      .sort(
        (a, b) =>
          STATUS_SEVERITY[a.status] - STATUS_SEVERITY[b.status] ||
          a.product.name.localeCompare(b.product.name)
      );
  }, [products, suppliers, search]);

  if (!rows) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t("inv.title")}</Text>
        <View style={styles.headerLinks}>
          <Link href="/inventory/orders" style={styles.suppliersLink}>
            {t("inv.orders")}
          </Link>
          <Link href="/inventory/incoming" style={styles.suppliersLink}>
            {t("inv.incoming")}
          </Link>
          <Link href="/inventory/suppliers" style={styles.suppliersLink}>
            {t("inv.suppliers")}
          </Link>
        </View>
      </View>

      <Link href="/inventory/product" style={styles.addButton}>
        {t("inv.addProduct")}
      </Link>

      <TextInput
        style={styles.search}
        placeholder={t("inv.searchPlaceholder")}
        value={search}
        onChangeText={setSearch}
      />

      {draftError ? <Text style={styles.error}>{draftError}</Text> : null}

      <FlatList
        data={rows}
        keyExtractor={(r) => r.product.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {search ? t("inv.noResults") : t("inv.empty")}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, { borderLeftColor: stockStatusTone(colors, item.status).border }]}
            onPress={() => router.push(`/inventory/product?id=${item.product.id}`)}
          >
            <View style={styles.cardTop}>
              <View style={styles.cardTitleWrap}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.product.name}
                </Text>
                <Text style={styles.cardSku}>{item.product.sku}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: stockStatusTone(colors, item.status).bg },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: stockStatusTone(colors, item.status).text },
                  ]}
                >
                  {t(stockStatusLabelKey(item.status))}
                </Text>
              </View>
            </View>
            <View style={styles.statRow}>
              <View style={styles.statCell}>
                <Text style={styles.statValue}>{item.product.stock_qty}</Text>
                <Text style={styles.statLabel}>{t("inv.stock")}</Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statValue}>{item.product.sales_per_week}</Text>
                <Text style={styles.statLabel}>{t("inv.salesPerWeek")}</Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statValue}>
                  {item.leadDays}
                  {t("inv.days")}
                </Text>
                <Text style={styles.statLabel}>{t("inv.leadTime")}</Text>
              </View>
              <View style={styles.statCell}>
                <Text style={styles.statValue}>{Math.ceil(item.point)}</Text>
                <Text style={styles.statLabel}>{t("inv.reorderAt")}</Text>
              </View>
            </View>
            {(item.status === "order_now" || item.status === "critical") &&
            item.product.supplier_id ? (
              <Pressable
                style={styles.orderButton}
                disabled={draftingId !== null}
                onPress={async () => {
                  if (!business) return;
                  setDraftError(null);
                  setDraftingId(item.product.id);
                  const { poId, error } = await draftPurchaseOrder({
                    businessId: business.id,
                    productId: item.product.id,
                    productName: item.product.name,
                    productSku: item.product.sku,
                    supplierId: item.product.supplier_id!,
                    qty: item.orderQty,
                    unitPrice: item.product.purchase_price,
                  });
                  setDraftingId(null);
                  if (error || !poId) {
                    setDraftError(error ?? "Failed to draft order.");
                    return;
                  }
                  router.push(`/inventory/orders/${poId}`);
                }}
              >
                {draftingId === item.product.id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.orderButtonText}>
                    {t("inv.orderQty")} {item.orderQty}
                  </Text>
                )}
              </Pressable>
            ) : null}
          </Pressable>
        )}
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLinks: {
    flexDirection: "row",
    gap: 16,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "600",
  },
  suppliersLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  addButton: {
    backgroundColor: colors.primary,
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    padding: 14,
    borderRadius: 8,
    overflow: "hidden",
  },
  search: {
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.surface,
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
    gap: 10,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  cardSku: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
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
  statRow: {
    flexDirection: "row",
    gap: 6,
  },
  statCell: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: "center",
  },
  statValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 1,
  },
  empty: {
    textAlign: "center",
    color: colors.muted,
    marginTop: 32,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
  },
  orderButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  orderButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
}
