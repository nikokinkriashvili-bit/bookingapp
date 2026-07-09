import { useCallback, useEffect, useState } from "react";
import { Link, router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/providers/BusinessProvider";
import { useT } from "@/providers/LanguageProvider";
import { PlateChip } from "@/components/PlateChip";
import { formatGel, type StringKey } from "@/lib/i18n";
import { toDateKey } from "@/lib/calendarDate";
import { STATUS_COLORS, type JobStatus } from "@/lib/jobStatus";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
};

type VehicleLink = {
  id: string;
  plate_number: string;
  make: string | null;
  model: string | null;
};

type Job = {
  id: string;
  status: JobStatus;
  service_ids: string[];
  scheduled_slot: string;
  price_total: number | null;
  vehicle_id: string;
};

export default function CustomerProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { business } = useBusiness();
  const t = useT();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicles, setVehicles] = useState<VehicleLink[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [serviceNames, setServiceNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id || !business) return;
    const [customerResult, vehiclesResult, jobsResult, servicesResult] =
      await Promise.all([
        supabase
          .from("customers")
          .select("id, name, phone, email")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("customer_vehicles")
          .select("vehicles(id, plate_number, make, model)")
          .eq("customer_id", id),
        supabase
          .from("jobs")
          .select("id, status, service_ids, scheduled_slot, price_total, vehicle_id")
          .eq("customer_id", id)
          .order("scheduled_slot", { ascending: false }),
        supabase.from("services").select("id, name").eq("business_id", business.id),
      ]);

    setCustomer(customerResult.data ?? null);
    setVehicles(
      ((vehiclesResult.data ?? []) as any[])
        .map((row) => row.vehicles)
        .filter(Boolean)
    );
    setJobs((jobsResult.data ?? []) as Job[]);
    setServiceNames(new Map((servicesResult.data ?? []).map((s) => [s.id, s.name])));
    setLoading(false);
  }, [id, business]);

  useEffect(() => {
    load();
  }, [load]);

  const startEditing = () => {
    if (!customer) return;
    setName(customer.name);
    setPhone(customer.phone);
    setEmail(customer.email ?? "");
    setError(null);
    setEditing(true);
  };

  const onSave = async () => {
    if (!customer) return;
    if (!name.trim() || !phone.trim()) return;
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("customers")
      .update({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
      })
      .eq("id", customer.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setEditing(false);
    load();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.centered}>
        <Text>{t("common.notFound")}</Text>
      </View>
    );
  }

  const visitCount = jobs.filter(
    (j) => j.status === "complete" || j.status === "paid"
  ).length;
  const totalSpend = jobs
    .filter((j) => j.status === "paid")
    .reduce((sum, j) => sum + (j.price_total ?? 0), 0);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.name}>{customer.name}</Text>
      <Pressable onPress={() => Linking.openURL(`tel:${customer.phone}`)}>
        <Text style={styles.phone}>{customer.phone}</Text>
      </Pressable>
      {customer.email ? <Text style={styles.email}>{customer.email}</Text> : null}

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{visitCount}</Text>
          <Text style={styles.statLabel}>{t("common.visits")}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatGel(totalSpend)}</Text>
          <Text style={styles.statLabel}>{t("common.totalSpend")}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>{t("customer.details")}</Text>
          {!editing ? (
            <Pressable onPress={startEditing}>
              <Text style={styles.editLink}>{t("common.edit")}</Text>
            </Pressable>
          ) : null}
        </View>

        {editing ? (
          <View style={styles.editForm}>
            <TextInput
              style={styles.input}
              placeholder={t("customer.name")}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder={t("customer.phone")}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <TextInput
              style={styles.input}
              placeholder={t("customer.email")}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.editActions}>
              <Pressable style={styles.secondaryButton} onPress={() => setEditing(false)}>
                <Text style={styles.secondaryButtonText}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable style={styles.primaryButton} onPress={onSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>{t("common.save")}</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      {vehicles.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("customer.vehicles")}</Text>
          {vehicles.map((v) => (
            <Link key={v.id} href={`/vehicles/${v.id}`} asChild>
              <Pressable style={styles.vehicleRow}>
                <PlateChip plate={v.plate_number} />
                <Text style={styles.vehicleMakeModel}>
                  {[v.make, v.model].filter(Boolean).join(" ") || "—"}
                </Text>
              </Pressable>
            </Link>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t("customer.jobHistory")}</Text>
        {jobs.length === 0 ? (
          <Text style={styles.empty}>{t("customer.noHistory")}</Text>
        ) : (
          jobs.map((job) => {
            const vehicle = vehicles.find((v) => v.id === job.vehicle_id);
            return (
              <Pressable
                key={job.id}
                style={[styles.jobCard, { borderLeftColor: STATUS_COLORS[job.status] }]}
                onPress={() => router.push(`/jobs/${job.id}/edit`)}
              >
                <View style={styles.jobCardTop}>
                  <Text style={styles.jobDate}>
                    {toDateKey(new Date(job.scheduled_slot))}
                    {vehicle ? ` · ${vehicle.plate_number}` : ""}
                  </Text>
                  <Text style={styles.jobPrice}>
                    {job.price_total != null ? formatGel(job.price_total) : ""}
                  </Text>
                </View>
                <Text style={styles.jobServices}>
                  {job.service_ids
                    .map((sid) => serviceNames.get(sid))
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </Text>
                <Text style={[styles.jobStatus, { color: STATUS_COLORS[job.status] }]}>
                  {t(`status.${job.status}` as StringKey)}
                </Text>
              </Pressable>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    padding: 24,
    gap: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  phone: {
    fontSize: 16,
    color: colors.primary,
    textAlign: "center",
    fontWeight: "600",
  },
  email: {
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  stat: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  section: {
    gap: 8,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.inkSoft,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  editLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  editForm: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  editActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
  },
  vehicleMakeModel: {
    fontSize: 15,
    fontWeight: "600",
  },
  jobCard: {
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#fff",
    gap: 4,
  },
  jobCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  jobDate: {
    fontSize: 14,
    fontWeight: "600",
  },
  jobPrice: {
    fontSize: 14,
    fontWeight: "700",
  },
  jobServices: {
    fontSize: 13,
    color: colors.inkSoft,
  },
  jobStatus: {
    fontSize: 12,
    fontWeight: "600",
  },
  empty: {
    color: colors.muted,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
  },
});
