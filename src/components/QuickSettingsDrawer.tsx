import { Link } from "expo-router";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeColors, useThemeMode, type ThemeMode } from "@/providers/ThemeProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useBusiness } from "@/providers/BusinessProvider";

const THEME_MODES: ThemeMode[] = ["system", "light", "dark"];

export function QuickSettingsDrawer({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const { mode, setMode } = useThemeMode();
  const { language, setLanguage, t } = useLanguage();
  const { signOut } = useAuth();
  const { role } = useBusiness();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.panel, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.ink }]}>{t("quick.title")}</Text>

          <Text style={[styles.sectionLabel, { color: colors.inkSoft }]}>
            {t("quick.appearance")}
          </Text>
          <View style={[styles.segmented, { borderColor: colors.line }]}>
            {THEME_MODES.map((m) => (
              <Pressable
                key={m}
                style={[
                  styles.segment,
                  mode === m && { backgroundColor: colors.primary },
                ]}
                onPress={() => setMode(m)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: mode === m ? "#fff" : colors.inkSoft },
                  ]}
                >
                  {t(`quick.${m}` as const)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.inkSoft }]}>
            {t("quick.language")}
          </Text>
          <View style={[styles.segmented, { borderColor: colors.line }]}>
            {(["ka", "en"] as const).map((lang) => (
              <Pressable
                key={lang}
                style={[
                  styles.segment,
                  language === lang && { backgroundColor: colors.primary },
                ]}
                onPress={() => setLanguage(lang)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: language === lang ? "#fff" : colors.inkSoft },
                  ]}
                >
                  {lang === "ka" ? "ქარ" : "EN"}
                </Text>
              </Pressable>
            ))}
          </View>

          {role === "owner" ? (
            <Link href="/settings" style={styles.linkRow} onPress={onClose}>
              <Text style={[styles.linkText, { color: colors.primary }]}>
                {t("quick.fullSettings")}
              </Text>
            </Link>
          ) : null}

          <Pressable
            style={styles.linkRow}
            onPress={() => {
              onClose();
              signOut();
            }}
          >
            <Text style={[styles.linkText, { color: colors.danger }]}>
              {t("quick.signOut")}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  panel: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 32,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 8,
  },
  segmented: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
  },
  linkRow: {
    paddingVertical: 12,
    marginTop: 8,
  },
  linkText: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
});
