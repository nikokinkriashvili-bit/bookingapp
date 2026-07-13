import { useMemo, useState } from "react";
import { Redirect, router } from "expo-router";
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
import { useAuth } from "@/providers/AuthProvider";
import { useBusiness } from "@/providers/BusinessProvider";
import { useOnboarding } from "@/providers/OnboardingProvider";
import { useT } from "@/providers/LanguageProvider";
import { FieldLabel } from "@/components/FieldLabel";
import { parseDecimal } from "@/lib/number";

export default function ServicesStep() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { session } = useAuth();
  const { refetch } = useBusiness();
  const { businessName, businessType, workingHours, services, setServices } =
    useOnboarding();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!businessType || !workingHours) {
    return <Redirect href="/onboarding/business-type" />;
  }

  const updateService = (
    index: number,
    field: "name" | "durationMinutes" | "priceGel",
    value: string
  ) => {
    setServices(
      services.map((s, i) =>
        i === index
          ? {
              ...s,
              [field]: field === "durationMinutes" ? Number(value) || 0 : value,
            }
          : s
      )
    );
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const addService = () => {
    setServices([...services, { name: "", durationMinutes: 30, priceGel: "" }]);
  };

  const onSubmit = async () => {
    if (!session) return;
    setError(null);

    const validServices = services.filter((s) => s.name.trim());
    if (validServices.length === 0) {
      setError(t("onboarding.errorNoServices"));
      return;
    }

    setSubmitting(true);

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .insert({
        owner_id: session.user.id,
        name: businessName.trim(),
        business_type: businessType,
        working_hours: workingHours,
      })
      .select()
      .single();

    if (businessError || !business) {
      setSubmitting(false);
      setError(businessError?.message ?? t("onboarding.errorCreateBusiness"));
      return;
    }

    const { error: servicesError } = await supabase.from("services").insert(
      validServices.map((s) => ({
        business_id: business.id,
        name: s.name.trim(),
        duration_minutes: s.durationMinutes,
        price_gel: parseDecimal(s.priceGel),
      }))
    );

    setSubmitting(false);

    if (servicesError) {
      setError(servicesError.message);
      return;
    }

    await refetch();
    router.replace("/");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t("onboarding.servicesTitle")}</Text>

      {services.length > 0 ? (
        <View style={styles.serviceRow}>
          <FieldLabel styleOverride={styles.serviceName}>
            {t("onboarding.serviceName")}
          </FieldLabel>
          <FieldLabel styleOverride={styles.serviceDuration}>
            {t("onboarding.serviceMin")}
          </FieldLabel>
          <FieldLabel styleOverride={styles.servicePrice}>
            {t("onboarding.serviceGel")}
          </FieldLabel>
        </View>
      ) : null}
      {services.map((service, index) => (
        <View key={index} style={styles.serviceRow}>
          <TextInput
            style={[styles.input, styles.serviceName]}
            placeholder={t("onboarding.serviceName")}
            value={service.name}
            onChangeText={(v) => updateService(index, "name", v)}
          />
          <TextInput
            style={[styles.input, styles.serviceDuration]}
            placeholder={t("onboarding.serviceMin")}
            keyboardType="numeric"
            value={String(service.durationMinutes)}
            onChangeText={(v) => updateService(index, "durationMinutes", v)}
          />
          <TextInput
            style={[styles.input, styles.servicePrice]}
            placeholder={t("onboarding.serviceGel")}
            keyboardType="numeric"
            value={service.priceGel}
            onChangeText={(v) => updateService(index, "priceGel", v)}
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
      ))}

      <Pressable style={styles.addButton} onPress={addService}>
        <Text style={styles.addButtonText}>{t("onboarding.addService")}</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={onSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{t("onboarding.finish")}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
  serviceRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  input: {
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  serviceName: {
    flex: 2,
  },
  serviceDuration: {
    flex: 1,
  },
  servicePrice: {
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
