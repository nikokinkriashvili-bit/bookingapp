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

export default function Settings() {
  const t = useT();
  const { business, refetch } = useBusiness();

  const [name, setName] = useState("");
  const [hours, setHours] = useState<WorkingHours | null>(null);
  const [services, setServices] = useState<ServiceEdit[]>([]);
  const [deletedServiceIds, setDeletedServiceIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!business) return;
      setName(business.name);
      setHours(business.working_hours);
      setDeletedServiceIds([]);
      setSaved(false);
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
    }, [business])
  );

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
});
