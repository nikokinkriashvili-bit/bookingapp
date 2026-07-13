import { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeColors, type ThemeColors } from "@/providers/ThemeProvider";
import { useBusiness } from "@/providers/BusinessProvider";
import { useT } from "@/providers/LanguageProvider";
import { FetchError } from "@/components/FetchError";
import {
  dismissReminder,
  listDueReminders,
  markReminderBooked,
  type DueReminder,
} from "@/lib/rebookingReminders";
import { sendWhatsAppMessage } from "@/lib/integrations";

export default function Reminders() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useT();
  const { business } = useBusiness();

  const [reminders, setReminders] = useState<DueReminder[] | null>(null);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!business) return;
    setError(false);
    const { reminders: rows, error: fetchError } = await listDueReminders(business.id);
    if (fetchError) {
      setError(true);
      return;
    }
    setReminders(rows);
  }, [business]);

  useEffect(() => {
    load();
  }, [load]);

  const onSend = async (reminder: DueReminder) => {
    setBusyId(reminder.id);
    await sendWhatsAppMessage("rebooking_reminder", reminder.job_id);
    setBusyId(null);
  };

  const onBookNow = async (reminder: DueReminder) => {
    await markReminderBooked(reminder.id);
    router.push(`/jobs?plate=${encodeURIComponent(reminder.plate_number)}`);
  };

  const onDismiss = async (reminder: DueReminder) => {
    setBusyId(reminder.id);
    await dismissReminder(reminder.id);
    setBusyId(null);
    setReminders((prev) => (prev ?? []).filter((r) => r.id !== reminder.id));
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t("reminders.title")}</Text>
        <FetchError onRetry={load} />
      </View>
    );
  }

  if (!reminders) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("reminders.title")}</Text>
      <FlatList
        data={reminders}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{t("reminders.empty")}</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.plate}>{item.plate_number}</Text>
              <Text style={styles.dueDate}>{item.due_date}</Text>
            </View>
            <Text style={styles.customer}>
              {item.customer_name}
              {item.customer_phone ? ` · ${item.customer_phone}` : ""}
            </Text>
            <View style={styles.actions}>
              <Pressable
                style={styles.actionButton}
                onPress={() => onSend(item)}
                disabled={busyId === item.id}
              >
                <Text style={styles.actionButtonText}>{t("reminders.sendWhatsApp")}</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.actionButtonPrimary]}
                onPress={() => onBookNow(item)}
              >
                <Text style={styles.actionButtonPrimaryText}>{t("reminders.bookNow")}</Text>
              </Pressable>
              <Pressable
                style={styles.dismissButton}
                onPress={() => onDismiss(item)}
                disabled={busyId === item.id}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={t("reminders.dismiss")}
              >
                <Text style={styles.dismissButtonText}>{t("reminders.dismiss")}</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
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
      flex: 1,
      padding: 24,
      gap: 12,
      backgroundColor: colors.bg,
    },
    title: {
      color: colors.ink,
      fontSize: 24,
      fontWeight: "600",
      textAlign: "center",
    },
    list: {
      gap: 10,
      paddingBottom: 24,
    },
    empty: {
      color: colors.muted,
      textAlign: "center",
      marginTop: 40,
    },
    card: {
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 10,
      padding: 12,
      gap: 6,
      backgroundColor: colors.surface,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    plate: {
      color: colors.ink,
      fontSize: 16,
      fontWeight: "700",
    },
    dueDate: {
      color: colors.inkSoft,
      fontSize: 13,
    },
    customer: {
      color: colors.inkSoft,
      fontSize: 13,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 4,
    },
    actionButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: "center",
    },
    actionButtonText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: "600",
    },
    actionButtonPrimary: {
      backgroundColor: colors.primary,
    },
    actionButtonPrimaryText: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "600",
    },
    dismissButton: {
      padding: 8,
    },
    dismissButtonText: {
      color: colors.muted,
      fontSize: 13,
    },
  });
}
