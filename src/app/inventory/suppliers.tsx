import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
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
import { useThemeColors, type ThemeColors } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/providers/BusinessProvider";
import { useT } from "@/providers/LanguageProvider";

type Supplier = {
  id: string;
  name: string;
  country: string | null;
  currency: string;
  lead_time_days: number;
  moq: number | null;
  payment_terms: string | null;
  linked_business_id: string | null;
};

type DirectoryEntry = { id: string; name: string };

export default function Suppliers() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { business } = useBusiness();

  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [directory, setDirectory] = useState<DirectoryEntry[]>([]);
  // null = closed, "new" = adding, otherwise the id being edited
  const [editing, setEditing] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [leadTime, setLeadTime] = useState("30");
  const [moq, setMoq] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [linkedBusinessId, setLinkedBusinessId] = useState<string | null>(null);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    if (!business) return;
    supabase
      .from("suppliers")
      .select(
        "id, name, country, currency, lead_time_days, moq, payment_terms, linked_business_id"
      )
      .eq("business_id", business.id)
      .order("name")
      .then(({ data }) => setSuppliers(data ?? []));
    supabase
      .from("business_directory")
      .select("id, name")
      .neq("id", business.id)
      .order("name")
      .then(({ data }) => setDirectory(data ?? []));
  }, [business]);

  useFocusEffect(load);

  const directoryName = (businessId: string | null) =>
    businessId ? directory.find((d) => d.id === businessId)?.name ?? null : null;

  const openForm = (supplier: Supplier | null) => {
    setName(supplier?.name ?? "");
    setCountry(supplier?.country ?? "");
    setCurrency(supplier?.currency ?? "EUR");
    setLeadTime(String(supplier?.lead_time_days ?? 30));
    setMoq(supplier?.moq != null ? String(supplier.moq) : "");
    setPaymentTerms(supplier?.payment_terms ?? "");
    setLinkedBusinessId(supplier?.linked_business_id ?? null);
    setError(null);
    setEditing(supplier?.id ?? "new");
  };

  const onSave = async () => {
    if (!business || !editing) return;
    setError(null);
    if (!name.trim()) {
      setError(t("supplier.errorRequired"));
      return;
    }

    const values = {
      name: name.trim(),
      country: country.trim() || null,
      currency: currency.trim().toUpperCase() || "EUR",
      lead_time_days: leadTime.trim() ? Number(leadTime) : 30,
      moq: moq.trim() ? Number(moq) : null,
      payment_terms: paymentTerms.trim() || null,
      linked_business_id: linkedBusinessId,
    };

    setSubmitting(true);
    const { error: saveError } =
      editing === "new"
        ? await supabase.from("suppliers").insert({ ...values, business_id: business.id })
        : await supabase.from("suppliers").update(values).eq("id", editing);
    setSubmitting(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }
    setEditing(null);
    load();
  };

  if (!suppliers) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t("inv.suppliers")}</Text>

      {editing === null ? (
        <Pressable style={styles.addButton} onPress={() => openForm(null)}>
          <Text style={styles.addButtonText}>{t("supplier.add")}</Text>
        </Pressable>
      ) : (
        <View style={styles.form}>
          <Text style={styles.sectionLabel}>
            {editing === "new" ? t("supplier.newTitle") : t("supplier.editTitle")}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={t("supplier.name")}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder={t("supplier.country")}
            value={country}
            onChangeText={setCountry}
          />
          <TextInput
            style={styles.input}
            placeholder={t("supplier.currency")}
            autoCapitalize="characters"
            value={currency}
            onChangeText={(v) => setCurrency(v.toUpperCase())}
          />
          <Text style={styles.fieldLabel}>{t("supplier.leadTime")}</Text>
          <TextInput
            style={styles.input}
            placeholder="30"
            keyboardType="numeric"
            value={leadTime}
            onChangeText={setLeadTime}
          />
          <Text style={styles.fieldLabel}>{t("supplier.moq")}</Text>
          <TextInput
            style={styles.input}
            placeholder="—"
            keyboardType="numeric"
            value={moq}
            onChangeText={setMoq}
          />
          <TextInput
            style={styles.input}
            placeholder={t("supplier.paymentTerms")}
            value={paymentTerms}
            onChangeText={setPaymentTerms}
          />

          <Text style={styles.fieldLabel}>{t("supplier.linkSection")}</Text>
          {linkedBusinessId ? (
            <View style={styles.linkRow}>
              <Text style={styles.linkedName}>
                {directoryName(linkedBusinessId) ?? "…"}
              </Text>
              <Pressable onPress={() => setLinkedBusinessId(null)}>
                <Text style={styles.unlinkText}>{t("supplier.unlink")}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.linkButton} onPress={() => setLinkPickerOpen(true)}>
              <Text style={styles.linkButtonText}>{t("supplier.linkPick")}</Text>
            </Pressable>
          )}
          <Text style={styles.linkHint}>{t("supplier.linkHint")}</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.formActions}>
            <Pressable style={styles.secondaryButton} onPress={() => setEditing(null)}>
              <Text style={styles.secondaryButtonText}>{t("common.cancel")}</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={onSave} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>{t("common.save")}</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {suppliers.length === 0 && editing === null ? (
        <Text style={styles.empty}>{t("supplier.empty")}</Text>
      ) : (
        suppliers.map((s) => (
          <Pressable key={s.id} style={styles.card} onPress={() => openForm(s)}>
            <View style={styles.cardTop}>
              <Text style={styles.cardName}>{s.name}</Text>
              <View style={styles.cardTopRight}>
                {s.linked_business_id ? (
                  <View style={styles.linkedBadge}>
                    <Text style={styles.linkedBadgeText}>{t("supplier.linked")}</Text>
                  </View>
                ) : null}
                <Text style={styles.cardCurrency}>{s.currency}</Text>
              </View>
            </View>
            <Text style={styles.cardDetail}>
              {[
                s.country,
                `${t("supplier.leadTime")}: ${s.lead_time_days}`,
                s.moq != null ? `${t("supplier.moq")}: ${s.moq}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
            {s.payment_terms ? (
              <Text style={styles.cardDetail}>{s.payment_terms}</Text>
            ) : null}
          </Pressable>
        ))
      )}

      <Modal
        visible={linkPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLinkPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setLinkPickerOpen(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("supplier.linkPick")}</Text>
            <ScrollView style={styles.modalScroll}>
              {directory.map((d) => (
                <Pressable
                  key={d.id}
                  style={styles.modalOption}
                  onPress={() => {
                    setLinkedBusinessId(d.id);
                    setLinkPickerOpen(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{d.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
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
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    padding: 24,
    gap: 12,
  },
  title: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  form: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 14,
    gap: 8,
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
  formActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.surface,
    gap: 4,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  cardCurrency: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
  },
  cardDetail: {
    fontSize: 13,
    color: colors.inkSoft,
  },
  empty: {
    textAlign: "center",
    color: colors.muted,
    marginTop: 24,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
  },
  cardTopRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  linkedBadge: {
    backgroundColor: colors.primaryFaint,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  linkedBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "700",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
    borderRadius: 8,
    padding: 12,
  },
  linkedName: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  unlinkText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "600",
  },
  linkButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  linkButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  linkHint: {
    fontSize: 12,
    color: colors.muted,
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
    color: colors.ink,
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
    color: colors.ink,
    fontSize: 14,
  },
});
}
