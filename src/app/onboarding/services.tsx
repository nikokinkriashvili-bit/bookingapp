import { useState } from "react";
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
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useBusiness } from "@/providers/BusinessProvider";
import { useOnboarding } from "@/providers/OnboardingProvider";

export default function ServicesStep() {
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
      setError("Add at least one service.");
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
      setError(businessError?.message ?? "Failed to create business.");
      return;
    }

    const { error: servicesError } = await supabase.from("services").insert(
      validServices.map((s) => ({
        business_id: business.id,
        name: s.name.trim(),
        duration_minutes: s.durationMinutes,
        price_gel: s.priceGel ? Number(s.priceGel) : null,
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
      <Text style={styles.title}>Services</Text>

      {services.map((service, index) => (
        <View key={index} style={styles.serviceRow}>
          <TextInput
            style={[styles.input, styles.serviceName]}
            placeholder="Service name"
            value={service.name}
            onChangeText={(v) => updateService(index, "name", v)}
          />
          <TextInput
            style={[styles.input, styles.serviceDuration]}
            placeholder="Min"
            keyboardType="numeric"
            value={String(service.durationMinutes)}
            onChangeText={(v) => updateService(index, "durationMinutes", v)}
          />
          <TextInput
            style={[styles.input, styles.servicePrice]}
            placeholder="GEL"
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
        <Text style={styles.addButtonText}>+ Add service</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={onSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Finish setup</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  serviceRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
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
    color: "#d33",
  },
  addButton: {
    padding: 10,
    alignItems: "center",
  },
  addButtonText: {
    color: "#208AEF",
    fontSize: 15,
  },
  button: {
    backgroundColor: "#208AEF",
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
    color: "#d33",
  },
});
