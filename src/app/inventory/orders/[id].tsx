import { useCallback, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/providers/BusinessProvider";
import { useT } from "@/providers/LanguageProvider";
import { PO_STATUS_COLORS, poStatusLabelKey, type PoStatus } from "@/lib/inventory";
import { receivePurchaseOrder } from "@/lib/purchaseOrders";
import { toDateKey } from "@/lib/calendarDate";

type Po = {
  id: string;
  status: PoStatus;
  currency: string;
  expected_delivery: string | null;
  created_at: string;
  suppliers: { name: string } | null;
};

type PoItem = {
  id: string;
  product_id: string;
  qty: number;
  unit_price: number | null;
  products: { name: string; sku: string } | null;
};

type ProductOption = {
  id: string;
  name: string;
  sku: string;
  purchase_price: number | null;
};

export default function PurchaseOrderDetail() {
  const t = useT();
  const { business } = useBusiness();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [po, setPo] = useState<Po | null>(null);
  const [items, setItems] = useState<PoItem[]>([]);
  const [loading, setLoading] = useState(true);
  // Draft-mode edit buffers keyed by item id.
  const [qtyEdits, setQtyEdits] = useState<Record<string, string>>({});
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({});
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [poResult, itemsResult] = await Promise.all([
      supabase
        .from("purchase_orders")
        .select("id, status, currency, expected_delivery, created_at, suppliers(name)")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("purchase_order_items")
        .select("id, product_id, qty, unit_price, products(name, sku)")
        .eq("purchase_order_id", id),
    ]);
    const poData = poResult.data as unknown as Po | null;
    const itemData = (itemsResult.data as unknown as PoItem[]) ?? [];
    setPo(poData);
    setItems(itemData);
    setExpectedDelivery(poData?.expected_delivery ?? "");
    setQtyEdits(Object.fromEntries(itemData.map((i) => [i.id, String(i.qty)])));
    setPriceEdits(
      Object.fromEntries(
        itemData.map((i) => [i.id, i.unit_price != null ? String(i.unit_price) : ""])
      )
    );
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const isDraft = po?.status === "draft";

  const saveDraft = async () => {
    if (!po) return;
    setError(null);
    setBusy(true);
    for (const item of items) {
      const qty = Number(qtyEdits[item.id]);
      const price = priceEdits[item.id]?.trim() ? Number(priceEdits[item.id]) : null;
      if (isNaN(qty) || qty <= 0) continue;
      const { error: itemError } = await supabase
        .from("purchase_order_items")
        .update({ qty, unit_price: price })
        .eq("id", item.id);
      if (itemError) {
        setBusy(false);
        setError(itemError.message);
        return;
      }
    }
    const { error: poError } = await supabase
      .from("purchase_orders")
      .update({ expected_delivery: expectedDelivery.trim() || null })
      .eq("id", po.id);
    setBusy(false);
    if (poError) {
      setError(poError.message);
      return;
    }
    load();
  };

  const removeItem = async (itemId: string) => {
    await supabase.from("purchase_order_items").delete().eq("id", itemId);
    load();
  };

  const openPicker = async () => {
    if (!business) return;
    const { data } = await supabase
      .from("products")
      .select("id, name, sku, purchase_price")
      .eq("business_id", business.id)
      .order("name");
    const existing = new Set(items.map((i) => i.product_id));
    setProductOptions((data ?? []).filter((p) => !existing.has(p.id)));
    setPickerOpen(true);
  };

  const addItem = async (product: ProductOption) => {
    if (!po) return;
    setPickerOpen(false);
    await supabase.from("purchase_order_items").insert({
      purchase_order_id: po.id,
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      qty: 1,
      unit_price: product.purchase_price,
    });
    load();
  };

  const setStatus = async (status: PoStatus) => {
    if (!po) return;
    setError(null);
    setBusy(true);
    if (status === "received") {
      const receiveError = await receivePurchaseOrder(
        po.id,
        items.map((i) => ({ product_id: i.product_id, qty: Number(i.qty) }))
      );
      setBusy(false);
      if (receiveError) {
        setError(receiveError);
        return;
      }
    } else {
      const { error: statusError } = await supabase
        .from("purchase_orders")
        .update({
          status,
          ...(status === "sent" ? { sent_at: new Date().toISOString() } : {}),
        })
        .eq("id", po.id);
      setBusy(false);
      if (statusError) {
        setError(statusError.message);
        return;
      }
    }
    if (status === "cancelled") {
      router.back();
      return;
    }
    load();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!po) {
    return (
      <View style={styles.centered}>
        <Text>{t("po.notFound")}</Text>
      </View>
    );
  }

  const total = items.reduce((sum, i) => {
    const qty = isDraft ? Number(qtyEdits[i.id]) || 0 : Number(i.qty);
    const price = isDraft
      ? Number(priceEdits[i.id]) || 0
      : Number(i.unit_price ?? 0);
    return sum + qty * price;
  }, 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{po.suppliers?.name ?? "—"}</Text>
        <View
          style={[styles.statusBadge, { backgroundColor: PO_STATUS_COLORS[po.status] }]}
        >
          <Text style={styles.statusBadgeText}>{t(poStatusLabelKey(po.status))}</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>{toDateKey(new Date(po.created_at))}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("po.items")}</Text>
        {items.length === 0 ? (
          <Text style={styles.empty}>{t("po.itemsEmpty")}</Text>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemTop}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.products?.name ?? "—"}
                </Text>
                {isDraft ? (
                  <Pressable onPress={() => removeItem(item.id)}>
                    <Text style={styles.removeText}>×</Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.itemSku}>{item.products?.sku}</Text>
              {isDraft ? (
                <View style={styles.itemInputs}>
                  <View style={styles.itemInputWrap}>
                    <Text style={styles.fieldLabel}>{t("po.qty")}</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={qtyEdits[item.id] ?? ""}
                      onChangeText={(v) =>
                        setQtyEdits((prev) => ({ ...prev, [item.id]: v }))
                      }
                    />
                  </View>
                  <View style={styles.itemInputWrap}>
                    <Text style={styles.fieldLabel}>
                      {t("po.unitPrice")} ({po.currency})
                    </Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={priceEdits[item.id] ?? ""}
                      onChangeText={(v) =>
                        setPriceEdits((prev) => ({ ...prev, [item.id]: v }))
                      }
                    />
                  </View>
                </View>
              ) : (
                <Text style={styles.itemDetail}>
                  {t("po.qty")}: {item.qty}
                  {item.unit_price != null
                    ? ` · ${item.unit_price} ${po.currency}`
                    : ""}
                </Text>
              )}
            </View>
          ))
        )}
        {isDraft ? (
          <Pressable style={styles.addItemButton} onPress={openPicker}>
            <Text style={styles.addItemText}>{t("po.addItem")}</Text>
          </Pressable>
        ) : null}
        {total > 0 ? (
          <Text style={styles.totalText}>
            {t("po.total")}: {total.toFixed(2)} {po.currency}
          </Text>
        ) : null}
      </View>

      {isDraft || po.status === "sent" ? (
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>{t("po.expectedDelivery")}</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            editable={isDraft}
            value={expectedDelivery}
            onChangeText={setExpectedDelivery}
          />
        </View>
      ) : po.expected_delivery ? (
        <Text style={styles.subtitle}>
          {t("po.expectedDelivery").split(" (")[0]}: {po.expected_delivery}
        </Text>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isDraft ? (
        <>
          <Pressable style={styles.primaryButton} onPress={saveDraft} disabled={busy}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>{t("common.save")}</Text>
            )}
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => setStatus("sent")}
            disabled={busy || items.length === 0}
          >
            <Text style={styles.secondaryButtonText}>{t("po.markSent")}</Text>
          </Pressable>
        </>
      ) : null}

      {po.status === "sent" ? (
        <Pressable
          style={styles.primaryButton}
          onPress={() => setStatus("received")}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>{t("po.markReceived")}</Text>
          )}
        </Pressable>
      ) : null}

      {isDraft || po.status === "sent" ? (
        <Pressable
          style={styles.dangerButton}
          onPress={() => setStatus("cancelled")}
          disabled={busy}
        >
          <Text style={styles.dangerButtonText}>{t("po.cancelOrder")}</Text>
        </Pressable>
      ) : null}

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("po.pickProduct")}</Text>
            <ScrollView style={styles.modalScroll}>
              {productOptions.map((p) => (
                <Pressable
                  key={p.id}
                  style={styles.modalOption}
                  onPress={() => addItem(p)}
                >
                  <Text style={styles.modalOptionText}>
                    {p.name} · {p.sku}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    padding: 24,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    flex: 1,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
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
  section: {
    gap: 8,
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.surface,
    gap: 6,
  },
  itemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  itemSku: {
    fontSize: 12,
    color: colors.muted,
  },
  itemDetail: {
    fontSize: 14,
    color: colors.inkSoft,
  },
  itemInputs: {
    flexDirection: "row",
    gap: 8,
  },
  itemInputWrap: {
    flex: 1,
    gap: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: colors.surface,
  },
  removeText: {
    fontSize: 20,
    color: colors.danger,
    paddingHorizontal: 6,
  },
  addItemButton: {
    padding: 10,
    alignItems: "center",
  },
  addItemText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  totalText: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right",
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  dangerButtonText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "600",
  },
  empty: {
    color: colors.muted,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    width: 300,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  modalScroll: {
    maxHeight: 360,
  },
  modalOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.faintLine,
  },
  modalOptionText: {
    fontSize: 14,
  },
});
