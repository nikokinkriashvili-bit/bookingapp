import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { STATUS_COLORS, STATUS_LABELS, STATUS_ORDER } from "@/lib/jobStatus";
import { useCalendarFilters } from "@/providers/CalendarFilterProvider";

export function CalendarFiltersButton() {
  const [open, setOpen] = useState(false);
  const { services, excludedStatuses, excludedServiceIds, toggleStatus, toggleService } =
    useCalendarFilters();

  const activeCount = excludedStatuses.size + excludedServiceIds.size;

  return (
    <>
      <Pressable style={styles.button} onPress={() => setOpen(true)}>
        <Text style={styles.buttonText}>
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
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
            <Text style={styles.title}>Filters</Text>
            <ScrollView style={styles.scroll}>
              <Text style={styles.sectionTitle}>Status</Text>
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
                    <Text style={styles.rowText}>{STATUS_LABELS[status]}</Text>
                  </Pressable>
                );
              })}

              <Text style={styles.sectionTitle}>Service</Text>
              {services.length === 0 ? (
                <Text style={styles.emptyText}>No services yet.</Text>
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
            </ScrollView>
            <Pressable style={styles.doneButton} onPress={() => setOpen(false)}>
              <Text style={styles.doneButtonText}>Done</Text>
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
    borderColor: "#208AEF",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  buttonText: {
    color: "#208AEF",
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
    color: "#555",
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
    borderColor: "#ccc",
  },
  checkboxChecked: {
    backgroundColor: "#208AEF",
    borderColor: "#208AEF",
  },
  rowText: {
    fontSize: 14,
  },
  emptyText: {
    color: "#999",
    fontSize: 13,
  },
  doneButton: {
    backgroundColor: "#208AEF",
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
