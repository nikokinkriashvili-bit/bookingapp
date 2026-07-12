import { useCallback, useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
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
import { parseDateAndTime, toDateKey, toTimeString } from "@/lib/calendarDate";
import { STATUS_ORDER, statusLabelKey, type JobStatus } from "@/lib/jobStatus";
import { fireStatusSeams } from "@/lib/jobActions";
import { parseDecimalOr } from "@/lib/number";
import {
  addJobProduct,
  changeJobProductQty,
  removeJobProductRow,
} from "@/lib/consumption";

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price_gel: number | null;
};

type StaffOption = { id: string; name: string };

type JobDetail = {
  id: string;
  status: JobStatus;
  service_ids: string[];
  scheduled_slot: string;
  scheduled_end: string;
  price_total: number | null;
  assigned_staff_id: string | null;
  vehicles: { plate_number: string; make: string | null; model: string | null } | null;
  customers: { name: string; phone: string } | null;
};

type ConsumedRow = {
  id: string;
  product_id: string;
  qty: number;
  products: { name: string; sku: string } | null;
};

type ProductOption = {
  id: string;
  name: string;
  sku: string;
  stock_qty: number;
};

export default function EditJob() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { business } = useBusiness();

  const [job, setJob] = useState<JobDetail | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [assignedStaffId, setAssignedStaffId] = useState<string | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [status, setStatus] = useState<JobStatus>("booked");
  const [fromDate, setFromDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toDate, setToDate] = useState("");
  const [toTime, setToTime] = useState("");
  const [price, setPrice] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [consumed, setConsumed] = useState<ConsumedRow[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [consumptionBusy, setConsumptionBusy] = useState(false);
  const [consumptionError, setConsumptionError] = useState<string | null>(null);

  const loadConsumed = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from("job_products")
      .select("id, product_id, qty, products(name, sku)")
      .eq("job_id", id);
    setConsumed((data as unknown as ConsumedRow[]) ?? []);
  }, [id]);

  useEffect(() => {
    loadConsumed();
  }, [loadConsumed]);

  const runConsumption = async (action: () => Promise<string | null>) => {
    setConsumptionError(null);
    setConsumptionBusy(true);
    const actionError = await action();
    setConsumptionBusy(false);
    if (actionError) {
      setConsumptionError(actionError);
      return;
    }
    loadConsumed();
  };

  const openProductPicker = async () => {
    if (!business) return;
    const { data } = await supabase
      .from("products")
      .select("id, name, sku, stock_qty")
      .eq("business_id", business.id)
      .order("name");
    const used = new Set(consumed.map((c) => c.product_id));
    setProductOptions((data ?? []).filter((p) => !used.has(p.id)));
    setPickerOpen(true);
  };

  useEffect(() => {
    if (!business) return;
    supabase
      .from("services")
      .select("id, name, duration_minutes, price_gel")
      .eq("business_id", business.id)
      .then(({ data }) => setServices(data ?? []));
    supabase
      .from("staff")
      .select("id, name")
      .eq("business_id", business.id)
      .order("name")
      .then(({ data }) => setStaff(data ?? []));
  }, [business]);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("jobs")
      .select(
        "id, status, service_ids, scheduled_slot, scheduled_end, price_total, assigned_staff_id, vehicles(plate_number, make, model), customers(name, phone)"
      )
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (!data) {
          setLoading(false);
          return;
        }
        const j = data as unknown as JobDetail;
        setJob(j);
        setSelectedServiceIds(j.service_ids ?? []);
        setAssignedStaffId(j.assigned_staff_id);
        setStatus(j.status);
        const start = new Date(j.scheduled_slot);
        const end = new Date(j.scheduled_end);
        setFromDate(toDateKey(start));
        setFromTime(toTimeString(start));
        setToDate(toDateKey(end));
        setToTime(toTimeString(end));
        setPrice(j.price_total ? String(j.price_total) : "");
        setLoading(false);
      });
  }, [id]);

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((s) => s !== serviceId)
        : [...prev, serviceId]
    );
  };

  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const totalMinutes = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);

  const onSave = async () => {
    if (!job) return;
    setError(null);

    if (selectedServiceIds.length === 0) {
      setError(t("job.errorService"));
      return;
    }
    if (!fromDate || !fromTime || !toDate || !toTime) {
      setError(t("job.errorFromTo"));
      return;
    }
    const scheduledSlot = parseDateAndTime(fromDate, fromTime);
    const scheduledEnd = parseDateAndTime(toDate, toTime);
    if (isNaN(scheduledSlot.getTime()) || isNaN(scheduledEnd.getTime())) {
      setError(t("job.errorDateFormat"));
      return;
    }
    if (scheduledEnd <= scheduledSlot) {
      setError(t("job.errorEndAfterStart"));
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase
      .from("jobs")
      .update({
        service_ids: selectedServiceIds,
        status,
        scheduled_slot: scheduledSlot.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        price_total: parseDecimalOr(price, 0),
        assigned_staff_id: assignedStaffId,
      })
      .eq("id", job.id);
    if (updateError) {
      setSubmitting(false);
      setError(updateError.message);
      return;
    }

    // Fire the same integration seams the quick day-view flip does, but only
    // when the status actually changed here.
    if (status !== job.status) {
      await fireStatusSeams(job.id, status);
    }
    setSubmitting(false);

    router.back();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.centered}>
        <Text>{t("job.orderNotFound")}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t("job.editOrderTitle")}</Text>

      <View style={styles.section}>
        <Text style={styles.readOnlyPlate}>{job.vehicles?.plate_number}</Text>
        <Text style={styles.readOnlyDetail}>
          {[job.vehicles?.make, job.vehicles?.model].filter(Boolean).join(" ")}
        </Text>
        <Text style={styles.readOnlyDetail}>
          {job.customers?.name} · {job.customers?.phone}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("job.status")}</Text>
        {STATUS_ORDER.map((s) => (
          <Pressable
            key={s}
            style={[styles.option, status === s && styles.optionSelected]}
            onPress={() => setStatus(s)}
          >
            <Text style={status === s ? styles.optionTextSelected : styles.optionText}>
              {t(statusLabelKey(s))}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("job.services")}</Text>
        {services.map((s) => (
          <Pressable
            key={s.id}
            style={[
              styles.option,
              selectedServiceIds.includes(s.id) && styles.optionSelected,
            ]}
            onPress={() => toggleService(s.id)}
          >
            <Text
              style={
                selectedServiceIds.includes(s.id)
                  ? styles.optionTextSelected
                  : styles.optionText
              }
            >
              {s.name} · {s.duration_minutes}{t("common.minShort")}
              {s.price_gel ? ` · ${s.price_gel} ₾` : ""}
            </Text>
          </Pressable>
        ))}
        {selectedServiceIds.length > 0 ? (
          <Text style={styles.totalText}>
            {t("common.duration")}: {totalMinutes}{t("common.minShort")}
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("job.productsUsed")}</Text>
        {consumed.length === 0 ? (
          <Text style={styles.consumptionHint}>{t("job.noProducts")}</Text>
        ) : (
          consumed.map((row) => (
            <View key={row.id} style={styles.consumedRow}>
              <View style={styles.consumedInfo}>
                <Text style={styles.consumedName} numberOfLines={1}>
                  {row.products?.name ?? "—"}
                </Text>
                <Text style={styles.consumedSku}>{row.products?.sku}</Text>
              </View>
              <View style={styles.stepper}>
                <Pressable
                  style={styles.stepButton}
                  disabled={consumptionBusy}
                  onPress={() =>
                    runConsumption(() =>
                      changeJobProductQty(
                        row.id,
                        row.product_id,
                        Number(row.qty),
                        Number(row.qty) - 1
                      )
                    )
                  }
                >
                  <Text style={styles.stepButtonText}>−</Text>
                </Pressable>
                <Text style={styles.stepQty}>{row.qty}</Text>
                <Pressable
                  style={styles.stepButton}
                  disabled={consumptionBusy}
                  onPress={() =>
                    runConsumption(() =>
                      changeJobProductQty(
                        row.id,
                        row.product_id,
                        Number(row.qty),
                        Number(row.qty) + 1
                      )
                    )
                  }
                >
                  <Text style={styles.stepButtonText}>+</Text>
                </Pressable>
              </View>
              <Pressable
                disabled={consumptionBusy}
                onPress={() =>
                  runConsumption(() =>
                    removeJobProductRow(row.id, row.product_id, Number(row.qty))
                  )
                }
              >
                <Text style={styles.consumedRemove}>×</Text>
              </Pressable>
            </View>
          ))
        )}
        {consumptionError ? <Text style={styles.error}>{consumptionError}</Text> : null}
        <Pressable
          style={styles.addProductButton}
          disabled={consumptionBusy}
          onPress={openProductPicker}
        >
          <Text style={styles.addProductText}>{t("po.addItem")}</Text>
        </Pressable>
      </View>

      {staff.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("job.assignee")}</Text>
          <Pressable
            style={[styles.option, assignedStaffId === null && styles.optionSelected]}
            onPress={() => setAssignedStaffId(null)}
          >
            <Text
              style={
                assignedStaffId === null ? styles.optionTextSelected : styles.optionText
              }
            >
              {t("job.unassigned")}
            </Text>
          </Pressable>
          {staff.map((member) => (
            <Pressable
              key={member.id}
              style={[
                styles.option,
                assignedStaffId === member.id && styles.optionSelected,
              ]}
              onPress={() => setAssignedStaffId(member.id)}
            >
              <Text
                style={
                  assignedStaffId === member.id
                    ? styles.optionTextSelected
                    : styles.optionText
                }
              >
                {member.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("job.priceGel")}</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          keyboardType="numeric"
          value={price}
          onChangeText={setPrice}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("job.schedule")}</Text>
        <Text style={styles.subLabel}>{t("job.from")}</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={fromDate}
          onChangeText={setFromDate}
        />
        <TextInput
          style={styles.input}
          placeholder="HH:MM"
          value={fromTime}
          onChangeText={setFromTime}
        />
        <Text style={styles.subLabel}>{t("job.to")}</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={toDate}
          onChangeText={setToDate}
        />
        <TextInput
          style={styles.input}
          placeholder="HH:MM"
          value={toTime}
          onChangeText={setToTime}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={onSave} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{t("job.saveChanges")}</Text>
        )}
      </Pressable>

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
                  onPress={() => {
                    setPickerOpen(false);
                    runConsumption(() => addJobProduct(job.id, p.id, 1));
                  }}
                >
                  <Text style={styles.modalOptionText}>
                    {p.name} · {p.sku} ({p.stock_qty})
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
  subLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    marginTop: 6,
  },
  readOnlyPlate: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 1,
  },
  readOnlyDetail: {
    fontSize: 14,
    color: colors.inkSoft,
  },
  input: {
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
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
  totalText: {
    fontSize: 14,
    color: colors.inkSoft,
    marginTop: 4,
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
  consumptionHint: {
    fontSize: 13,
    color: colors.muted,
  },
  consumedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 10,
    backgroundColor: colors.surface,
  },
  consumedInfo: {
    flex: 1,
  },
  consumedName: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "600",
  },
  consumedSku: {
    fontSize: 11,
    color: colors.muted,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepButton: {
    width: 30,
    height: 30,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  stepQty: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
    minWidth: 24,
    textAlign: "center",
  },
  consumedRemove: {
    fontSize: 20,
    color: colors.danger,
    paddingHorizontal: 4,
  },
  addProductButton: {
    padding: 8,
    alignItems: "center",
  },
  addProductText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "600",
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
