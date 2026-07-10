import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useThemeColors, type ThemeColors } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/providers/BusinessProvider";
import { useT } from "@/providers/LanguageProvider";

type Supplier = { id: string; name: string };

export default function ProductForm() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { business } = useBusiness();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [missing, setMissing] = useState(false);

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [stockQty, setStockQty] = useState("");
  const [salesPerWeek, setSalesPerWeek] = useState("");
  const [safetyStock, setSafetyStock] = useState("");
  const [leadTimeOverride, setLeadTimeOverride] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [dutyRate, setDutyRate] = useState("");
  const [listPrice, setListPrice] = useState("");
  const [b2bPrice, setB2bPrice] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!business) return;
    supabase
      .from("suppliers")
      .select("id, name")
      .eq("business_id", business.id)
      .order("name")
      .then(({ data }) => setSuppliers(data ?? []));
  }, [business]);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setMissing(true);
          setLoading(false);
          return;
        }
        setSku(data.sku);
        setName(data.name);
        setCategory(data.category ?? "");
        setSupplierId(data.supplier_id);
        setStockQty(String(data.stock_qty ?? 0));
        setSalesPerWeek(String(data.sales_per_week ?? 0));
        setSafetyStock(String(data.safety_stock ?? 0));
        setLeadTimeOverride(
          data.lead_time_days_override != null ? String(data.lead_time_days_override) : ""
        );
        setPurchasePrice(data.purchase_price != null ? String(data.purchase_price) : "");
        setDutyRate(data.duty_rate_pct != null ? String(data.duty_rate_pct) : "");
        setListPrice(data.list_price_gel != null ? String(data.list_price_gel) : "");
        setB2bPrice(data.b2b_price_gel != null ? String(data.b2b_price_gel) : "");
        setLoading(false);
      });
  }, [id]);

  const onSave = async () => {
    if (!business) return;
    setError(null);
    if (!sku.trim() || !name.trim()) {
      setError(t("product.errorRequired"));
      return;
    }

    const numeric = (v: string) => (v.trim() ? Number(v) : 0);
    const numericOrNull = (v: string) => (v.trim() ? Number(v) : null);

    const values = {
      sku: sku.trim().toUpperCase(),
      name: name.trim(),
      category: category.trim() || null,
      supplier_id: supplierId,
      stock_qty: numeric(stockQty),
      sales_per_week: numeric(salesPerWeek),
      safety_stock: numeric(safetyStock),
      lead_time_days_override: numericOrNull(leadTimeOverride),
      purchase_price: numericOrNull(purchasePrice),
      duty_rate_pct: numeric(dutyRate),
      list_price_gel: numericOrNull(listPrice),
      b2b_price_gel: numericOrNull(b2bPrice),
    };

    setSubmitting(true);
    const { error: saveError } = isEdit
      ? await supabase.from("products").update(values).eq("id", id)
      : await supabase.from("products").insert({ ...values, business_id: business.id });
    setSubmitting(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (missing) {
    return (
      <View style={styles.centered}>
        <Text>{t("product.notFound")}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {isEdit ? t("product.editTitle") : t("product.newTitle")}
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("product.identity")}</Text>
        <TextInput
          style={styles.input}
          placeholder={t("product.sku")}
          autoCapitalize="characters"
          value={sku}
          onChangeText={(v) => setSku(v.toUpperCase())}
        />
        <TextInput
          style={styles.input}
          placeholder={t("product.name")}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder={t("product.category")}
          value={category}
          onChangeText={setCategory}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("product.supplier")}</Text>
        <Pressable
          style={[styles.option, supplierId === null && styles.optionSelected]}
          onPress={() => setSupplierId(null)}
        >
          <Text style={supplierId === null ? styles.optionTextSelected : styles.optionText}>
            {t("product.noSupplier")}
          </Text>
        </Pressable>
        {suppliers.map((s) => (
          <Pressable
            key={s.id}
            style={[styles.option, supplierId === s.id && styles.optionSelected]}
            onPress={() => setSupplierId(s.id)}
          >
            <Text style={supplierId === s.id ? styles.optionTextSelected : styles.optionText}>
              {s.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("product.stockSection")}</Text>
        <Text style={styles.fieldLabel}>{t("product.stockQty")}</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          keyboardType="numeric"
          value={stockQty}
          onChangeText={setStockQty}
        />
        <Text style={styles.fieldLabel}>{t("product.salesPerWeek")}</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          keyboardType="numeric"
          value={salesPerWeek}
          onChangeText={setSalesPerWeek}
        />
        <Text style={styles.fieldLabel}>{t("product.safetyStock")}</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          keyboardType="numeric"
          value={safetyStock}
          onChangeText={setSafetyStock}
        />
        <Text style={styles.fieldLabel}>{t("product.leadTimeOverride")}</Text>
        <TextInput
          style={styles.input}
          placeholder="—"
          keyboardType="numeric"
          value={leadTimeOverride}
          onChangeText={setLeadTimeOverride}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("product.pricingSection")}</Text>
        <Text style={styles.fieldLabel}>{t("product.purchasePrice")}</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          keyboardType="numeric"
          value={purchasePrice}
          onChangeText={setPurchasePrice}
        />
        <Text style={styles.fieldLabel}>{t("product.dutyRate")}</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          keyboardType="numeric"
          value={dutyRate}
          onChangeText={setDutyRate}
        />
        <Text style={styles.fieldLabel}>{t("product.listPrice")}</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          keyboardType="numeric"
          value={listPrice}
          onChangeText={setListPrice}
        />
        <Text style={styles.fieldLabel}>{t("product.b2bPrice")}</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          keyboardType="numeric"
          value={b2bPrice}
          onChangeText={setB2bPrice}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={onSave} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{t("common.save")}</Text>
        )}
      </Pressable>
    </ScrollView>
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
    marginTop: 4,
  },
  input: {
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.surface,
  },
  option: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 12,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  optionText: {
    color: colors.ink,
    fontSize: 15,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: "600",
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
  error: {
    color: colors.danger,
  },
});
}
