import { useState } from "react";
import { Redirect, Link } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors } from "@/lib/theme";
import { useAuth } from "@/providers/AuthProvider";
import { useLanguage } from "@/providers/LanguageProvider";

export default function Login() {
  const { session, signIn } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (session) {
    return <Redirect href="/" />;
  }

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    const result = await signIn(email.trim(), password);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.langToggle}>
        {(["ka", "en"] as const).map((lang) => (
          <Pressable
            key={lang}
            style={[styles.langOption, language === lang && styles.langOptionActive]}
            onPress={() => setLanguage(lang)}
          >
            <Text style={language === lang ? styles.langTextActive : styles.langText}>
              {lang === "ka" ? "ქარ" : "EN"}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.title}>{t("auth.logIn")}</Text>

      <TextInput
        style={styles.input}
        placeholder={t("auth.email")}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder={t("auth.password")}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={onSubmit} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{t("auth.logIn")}</Text>
        )}
      </Pressable>

      <Link href="/sign-up" style={styles.link}>
        {t("auth.noAccount")}
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    color: colors.danger,
  },
  link: {
    textAlign: "center",
    color: colors.primary,
    marginTop: 12,
  },
  langToggle: {
    flexDirection: "row",
    alignSelf: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 8,
  },
  langOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  langOptionActive: {
    backgroundColor: colors.primary,
  },
  langText: {
    fontSize: 13,
    color: colors.inkSoft,
    fontWeight: "600",
  },
  langTextActive: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "600",
  },
});
