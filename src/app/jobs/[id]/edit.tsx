import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/providers/BusinessProvider";
import { parseDateAndTime, toDateKey, toTimeString } from "@/lib/calendarDate";
import { STATUS_LABELS, STATUS_ORDER, type JobStatus } from "@/lib/jobStatus";

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price_gel: number | null;
};

type JobDetail = {
  id: string;
  status: JobStatus;
  service_ids: string[];
  scheduled_slot: string;
  scheduled_end: string;
  vehicles: { plate_number: string; make: string | null; model: string | null } | null;
  customers: { name: string; phone: string } | null;
};

export default function EditJob() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { business } = useBusiness();

  const [job, setJob] = useState<JobDetail | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [status, setStatus] = useState<JobStatus>("booked");
  const [fromDate, setFromDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toDate, setToDate] = useState("");
  const [toTime, setToTime] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!business) return;
    supabase
      .from("services")
      .select("id, name, duration_minutes, price_gel")
      .eq("business_id", business.id)
      .then(({ data }) => setServices(data ?? []));
  }, [business]);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("jobs")
      .select(
        "id, status, service_ids, scheduled_slot, scheduled_end, vehicles(plate_number, make, model), customers(name, phone)"
      )
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (!data) {
          setLoading(false);
          return;
        }
        const j = data as unknown as JobDetail;
        setJob(j);
        setSelectedServiceIds(j.service_ids ?? []);
        setStatus(j.status);
        const start = new Date(j.scheduled_slot);
        const end = new Date(j.scheduled_end);
        setFromDate(toDateKey(start));
        setFromTime(toTimeString(start));
        setToDate(toDateKey(end));
        setToTime(toTimeString(end));
        setLoading(false);
      });
  }, [id]);

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((s) => s !== serviceId)
        : [...prev, serviceId]
    );
  };

  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const totalMinutes = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price_gel ?? 0), 0);

  const onSave = async () => {
    if (!job) return;
    setError(null);

    if (selectedServiceIds.length === 0) {
      setError("Select at least one service.");
      return;
    }
    if (!fromDate || !fromTime || !toDate || !toTime) {
      setError("Enter a from and to date/time.");
      return;
    }
    const scheduledSlot = parseDateAndTime(fromDate, fromTime);
    const scheduledEnd = parseDateAndTime(toDate, toTime);
    if (isNaN(scheduledSlot.getTime()) || isNaN(scheduledEnd.getTime())) {
      setError("Date/time format is invalid. Use YYYY-MM-DD and HH:MM.");
      return;
    }
    if (scheduledEnd <= scheduledSlot) {
      setError("The end time must be after the start time.");
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase
      .from("jobs")
      .update({
        service_ids: selectedServiceIds,
        status,
        scheduled_slot: scheduledSlot.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        price_total: totalPrice,
      })
      .eq("id", job.id);
    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.back();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.centered}>
        <Text>Order not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Edit order</Text>

      <View style={styles.section}>
        <Text style={styles.readOnlyPlate}>{job.vehicles?.plate_number}</Text>
        <Text style={styles.readOnlyDetail}>
          {[job.vehicles?.make, job.vehicles?.model].filter(Boolean).join(" ")}
        </Text>
        <Text style={styles.readOnlyDetail}>
          {job.customers?.name} · {job.customers?.phone}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Status</Text>
        {STATUS_ORDER.map((s) => (
          <Pressable
            key={s}
            style={[styles.option, status === s && styles.optionSelected]}
            onPress={() => setStatus(s)}
          >
            <Text style={status === s ? styles.optionTextSelected : styles.optionText}>
              {STATUS_LABELS[s]}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Services</Text>
        {services.map((s) => (
          <Pressable
            key={s.id}
            style={[
              styles.option,
              selectedServiceIds.includes(s.id) && styles.optionSelected,
            ]}
            onPress={() => toggleService(s.id)}
          >
            <Text
              style={
                selectedServiceIds.includes(s.id)
                  ? styles.optionTextSelected
                  : styles.optionText
              }
            >
              {s.name} · {s.duration_minutes}min
              {s.price_gel ? ` · ${s.price_gel} GEL` : ""}
            </Text>
          </Pressable>
        ))}
        {selectedServiceIds.length > 0 ? (
          <Text style={styles.totalText}>
            Total: {totalMinutes}min · {totalPrice} GEL
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Schedule</Text>
        <Text style={styles.subLabel}>From</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={fromDate}
          onChangeText={setFromDate}
        />
        <TextInput
          style={styles.input}
          placeholder="HH:MM"
          value={fromTime}
          onChangeText={setFromTime}
        />
        <Text style={styles.subLabel}>To</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={toDate}
          onChangeText={setToDate}
        />
        <TextInput
          style={styles.input}
          placeholder="HH:MM"
          value={toTime}
          onChangeText={setToTime}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.button} onPress={onSave} disabled={submitting}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Save changes</Text>
        )}
      </Pressable>
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
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  section: {
    gap: 8,
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  subLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    marginTop: 6,
  },
  readOnlyPlate: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 1,
  },
  readOnlyDetail: {
    fontSize: 14,
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
    padding: 12,
  },
  optionSelected: {
    borderColor: "#208AEF",
    backgroundColor: "#e8f2fd",
  },
  optionText: {
    fontSize: 15,
  },
  optionTextSelected: {
    color: "#208AEF",
    fontWeight: "600",
  },
  totalText: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
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
