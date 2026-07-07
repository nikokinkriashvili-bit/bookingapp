import { useCallback, useEffect, useState } from "react";
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
import {
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_ORDER,
  type JobStatus,
} from "@/lib/jobStatus";

type JobRow = {
  id: string;
  status: JobStatus;
  scheduled_slot: string;
  price_total: number | null;
  vehicles: { plate_number: string } | null;
  customers: { name: string } | null;
};

export default function Whiteboard() {
  const { business } = useBusiness();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobRow | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!business) return;
    const { data } = await supabase
      .from("jobs")
      .select(
        "id, status, scheduled_slot, price_total, vehicles(plate_number), customers(name)"
      )
      .eq("business_id", business.id)
      .order("scheduled_slot", { ascending: true });
    setJobs((data as unknown as JobRow[]) ?? []);
    setLoading(false);
  }, [business]);

  useEffect(() => {
    if (!business) return;
    fetchJobs();

    const channel = supabase
      .channel(`jobs-business-${business.id}`)
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal contentContainerStyle={styles.board}>
        {STATUS_ORDER.map((status) => {
          const columnJobs = jobs.filter((j) => j.status === status);
          return (
            <View key={status} style={styles.column}>
              <View
                style={[styles.columnHeader, { backgroundColor: STATUS_COLORS[status] }]}
              >
                <Text style={styles.columnHeaderText}>
                  {STATUS_LABELS[status]} ({columnJobs.length})
                </Text>
              </View>
              <ScrollView style={styles.columnBody}>
                {columnJobs.map((job) => (
                  <Pressable
                    key={job.id}
                    style={styles.card}
                    onPress={() => setSelectedJob(job)}
                  >
                    <Text style={styles.cardPlate}>
                      {job.vehicles?.plate_number ?? "?"}
                    </Text>
                    <Text style={styles.cardDetail}>
                      {job.customers?.name ?? "?"}
                    </Text>
                    <Text style={styles.cardDetail}>
                      {new Date(job.scheduled_slot).toLocaleString()}
                    </Text>
                    {job.price_total ? (
                      <Text style={styles.cardDetail}>{job.price_total} GEL</Text>
                    ) : null}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>

      <Modal
        visible={!!selectedJob}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedJob(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedJob(null)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Move {selectedJob?.vehicles?.plate_number} to...
            </Text>
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
  },
  board: {
    padding: 12,
    gap: 12,
  },
  column: {
    width: 220,
    marginRight: 12,
  },
  columnHeader: {
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  columnHeaderText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  columnBody: {
    maxHeight: 600,
  },
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    gap: 2,
    backgroundColor: "#fff",
  },
  cardPlate: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1,
  },
  cardDetail: {
    fontSize: 12,
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
    fontWeight: "600",
    marginBottom: 8,
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
