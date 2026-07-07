import { useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { BusinessType } from "@/lib/businessTypes";
import { useCatalog } from "@/providers/CatalogProvider";
import { useOnboarding } from "@/providers/OnboardingProvider";

export default function BusinessTypeStep() {
  const { businessTypes, isLoading: isCatalogLoading, error: catalogError } =
    useCatalog();
  const {
    businessName,
    setBusinessName,
    businessType,
    setBusinessType,
    setWorkingHours,
    setServices,
  } = useOnboarding();
  const [error, setError] = useState<string | null>(null);

  const onSelect = (value: BusinessType) => {
    setBusinessType(value);
  };

  const onContinue = () => {
    if (!businessName.trim()) {
      setError("Enter your business name.");
      return;
    }
    if (!businessType) {
      setError("Choose a business type.");
      return;
    }
    const config = businessTypes.find((t) => t.value === businessType);
    if (!config) {
      setError("Unknown business type.");
      return;
    }
    setWorkingHours(config.defaultHours);
    setServices(
      config.defaultServices.map((s) => ({ ...s, priceGel: "" }))
    );
    setError(null);
    router.push("/onboarding/hours");
  };

  if (isCatalogLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Tell us about your business</Text>

      <TextInput
        style={styles.input}
        placeholder="Business name"
        value={businessName}
        onChangeText={setBusinessName}
      />

      <Text style={styles.label}>Business type</Text>
      {catalogError ? <Text style={styles.error}>{catalogError}</Text> : null}
      {businessTypes.map((type) => (
        <Pressable
          key={type.value}
          style={[
            styles.option,
            businessType === type.value && styles.optionSelected,
          ]}
          onPress={() => onSelect(type.value)}
        >
          <Text
            style={[
              styles.optionText,
              businessType === type.value && styles.optionTextSelected,
            ]}
          >
            {type.label}
          </Text>
        </Pressable>
      ))}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={onContinue}>
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
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
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    color: "#555",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  option: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 14,
  },
  optionSelected: {
    borderColor: "#208AEF",
    backgroundColor: "#e8f2fd",
  },
  optionText: {
    fontSize: 16,
  },
  optionTextSelected: {
    color: "#208AEF",
    fontWeight: "600",
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
