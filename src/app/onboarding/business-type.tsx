import { useMemo, useState } from "react";
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
import { useThemeColors, type ThemeColors } from "@/providers/ThemeProvider";
import type { BusinessType } from "@/lib/businessTypes";
import { useCatalog } from "@/providers/CatalogProvider";
import { useOnboarding } from "@/providers/OnboardingProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { FieldLabel } from "@/components/FieldLabel";

export default function BusinessTypeStep() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { language, t } = useLanguage();
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
      setError(t("onboarding.errorName"));
      return;
    }
    if (!businessType) {
      setError(t("onboarding.errorType"));
      return;
    }
    const config = businessTypes.find((bt) => bt.value === businessType);
    if (!config) {
      setError(t("onboarding.errorUnknownType"));
      return;
    }
    setWorkingHours(config.defaultHours);
    // Seed the editable service list in the user's language; once saved at
    // the end of onboarding these become the business's own service names.
    setServices(
      config.defaultServices.map((s) => ({
        name: language === "ka" ? s.nameKa ?? s.name : s.name,
        durationMinutes: s.durationMinutes,
        priceMin: "",
        priceMax: "",
      }))
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
      <Text style={styles.title}>{t("onboarding.title")}</Text>

      <Text style={styles.staffNotice}>{t("onboarding.staffNotice")}</Text>

      <FieldLabel>{t("onboarding.businessName")}</FieldLabel>
      <TextInput
        style={styles.input}
        value={businessName}
        onChangeText={setBusinessName}
      />

      <Text style={styles.label}>{t("onboarding.businessType")}</Text>
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
            {language === "ka" ? type.labelKa ?? type.label : type.label}
          </Text>
        </Pressable>
      ))}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={onContinue}>
        <Text style={styles.buttonText}>{t("onboarding.continue")}</Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
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
    color: colors.ink,
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
    color: colors.inkSoft,
  },
  staffNotice: {
    fontSize: 13,
    color: colors.muted,
    backgroundColor: colors.primaryFaint,
    borderRadius: 8,
    padding: 12,
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
    padding: 14,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
  optionText: {
    color: colors.ink,
    fontSize: 16,
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
