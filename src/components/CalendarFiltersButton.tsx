import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme";
import { STATUS_COLORS, STATUS_ORDER, statusLabelKey } from "@/lib/jobStatus";
import { useCalendarFilters } from "@/providers/CalendarFilterProvider";
import { useT } from "@/providers/LanguageProvider";

export function CalendarFiltersButton() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const {
    services,
    staff,
    excludedStatuses,
    excludedServiceIds,
    excludedStaffIds,
    toggleStatus,
    toggleService,
    toggleStaff,
  } = useCalendarFilters();

  const activeCount =
    excludedStatuses.size + excludedServiceIds.size + excludedStaffIds.size;

  return (
    <>
      <Pressable style={styles.button} onPress={() => setOpen(true)}>
        <Text style={styles.buttonText}>
          {t("filters.title")}
          {activeCount > 0 ? ` (${activeCount})` : ""}
        </Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>{t("filters.title")}</Text>
            <ScrollView style={styles.scroll}>
              <Text style={styles.sectionTitle}>{t("filters.status")}</Text>
              {STATUS_ORDER.map((status) => {
                const checked = !excludedStatuses.has(status);
                return (
                  <Pressable
                    key={status}
                    style={styles.row}
                    onPress={() => toggleStatus(status)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        checked && { backgroundColor: STATUS_COLORS[status] },
                      ]}
                    />
                    <Text style={styles.rowText}>{t(statusLabelKey(status))}</Text>
                  </Pressable>
                );
              })}

              <Text style={styles.sectionTitle}>{t("filters.service")}</Text>
              {services.length === 0 ? (
                <Text style={styles.emptyText}>{t("filters.noServices")}</Text>
              ) : (
                services.map((service) => {
                  const checked = !excludedServiceIds.has(service.id);
                  return (
                    <Pressable
                      key={service.id}
                      style={styles.row}
                      onPress={() => toggleService(service.id)}
                    >
                      <View
                        style={[styles.checkbox, checked && styles.checkboxChecked]}
                      />
                      <Text style={styles.rowText}>{service.name}</Text>
                    </Pressable>
                  );
                })
              )}

              {staff.length > 0 ? (
                <>
                  <Text style={styles.sectionTitle}>{t("filters.staffSection")}</Text>
                  {staff.map((member) => {
                    const checked = !excludedStaffIds.has(member.id);
                    return (
                      <Pressable
                        key={member.id}
                        style={styles.row}
                        onPress={() => toggleStaff(member.id)}
                      >
                        <View
                          style={[styles.checkbox, checked && styles.checkboxChecked]}
                        />
                        <Text style={styles.rowText}>{member.name}</Text>
                      </Pressable>
                    );
                  })}
                </>
              ) : null}
            </ScrollView>
            <Pressable style={styles.doneButton} onPress={() => setOpen(false)}>
              <Text style={styles.doneButtonText}>{t("filters.done")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  buttonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: 300,
    maxHeight: "70%",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  scroll: {
    maxHeight: 380,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkSoft,
    marginTop: 12,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rowText: {
    fontSize: 14,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
  },
  doneButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginTop: 12,
  },
  doneButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});
