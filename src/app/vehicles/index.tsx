import { useEffect, useMemo, useState } from "react";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useThemeColors, type ThemeColors } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/providers/BusinessProvider";
import { useT } from "@/providers/LanguageProvider";
import { PlateChip } from "@/components/PlateChip";
import { toDateKey } from "@/lib/calendarDate";

type VehicleRow = {
  id: string;
  plate_number: string;
  make: string | null;
  model: string | null;
};

export default function Vehicles() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { business } = useBusiness();
  const t = useT();

  const [vehicles, setVehicles] = useState<VehicleRow[] | null>(null);
  const [lastVisit, setLastVisit] = useState<Map<string, string>>(new Map());
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!business) return;
    Promise.all([
      supabase
        .from("vehicles")
        .select("id, plate_number, make, model")
        .eq("business_id", business.id)
        .order("plate_number"),
      supabase
        .from("jobs")
        .select("vehicle_id, scheduled_slot")
        .eq("business_id", business.id)
        .neq("status", "cancelled"),
    ]).then(([vehiclesResult, jobsResult]) => {
      setVehicles(vehiclesResult.data ?? []);
      const now = new Date().toISOString();
      const latest = new Map<string, string>();
      for (const job of jobsResult.data ?? []) {
        // "Last visit" = most recent past job; a future booking isn't a visit.
        if (job.scheduled_slot > now) continue;
        const existing = latest.get(job.vehicle_id);
        if (!existing || job.scheduled_slot > existing) {
          latest.set(job.vehicle_id, job.scheduled_slot);
        }
      }
      setLastVisit(latest);
    });
  }, [business]);

  const filtered = useMemo(() => {
    if (!vehicles) return null;
    const q = search.trim().toUpperCase();
    if (!q) return vehicles;
    return vehicles.filter((v) => v.plate_number.includes(q));
  }, [vehicles, search]);

  if (!filtered) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("vehicles.title")}</Text>
      <TextInput
        style={styles.search}
        placeholder={t("vehicles.searchPlaceholder")}
        autoCapitalize="characters"
        value={search}
        onChangeText={(v) => setSearch(v.toUpperCase())}
      />
      <FlatList
        data={filtered}
        keyExtractor={(v) => v.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {search ? t("vehicles.noResults") : t("vehicles.empty")}
          </Text>
        }
        renderItem={({ item }) => {
          const visit = lastVisit.get(item.id);
          return (
            <Link href={`/vehicles/${item.id}`} asChild>
              <Pressable style={styles.row}>
                <PlateChip plate={item.plate_number} />
                <View style={styles.rowDetails}>
                  <Text style={styles.rowMakeModel}>
                    {[item.make, item.model].filter(Boolean).join(" ") || "—"}
                  </Text>
                  <Text style={styles.rowVisit}>
                    {visit
                      ? `${t("vehicles.lastVisit")}: ${toDateKey(new Date(visit))}`
                      : t("vehicles.noVisits")}
                  </Text>
                </View>
              </Pressable>
            </Link>
          );
        }}
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
  search: {
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    letterSpacing: 1,
  },
  list: {
    gap: 8,
    paddingBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.surface,
  },
  rowDetails: {
    flex: 1,
    gap: 2,
  },
  rowMakeModel: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "600",
  },
  rowVisit: {
    fontSize: 12,
    color: colors.muted,
  },
  empty: {
    textAlign: "center",
    color: colors.muted,
    marginTop: 32,
    fontSize: 14,
  },
});
}
