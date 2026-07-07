import { StyleSheet, Text, View } from "react-native";
import { STATUS_COLORS, type JobPeriodSummary } from "@/lib/jobStatus";

function formatGel(amount: number): string {
  return `${amount.toFixed(0)} GEL`;
}

export function PeriodSummary({ total, completed, pending, paid }: JobPeriodSummary) {
  return (
    <View style={styles.row}>
      <View style={[styles.pill, { backgroundColor: "#37474F" }]}>
        <Text style={styles.pillValue}>{formatGel(total)}</Text>
        <Text style={styles.pillLabel}>Total</Text>
      </View>
      <View style={[styles.pill, { backgroundColor: STATUS_COLORS.complete }]}>
        <Text style={styles.pillValue}>{formatGel(completed)}</Text>
        <Text style={styles.pillLabel}>Completed</Text>
      </View>
      <View style={[styles.pill, { backgroundColor: "#607D8B" }]}>
        <Text style={styles.pillValue}>{formatGel(pending)}</Text>
        <Text style={styles.pillLabel}>Pending</Text>
      </View>
      <View style={[styles.pill, { backgroundColor: STATUS_COLORS.paid }]}>
        <Text style={styles.pillValue}>{formatGel(paid)}</Text>
        <Text style={styles.pillLabel}>Payment status</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pill: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 2,
    alignItems: "center",
  },
  pillValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  pillLabel: {
    color: "#fff",
    fontSize: 9,
    marginTop: 2,
    textAlign: "center",
  },
});
