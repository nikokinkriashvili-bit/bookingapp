import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useThemeColors, type ThemeColors } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { useBusiness } from "@/providers/BusinessProvider";
import { useLanguage } from "@/providers/LanguageProvider";
import { PeriodSummary } from "@/components/PeriodSummary";
import { CalendarFiltersButton } from "@/components/CalendarFiltersButton";
import { FetchError } from "@/components/FetchError";
import { useCalendarFilters } from "@/providers/CalendarFilterProvider";
import { statusTone, summarizeJobs, type JobStatus } from "@/lib/jobStatus";
import { localeFor, type StringKey } from "@/lib/i18n";
import { addDays, addMonths, startOfDay, startOfMonth, toDateKey } from "@/lib/calendarDate";

const WEEKDAY_HEADER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const MAX_CHIPS_PER_CELL = 6;

type JobRow = {
  status: JobStatus;
  scheduled_slot: string;
  scheduled_end: string;
  price_total: number | null;
  service_ids: string[] | null;
  assigned_staff_id: string | null;
  vehicles: { make: string | null; model: string | null } | null;
};

function mondayOnOrBefore(date: Date): Date {
  const offset = (date.getDay() + 6) % 7; // Mon -> 0, Sun -> 6
  return addDays(date, -offset);
}

export default function CalendarMonth() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { business } = useBusiness();
  const { language, t } = useLanguage();
  const { isJobVisible } = useCalendarFilters();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchJobs = useCallback(async () => {
    if (!business) return;
    setError(false);
    const rangeStart = mondayOnOrBefore(month);
    const rangeEnd = addDays(rangeStart, 42);
    // Overlap query so multi-day jobs that start before the visible grid but
    // run into it are still fetched.
    const { data, error: fetchError } = await supabase
      .from("jobs")
      .select(
        "status, scheduled_slot, scheduled_end, price_total, service_ids, assigned_staff_id, vehicles(make, model)"
      )
      .eq("business_id", business.id)
      .lt("scheduled_slot", rangeEnd.toISOString())
      .gt("scheduled_end", rangeStart.toISOString());
    if (fetchError) {
      setError(true);
      setLoading(false);
      return;
    }
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

  // A multi-day job appears on every calendar day it covers.
  const jobsByDate: Record<string, JobRow[]> = {};
  for (const job of visibleJobs) {
    let day = startOfDay(new Date(job.scheduled_slot));
    const lastDay = startOfDay(new Date(job.scheduled_end));
    while (day <= lastDay) {
      const key = toDateKey(day);
      if (!jobsByDate[key]) jobsByDate[key] = [];
      jobsByDate[key].push(job);
      day = addDays(day, 1);
    }
  }

  // Summary stays keyed to each job's start date so a multi-day job is counted
  // once, not once per day it spans.
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
        <Pressable
          style={styles.navButton}
          onPress={() => setMonth((m) => addMonths(m, -1))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t("calendar.prevMonth")}
        >
          <Text style={styles.navButtonText}>{"<"}</Text>
        </Pressable>
        <Text style={styles.monthText}>
          {month.toLocaleDateString(localeFor(language), {
            month: "long",
            year: "numeric",
          })}
        </Text>
        <Pressable
          style={styles.navButton}
          onPress={() => setMonth((m) => addMonths(m, 1))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={t("calendar.nextMonth")}
        >
          <Text style={styles.navButtonText}>{">"}</Text>
        </Pressable>
        <CalendarFiltersButton />
      </View>

      <Link href="/jobs" style={styles.addButton}>
        {t("home.addNewOrder")}
      </Link>

      <PeriodSummary {...summary} />

      <View style={styles.weekdayRow}>
        {WEEKDAY_HEADER.map((d) => (
          <Text key={d} style={styles.weekdayLabel}>
            {t(`weekdayShort.${d}` as StringKey)}
          </Text>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <FetchError onRetry={fetchJobs} />
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
                  {dayJobs.slice(0, MAX_CHIPS_PER_CELL).map((job, i) => {
                    const tone = statusTone(colors, job.status);
                    return (
                    <View
                      key={i}
                      style={[styles.chip, { backgroundColor: tone.bg }]}
                    >
                      <Text
                        style={[styles.chipText, { color: tone.text }]}
                        numberOfLines={1}
                      >
                        {[job.vehicles?.make, job.vehicles?.model]
                          .filter(Boolean)
                          .join(" ") || t("calendar.vehicleFallback")}
                        {job.price_total ? ` · ${job.price_total}` : ""}
                      </Text>
                    </View>
                  );
                  })}
                  {dayJobs.length > MAX_CHIPS_PER_CELL ? (
                    <Text style={styles.moreText}>
                      +{dayJobs.length - MAX_CHIPS_PER_CELL} {t("calendar.more")}
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
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
    borderBottomColor: colors.faintLine,
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.primary,
  },
  monthText: {
    color: colors.ink,
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  addButton: {
    backgroundColor: colors.primary,
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
    color: colors.muted,
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
    borderColor: colors.faintLine,
    padding: 3,
  },
  cellToday: {
    backgroundColor: colors.primaryFaint,
  },
  cellDay: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "600",
  },
  cellDayMuted: {
    color: colors.line,
  },
  chip: {
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 2,
    marginTop: 2,
  },
  chipText: {
    fontSize: 9,
    fontWeight: "600",
  },
  moreText: {
    fontSize: 9,
    color: colors.muted,
    marginTop: 2,
  },
});
}
