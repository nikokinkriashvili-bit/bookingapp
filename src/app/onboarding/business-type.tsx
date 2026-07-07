import { useState } from "react";
import { router } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BUSINESS_TYPES, type BusinessType } from "@/lib/businessTypes";
import { getBusinessTypeConfig } from "@/lib/businessTypes";
import { useOnboarding } from "@/providers/OnboardingProvider";

export default function BusinessTypeStep() {
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
    const config = getBusinessTypeConfig(businessType);
    setWorkingHours(config.defaultHours);
    setServices(
      config.defaultServices.map((s) => ({ ...s, priceGel: "" }))
    );
    setError(null);
    router.push("/onboarding/hours");
  };

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
      {BUSINESS_TYPES.map((type) => (
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
