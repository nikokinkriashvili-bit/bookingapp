import { useCallback, useState } from "react";
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
import { colors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/providers/BusinessProvider";
import { useT } from "@/providers/LanguageProvider";
import type { StringKey } from "@/lib/i18n";
import { WEEKDAYS, type Weekday, type WorkingHours } from "@/lib/businessTypes";

type ServiceEdit = {
  id: string | null; // null = newly added, not yet in the DB
  name: string;
  durationMinutes: string;
  priceGel: string;
};

type StaffRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  user_id: string | null;
};

export default function Settings() {
  const t = useT();
  const { business, role, refetch } = useBusiness();

  const [name, setName] = useState("");
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

  useFocusEffect(
    useCallback(() => {
      if (!business) return;
      setName(business.name);
      setHours(business.working_hours);
      setDeletedServiceIds([]);
      setSaved(false);
      loadStaff();
      supabase
        .from("services")
        .select("id, name, duration_minutes, price_gel")
        .eq("business_id", business.id)
        .order("name")
        .then(({ data }) => {
          setServices(
            (data ?? []).map((s) => ({
              id: s.id,
              name: s.name,
              durationMinutes: String(s.duration_minutes),
              priceGel: s.price_gel != null ? String(s.price_gel) : "",
            }))
          );
          setLoading(false);
        });
    }, [business, loadStaff])
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
    await supabase.from("staff").delete().eq("id", staffId);
    loadStaff();
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
    setServices([...services, { id: null, name: "", durationMinutes: "30", priceGel: "" }]);
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
      .update({ name: name.trim(), working_hours: hours })
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
        duration_minutes: Number(service.durationMinutes) || 0,
        price_gel: service.priceGel.trim() ? Number(service.priceGel) : null,
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
                  <Text style={styles.timeSeparator}>{t("common.to")}</Text>
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
        <Text style={styles.sectionLabel}>{t("onboarding.servicesTitle")}</Text>
        {services.map((service, index) => (
          <View key={service.id ?? `new-${index}`} style={styles.serviceRow}>
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
            <TextInput
              style={[styles.input, styles.serviceSmall]}
              placeholder={t("onboarding.serviceGel")}
              keyboardType="numeric"
              value={service.priceGel}
              onChangeText={(v) => updateService(index, "priceGel", v)}
            />
            <Pressable onPress={() => removeService(index)} style={styles.removeButton}>
              <Text style={styles.removeButtonText}>×</Text>
            </Pressable>
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
            <Pressable onPress={() => removeStaff(member.id)} style={styles.removeButton}>
              <Text style={styles.removeButtonText}>×</Text>
            </Pressable>
          </View>
        ))}

        {staffFormOpen ? (
          <View style={styles.staffForm}>
            <TextInput
              style={styles.input}
              placeholder={t("customer.name")}
              value={staffName}
              onChangeText={setStaffName}
            />
            <TextInput
              style={styles.input}
              placeholder={t("staff.email")}
              autoCapitalize="none"
              keyboardType="email-address"
              value={staffEmail}
              onChangeText={setStaffEmail}
            />
            <TextInput
              style={styles.input}
              placeholder={t("customer.phone")}
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

const styles = StyleSheet.create({
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
    fontSize: 16,
    fontWeight: "500",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeInput: {
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
  serviceRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
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
    fontSize: 15,
    fontWeight: "700",
  },
  staffDetail: {
    fontSize: 13,
    color: colors.inkSoft,
  },
  staffStatus: {
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
