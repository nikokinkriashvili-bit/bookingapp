import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useThemeColors, type ThemeColors } from "@/providers/ThemeProvider";
import { FieldLabel } from "@/components/FieldLabel";
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/providers/BusinessProvider";
import { useT } from "@/providers/LanguageProvider";
import type { StringKey } from "@/lib/i18n";
import { WEEKDAYS, type Weekday, type WorkingHours } from "@/lib/businessTypes";
import { parseDecimal, parseIntOr } from "@/lib/number";
import { confirmAsync } from "@/lib/confirm";
import {
  createClosure,
  deleteClosure,
  listClosures,
  type Closure,
} from "@/lib/closures";

type ServiceEdit = {
  id: string | null; // null = newly added, not yet in the DB
  name: string;
  durationMinutes: string;
  priceMin: string; // guide range; exact price is quoted per job after inspection
  priceMax: string;
  reminderDays: string; // empty = no rebooking reminder for this service
};

type StaffRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  user_id: string | null;
};

export default function Settings() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { business, role, refetch } = useBusiness();

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [hours, setHours] = useState<WorkingHours | null>(null);
  const [services, setServices] = useState<ServiceEdit[]>([]);
  const [deletedServiceIds, setDeletedServiceIds] = useState<string[]>([]);
  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [staffFormOpen, setStaffFormOpen] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffSubmitting, setStaffSubmitting] = useState(false);
  const [closures, setClosures] = useState<Closure[]>([]);
  const [closureStart, setClosureStart] = useState("");
  const [closureEnd, setClosureEnd] = useState("");
  const [closureReason, setClosureReason] = useState("");
  const [closureError, setClosureError] = useState<string | null>(null);
  const [closureSubmitting, setClosureSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadStaff = useCallback(() => {
    if (!business) return;
    supabase
      .from("staff")
      .select("id, name, email, phone, user_id")
      .eq("business_id", business.id)
      .order("name")
      .then(({ data }) => setStaffList(data ?? []));
  }, [business]);

  const loadClosures = useCallback(async () => {
    if (!business) return;
    const { closures: rows } = await listClosures(business.id);
    setClosures(rows);
  }, [business]);

  useFocusEffect(
    useCallback(() => {
      if (!business) return;
      setName(business.name);
      setWhatsapp(business.whatsapp_number ?? "");
      setHours(business.working_hours);
      setDeletedServiceIds([]);
      setSaved(false);
      loadStaff();
      loadClosures();
      supabase
        .from("services")
        .select("id, name, duration_minutes, price_min, price_max, reminder_interval_days")
        .eq("business_id", business.id)
        .order("name")
        .then(({ data }) => {
          setServices(
            (data ?? []).map((s) => ({
              id: s.id,
              name: s.name,
              durationMinutes: String(s.duration_minutes),
              priceMin: s.price_min != null ? String(s.price_min) : "",
              priceMax: s.price_max != null ? String(s.price_max) : "",
              reminderDays:
                s.reminder_interval_days != null ? String(s.reminder_interval_days) : "",
            }))
          );
          setLoading(false);
        });
    }, [business, loadStaff, loadClosures])
  );

  const addStaff = async () => {
    if (!business) return;
    setStaffError(null);
    if (!staffName.trim() || !staffEmail.trim()) {
      setStaffError(t("staff.errorRequired"));
      return;
    }
    setStaffSubmitting(true);
    const { error: staffInsertError } = await supabase.from("staff").insert({
      business_id: business.id,
      name: staffName.trim(),
      email: staffEmail.trim().toLowerCase(),
      phone: staffPhone.trim() || null,
    });
    setStaffSubmitting(false);
    if (staffInsertError) {
      setStaffError(staffInsertError.message);
      return;
    }
    setStaffName("");
    setStaffEmail("");
    setStaffPhone("");
    setStaffFormOpen(false);
    loadStaff();
  };

  const removeStaff = async (staffId: string) => {
    const ok = await confirmAsync(
      t("staff.removeConfirm"),
      t("common.remove"),
      t("common.cancel")
    );
    if (!ok) return;
    setStaffError(null);
    const { error: deleteError } = await supabase
      .from("staff")
      .delete()
      .eq("id", staffId);
    if (deleteError) {
      setStaffError(deleteError.message);
      return;
    }
    loadStaff();
  };

  const addClosure = async () => {
    if (!business) return;
    setClosureError(null);
    const start = closureStart.trim();
    const end = (closureEnd.trim() || start); // single-day closure if end left blank
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      setClosureError(t("closures.errorDate"));
      return;
    }
    if (end < start) {
      setClosureError(t("closures.errorOrder"));
      return;
    }
    setClosureSubmitting(true);
    const err = await createClosure(business.id, start, end, closureReason);
    setClosureSubmitting(false);
    if (err) {
      setClosureError(err);
      return;
    }
    setClosureStart("");
    setClosureEnd("");
    setClosureReason("");
    loadClosures();
  };

  const removeClosure = async (id: string) => {
    const ok = await confirmAsync(
      t("closures.removeConfirm"),
      t("common.remove"),
      t("common.cancel")
    );
    if (!ok) return;
    const err = await deleteClosure(id);
    if (err) {
      setClosureError(err);
      return;
    }
    setClosures((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleDay = (day: Weekday, isOpen: boolean) => {
    if (!hours) return;
    setHours({ ...hours, [day]: isOpen ? { open: "09:00", close: "18:00" } : null });
  };

  const updateTime = (day: Weekday, field: "open" | "close", value: string) => {
    if (!hours) return;
    const current = hours[day];
    if (!current) return;
    setHours({ ...hours, [day]: { ...current, [field]: value } });
  };

  const updateService = (index: number, field: keyof ServiceEdit, value: string) => {
    setServices(services.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const removeService = (index: number) => {
    const service = services[index];
    if (service.id) setDeletedServiceIds((prev) => [...prev, service.id!]);
    setServices(services.filter((_, i) => i !== index));
  };

  const addService = () => {
    setServices([
      ...services,
      { id: null, name: "", durationMinutes: "30", priceMin: "", priceMax: "", reminderDays: "" },
    ]);
  };

  const onSave = async () => {
    if (!business || !hours) return;
    setError(null);
    setSaved(false);

    const validServices = services.filter((s) => s.name.trim());
    if (validServices.length === 0) {
      setError(t("onboarding.errorNoServices"));
      return;
    }
    if (!name.trim()) {
      setError(t("onboarding.errorName"));
      return;
    }

    setSubmitting(true);

    const { error: businessError } = await supabase
      .from("businesses")
      .update({
        name: name.trim(),
        working_hours: hours,
        whatsapp_number: whatsapp.trim() || null,
      })
      .eq("id", business.id);
    if (businessError) {
      setSubmitting(false);
      setError(businessError.message);
      return;
    }

    for (const serviceId of deletedServiceIds) {
      const { error: deleteError } = await supabase
        .from("services")
        .delete()
        .eq("id", serviceId);
      if (deleteError) {
        setSubmitting(false);
        setError(deleteError.message);
        return;
      }
    }

    for (const service of validServices) {
      const values = {
        name: service.name.trim(),
        duration_minutes: parseIntOr(service.durationMinutes, 0),
        price_min: parseDecimal(service.priceMin),
        price_max: parseDecimal(service.priceMax),
        reminder_interval_days: service.reminderDays.trim()
          ? parseIntOr(service.reminderDays, 0)
          : null,
      };
      const { error: serviceError } = service.id
        ? await supabase.from("services").update(values).eq("id", service.id)
        : await supabase
            .from("services")
            .insert({ ...values, business_id: business.id });
      if (serviceError) {
        setSubmitting(false);
        setError(serviceError.message);
        return;
      }
    }

    await refetch();
    setSubmitting(false);
    setSaved(true);
  };

  if (role !== "owner") {
    return (
      <View style={styles.centered}>
        <Text>{t("common.notFound")}</Text>
      </View>
    );
  }

  if (loading || !hours) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t("settings.title")}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("onboarding.businessName")}</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("settings.whatsapp")}</Text>
        <TextInput
          style={styles.input}
          keyboardType="phone-pad"
          placeholder="+995 5XX XX XX XX"
          value={whatsapp}
          onChangeText={setWhatsapp}
        />
        <Text style={styles.whatsappHint}>{t("settings.whatsappHint")}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("onboarding.hoursTitle")}</Text>
        {WEEKDAYS.map((day) => {
          const dayHours = hours[day];
          return (
            <View key={day} style={styles.dayRow}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{t(`weekday.${day}` as StringKey)}</Text>
                <Switch value={!!dayHours} onValueChange={(v) => toggleDay(day, v)} />
              </View>
              {dayHours ? (
                <View style={styles.timeRow}>
                  <TextInput
                    style={styles.timeInput}
                    value={dayHours.open}
                    onChangeText={(v) => updateTime(day, "open", v)}
                    placeholder="09:00"
                  />
                  <Text style={styles.timeSeparator}>{t("common.timeRangeSeparator")}</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={dayHours.close}
                    onChangeText={(v) => updateTime(day, "close", v)}
                    placeholder="18:00"
                  />
                </View>
              ) : (
                <Text style={styles.closedText}>{t("common.closed")}</Text>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("closures.title")}</Text>
        <Text style={styles.whatsappHint}>{t("closures.hint")}</Text>
        {closures.map((closure) => (
          <View key={closure.id} style={styles.closureRow}>
            <View style={styles.closureInfo}>
              <Text style={styles.closureDates}>
                {closure.start_date === closure.end_date
                  ? closure.start_date
                  : `${closure.start_date} ${t("common.timeRangeSeparator")} ${closure.end_date}`}
              </Text>
              {closure.reason ? (
                <Text style={styles.closureReason}>{closure.reason}</Text>
              ) : null}
            </View>
            <Pressable
              onPress={() => removeClosure(closure.id)}
              style={styles.removeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={t("common.remove")}
            >
              <Text style={styles.removeButtonText}>×</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.closureForm}>
          <View style={styles.closureDateRow}>
            <View style={styles.closureDateField}>
              <FieldLabel>{t("closures.startDate")}</FieldLabel>
              <TextInput
                style={styles.input}
                placeholder="2026-01-07"
                autoCapitalize="none"
                value={closureStart}
                onChangeText={setClosureStart}
              />
            </View>
            <View style={styles.closureDateField}>
              <FieldLabel>{t("closures.endDate")}</FieldLabel>
              <TextInput
                style={styles.input}
                placeholder="2026-01-07"
                autoCapitalize="none"
                value={closureEnd}
                onChangeText={setClosureEnd}
              />
            </View>
          </View>
          <FieldLabel>{t("closures.reason")}</FieldLabel>
          <TextInput
            style={styles.input}
            placeholder={t("closures.reasonPlaceholder")}
            value={closureReason}
            onChangeText={setClosureReason}
          />
          {closureError ? <Text style={styles.error}>{closureError}</Text> : null}
          <Pressable style={styles.addButton} onPress={addClosure} disabled={closureSubmitting}>
            {closureSubmitting ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.addButtonText}>{t("closures.add")}</Text>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("onboarding.servicesTitle")}</Text>
        <Text style={styles.rangeHint}>{t("onboarding.priceRangeHint")}</Text>
        {services.map((service, index) => (
          <View key={service.id ?? `new-${index}`} style={styles.serviceBlock}>
            <View style={styles.serviceRow}>
              <TextInput
                style={[styles.input, styles.serviceName]}
                placeholder={t("onboarding.serviceName")}
                value={service.name}
                onChangeText={(v) => updateService(index, "name", v)}
              />
              <TextInput
                style={[styles.input, styles.serviceSmall]}
                placeholder={t("onboarding.serviceMin")}
                keyboardType="numeric"
                value={service.durationMinutes}
                onChangeText={(v) => updateService(index, "durationMinutes", v)}
              />
              <Pressable
                onPress={() => removeService(index)}
                style={styles.removeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={t("common.remove")}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </Pressable>
            </View>
            <View style={styles.priceRangeRow}>
              <TextInput
                style={[styles.input, styles.serviceSmall]}
                placeholder={t("service.priceFrom")}
                keyboardType="numeric"
                value={service.priceMin}
                onChangeText={(v) => updateService(index, "priceMin", v)}
              />
              <Text style={styles.rangeDash}>–</Text>
              <TextInput
                style={[styles.input, styles.serviceSmall]}
                placeholder={t("service.priceTo")}
                keyboardType="numeric"
                value={service.priceMax}
                onChangeText={(v) => updateService(index, "priceMax", v)}
              />
              <Text style={styles.rangeUnit}>₾</Text>
            </View>
            <View style={styles.reminderRow}>
              <Text style={styles.reminderLabel}>{t("settings.serviceReminderDays")}</Text>
              <TextInput
                style={[styles.input, styles.reminderInput]}
                placeholder={t("settings.serviceReminderDaysPlaceholder")}
                keyboardType="numeric"
                value={service.reminderDays}
                onChangeText={(v) => updateService(index, "reminderDays", v)}
              />
            </View>
          </View>
        ))}
        <Pressable style={styles.addButton} onPress={addService}>
          <Text style={styles.addButtonText}>{t("onboarding.addService")}</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {saved ? <Text style={styles.savedText}>{t("settings.saved")}</Text> : null}

      <Pressable style={styles.button} onPress={onSave} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{t("common.save")}</Text>
        )}
      </Pressable>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("settings.staff")}</Text>
        {staffList.map((member) => (
          <View key={member.id} style={styles.staffRow}>
            <View style={styles.staffInfo}>
              <Text style={styles.staffName}>{member.name}</Text>
              <Text style={styles.staffDetail}>
                {member.email}
                {member.phone ? ` · ${member.phone}` : ""}
              </Text>
              <Text
                style={[
                  styles.staffStatus,
                  { color: member.user_id ? colors.success : colors.muted },
                ]}
              >
                {member.user_id ? t("staff.active") : t("staff.pending")}
              </Text>
            </View>
            <Pressable
              onPress={() => removeStaff(member.id)}
              style={styles.removeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={t("common.remove")}
            >
              <Text style={styles.removeButtonText}>×</Text>
            </Pressable>
          </View>
        ))}

        {staffFormOpen ? (
          <View style={styles.staffForm}>
            <FieldLabel>{t("customer.name")}</FieldLabel>
            <TextInput
              style={styles.input}
              value={staffName}
              onChangeText={setStaffName}
            />
            <FieldLabel>{t("staff.email")}</FieldLabel>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              value={staffEmail}
              onChangeText={setStaffEmail}
            />
            <FieldLabel>{t("customer.phone")}</FieldLabel>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              value={staffPhone}
              onChangeText={setStaffPhone}
            />
            <Text style={styles.staffHint}>{t("staff.hint")}</Text>
            {staffError ? <Text style={styles.error}>{staffError}</Text> : null}
            <View style={styles.staffActions}>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => setStaffFormOpen(false)}
              >
                <Text style={styles.secondaryButtonText}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable
                style={styles.primaryButtonSmall}
                onPress={addStaff}
                disabled={staffSubmitting}
              >
                {staffSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>{t("common.save")}</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.addButton} onPress={() => setStaffFormOpen(true)}>
            <Text style={styles.addButtonText}>{t("staff.add")}</Text>
          </Pressable>
        )}
      </View>
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
  input: {
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.surface,
  },
  dayRow: {
    borderWidth: 1,
    borderColor: colors.faintLine,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dayLabel: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "500",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeInput: {
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    width: 80,
    textAlign: "center",
  },
  timeSeparator: {
    color: colors.muted,
  },
  closedText: {
    color: colors.muted,
  },
  closureRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.surface,
    gap: 8,
  },
  closureInfo: {
    flex: 1,
    gap: 2,
  },
  closureDates: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "600",
  },
  closureReason: {
    fontSize: 13,
    color: colors.inkSoft,
  },
  closureForm: {
    gap: 8,
  },
  closureDateRow: {
    flexDirection: "row",
    gap: 8,
  },
  closureDateField: {
    flex: 1,
    gap: 4,
  },
  serviceBlock: {
    gap: 6,
    marginBottom: 6,
  },
  serviceRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  priceRangeRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  rangeHint: {
    fontSize: 12,
    color: colors.muted,
  },
  rangeDash: {
    color: colors.muted,
    fontSize: 16,
  },
  rangeUnit: {
    color: colors.inkSoft,
    fontSize: 16,
    fontWeight: "600",
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reminderLabel: {
    flex: 1,
    fontSize: 12,
    color: colors.muted,
  },
  reminderInput: {
    width: 70,
    padding: 8,
    fontSize: 14,
    textAlign: "center",
  },
  serviceName: {
    flex: 2,
  },
  serviceSmall: {
    flex: 1,
  },
  removeButton: {
    padding: 8,
  },
  removeButtonText: {
    fontSize: 20,
    color: colors.danger,
  },
  addButton: {
    padding: 10,
    alignItems: "center",
  },
  addButtonText: {
    color: colors.primary,
    fontSize: 15,
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
  savedText: {
    color: colors.success,
    fontWeight: "600",
  },
  whatsappHint: {
    fontSize: 12,
    color: colors.muted,
  },
  staffRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.surface,
    gap: 8,
  },
  staffInfo: {
    flex: 1,
    gap: 2,
  },
  staffName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  staffDetail: {
    fontSize: 13,
    color: colors.inkSoft,
  },
  staffStatus: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "600",
  },
  staffForm: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    gap: 8,
    backgroundColor: colors.surface,
  },
  staffHint: {
    fontSize: 12,
    color: colors.muted,
  },
  staffActions: {
    flexDirection: "row",
    gap: 8,
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
  primaryButtonSmall: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
});
}
