import { useCallback, useEffect, useState } from "react";
import { Link, router } from "expo-router";
import {
  ActivityIndicator,
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
import { STATUS_COLORS, summarizeJobs, type JobStatus } from "@/lib/jobStatus";
import { addDays, addMonths, startOfMonth, toDateKey } from "@/lib/calendarDate";

const WEEKDAY_HEADER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_CHIPS_PER_CELL = 6;

type JobRow = {
  status: JobStatus;
  scheduled_slot: string;
  price_total: number | null;
  service_ids: string[] | null;
  vehicles: { make: string | null; model: string | null } | null;
};

function mondayOnOrBefore(date: Date): Date {
  const offset = (date.getDay() + 6) % 7; // Mon -> 0, Sun -> 6
  return addDays(date, -offset);
}

export default function CalendarMonth() {
  const { business } = useBusiness();
  const { isJobVisible } = useCalendarFilters();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    if (!business) return;
    const rangeStart = mondayOnOrBefore(month);
    const rangeEnd = addDays(rangeStart, 42);
    const { data } = await supabase
      .from("jobs")
      .select("status, scheduled_slot, price_total, service_ids, vehicles(make, model)")
      .eq("business_id", business.id)
      .gte("scheduled_slot", rangeStart.toISOString())
      .lt("scheduled_slot", rangeEnd.toISOString());
    setJobs((data as unknown as JobRow[]) ?? []);
    setLoading(false);
  }, [business, month]);

  useEffect(() => {
    if (!business) return;
    setLoading(true);
    fetchJobs();

    const channel = supabase
      .channel(`jobs-month-${business.id}`)
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

  if (!business) return null;

  const visibleJobs = jobs.filter(isJobVisible);

  const jobsByDate: Record<string, JobRow[]> = {};
  for (const job of visibleJobs) {
    const key = toDateKey(new Date(job.scheduled_slot));
    if (!jobsByDate[key]) jobsByDate[key] = [];
    jobsByDate[key].push(job);
  }

  const monthEnd = addMonths(month, 1);
  const jobsInMonth = visibleJobs.filter((j) => {
    const d = new Date(j.scheduled_slot);
    return d >= month && d < monthEnd;
  });
  const summary = summarizeJobs(jobsInMonth);

  const gridStart = mondayOnOrBefore(month);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = toDateKey(new Date());

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.navButton} onPress={() => setMonth((m) => addMonths(m, -1))}>
          <Text style={styles.navButtonText}>{"<"}</Text>
        </Pressable>
        <Text style={styles.monthText}>
          {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </Text>
        <Pressable style={styles.navButton} onPress={() => setMonth((m) => addMonths(m, 1))}>
          <Text style={styles.navButtonText}>{">"}</Text>
        </Pressable>
        <CalendarFiltersButton />
      </View>

      <Link href="/jobs/new" style={styles.addButton}>
        + Add new order
      </Link>

      <PeriodSummary {...summary} />

      <View style={styles.weekdayRow}>
        {WEEKDAY_HEADER.map((d) => (
          <Text key={d} style={styles.weekdayLabel}>
            {d}
          </Text>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView>
          <View style={styles.grid}>
            {cells.map((date) => {
              const key = toDateKey(date);
              const dayJobs = jobsByDate[key] ?? [];
              const isCurrentMonth = date.getMonth() === month.getMonth();
              return (
                <Pressable
                  key={key}
                  style={[styles.cell, key === today && styles.cellToday]}
                  onPress={() => router.push(`/calendar/${key}`)}
                >
                  <Text style={[styles.cellDay, !isCurrentMonth && styles.cellDayMuted]}>
                    {date.getDate()}
                  </Text>
                  {dayJobs.slice(0, MAX_CHIPS_PER_CELL).map((job, i) => (
                    <View
                      key={i}
                      style={[styles.chip, { backgroundColor: STATUS_COLORS[job.status] }]}
                    >
                      <Text style={styles.chipText} numberOfLines={1}>
                        {[job.vehicles?.make, job.vehicles?.model]
                          .filter(Boolean)
                          .join(" ") || "Vehicle"}
                        {job.price_total ? ` · ${job.price_total}` : ""}
                      </Text>
                    </View>
                  ))}
                  {dayJobs.length > MAX_CHIPS_PER_CELL ? (
                    <Text style={styles.moreText}>
                      +{dayJobs.length - MAX_CHIPS_PER_CELL} more
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}
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
    padding: 16,
    paddingBottom: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#208AEF",
  },
  monthText: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
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
  weekdayRow: {
    flexDirection: "row",
    paddingVertical: 8,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    color: "#999",
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: "14.2857%",
    minHeight: 90,
    borderWidth: 0.5,
    borderColor: "#f0f0f0",
    padding: 3,
  },
  cellToday: {
    backgroundColor: "#e8f2fd",
  },
  cellDay: {
    fontSize: 12,
    fontWeight: "600",
  },
  cellDayMuted: {
    color: "#ccc",
  },
  chip: {
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 2,
    marginTop: 2,
  },
  chipText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "600",
  },
  moreText: {
    fontSize: 9,
    color: "#999",
    marginTop: 2,
  },
});
