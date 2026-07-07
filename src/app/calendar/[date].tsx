import { useCallback, useEffect, useState } from "react";
import { Link, router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/providers/BusinessProvider";
import { PeriodSummary } from "@/components/PeriodSummary";
import { CalendarFiltersButton } from "@/components/CalendarFiltersButton";
import { useCalendarFilters } from "@/providers/CalendarFilterProvider";
import type { Weekday } from "@/lib/businessTypes";
import {
  STATUS_COLORS,
  STATUS_ORDER,
  STATUS_LABELS,
  summarizeJobs,
  type JobStatus,
} from "@/lib/jobStatus";
import { addDays, fromDateKey, startOfDay, toDateKey } from "@/lib/calendarDate";

type JobRow = {
  id: string;
  status: JobStatus;
  scheduled_slot: string;
  scheduled_end: string;
  price_total: number | null;
  service_ids: string[] | null;
  vehicles: { plate_number: string; make: string | null; model: string | null } | null;
  customers: { name: string } | null;
};

const JS_DAY_TO_WEEKDAY: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function formatRange(job: JobRow): string {
  const start = new Date(job.scheduled_slot);
  const end = new Date(job.scheduled_end);
  const time = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const sameDay = toDateKey(start) === toDateKey(end);
  if (sameDay) {
    return `${time(start)} – ${time(end)}`;
  }
  const withDay = (d: Date) =>
    `${d.toLocaleDateString(undefined, { weekday: "short" })} ${time(d)}`;
  return `${withDay(start)} → ${withDay(end)}`;
}

export default function CalendarDay() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { business } = useBusiness();
  const { isJobVisible } = useCalendarFilters();
  const selectedDate = fromDateKey(date);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobRow | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!business) return;
    const dayStart = startOfDay(selectedDate);
    const dayEnd = addDays(dayStart, 1);
    const { data } = await supabase
      .from("jobs")
      .select(
        "id, status, scheduled_slot, scheduled_end, price_total, service_ids, vehicles(plate_number, make, model), customers(name)"
      )
      .eq("business_id", business.id)
      .gte("scheduled_slot", dayStart.toISOString())
      .lt("scheduled_slot", dayEnd.toISOString())
      .order("scheduled_slot", { ascending: true });
    setJobs((data as unknown as JobRow[]) ?? []);
    setLoading(false);
  }, [business, date]);

  useEffect(() => {
    if (!business) return;
    setLoading(true);
    fetchJobs();

    const channel = supabase
      .channel(`jobs-day-${business.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs",
          filter: `business_id=eq.${business.id}`,
        },
        () => fetchJobs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [business, fetchJobs]);

  const changeStatus = async (jobId: string, newStatus: JobStatus) => {
    setSelectedJob(null);
    await supabase.from("jobs").update({ status: newStatus }).eq("id", jobId);
  };

  const editOrder = () => {
    if (!selectedJob) return;
    const jobId = selectedJob.id;
    setSelectedJob(null);
    router.push(`/jobs/${jobId}/edit`);
  };

  if (!business) return null;

  const visibleJobs = jobs.filter(isJobVisible);

  const goToDay = (offset: number) => {
    router.replace(`/calendar/${toDateKey(addDays(selectedDate, offset))}`);
  };

  const weekday = JS_DAY_TO_WEEKDAY[selectedDate.getDay()];
  const dayHours = business.working_hours[weekday];
  const isClosed = !dayHours && visibleJobs.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Link href="/calendar" style={styles.backLink}>
          {"< Month"}
        </Link>
        <Pressable style={styles.navButton} onPress={() => goToDay(-1)}>
          <Text style={styles.navButtonText}>{"<"}</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.dateText}>
            {selectedDate.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </Text>
          <Pressable onPress={() => router.replace(`/calendar/${toDateKey(new Date())}`)}>
            <Text style={styles.todayLink}>Today</Text>
          </Pressable>
        </View>
        <Pressable style={styles.navButton} onPress={() => goToDay(1)}>
          <Text style={styles.navButtonText}>{">"}</Text>
        </Pressable>
        <CalendarFiltersButton />
      </View>

      <Link href={`/jobs/new?date=${date}`} style={styles.addButton}>
        + Add new order
      </Link>

      <PeriodSummary {...summarizeJobs(visibleJobs)} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : isClosed ? (
        <View style={styles.centered}>
          <Text style={styles.closedText}>Closed</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {visibleJobs.length === 0 ? (
            <Text style={styles.emptyText}>No orders this day.</Text>
          ) : (
            visibleJobs.map((job) => (
              <Pressable
                key={job.id}
                style={[styles.card, { borderLeftColor: STATUS_COLORS[job.status] }]}
                onPress={() => setSelectedJob(job)}
              >
                <Text style={styles.cardPlate}>
                  {[job.vehicles?.plate_number, job.vehicles?.make, job.vehicles?.model]
                    .filter(Boolean)
                    .join(" ")}
                </Text>
                <Text style={styles.cardDetail}>{job.customers?.name ?? "?"}</Text>
                <Text style={styles.cardDetail}>{formatRange(job)}</Text>
                {job.price_total ? (
                  <Text style={styles.cardDetail}>{job.price_total} GEL</Text>
                ) : null}
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      <Modal
        visible={!!selectedJob}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedJob(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedJob(null)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedJob?.vehicles?.plate_number}
            </Text>

            <Pressable style={styles.modalOption} onPress={editOrder}>
              <Text style={styles.editOrderText}>Edit order</Text>
            </Pressable>

            <Text style={styles.modalSubtitle}>Change status to...</Text>
            {STATUS_ORDER.filter((s) => s !== selectedJob?.status).map((status) => (
              <Pressable
                key={status}
                style={styles.modalOption}
                onPress={() => selectedJob && changeStatus(selectedJob.id, status)}
              >
                <View
                  style={[styles.modalDot, { backgroundColor: STATUS_COLORS[status] }]}
                />
                <Text style={styles.modalOptionText}>{STATUS_LABELS[status]}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backLink: {
    fontSize: 13,
    color: "#208AEF",
    marginRight: 8,
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#208AEF",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  dateText: {
    fontSize: 16,
    fontWeight: "700",
  },
  todayLink: {
    fontSize: 12,
    color: "#208AEF",
    marginTop: 2,
  },
  addButton: {
    backgroundColor: "#208AEF",
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    padding: 14,
    borderRadius: 8,
    marginHorizontal: 16,
    marginTop: 12,
    overflow: "hidden",
  },
  closedText: {
    fontSize: 16,
    color: "#999",
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  emptyText: {
    color: "#999",
    textAlign: "center",
    marginTop: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderLeftWidth: 5,
    borderRadius: 8,
    padding: 12,
    gap: 2,
  },
  cardPlate: {
    fontSize: 16,
    fontWeight: "700",
  },
  cardDetail: {
    fontSize: 13,
    color: "#555",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: 280,
    gap: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    marginTop: 10,
    marginBottom: 2,
  },
  editOrderText: {
    fontSize: 15,
    color: "#208AEF",
    fontWeight: "600",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  modalDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  modalOptionText: {
    fontSize: 15,
  },
});
