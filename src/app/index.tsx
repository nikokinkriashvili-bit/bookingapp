import { useEffect, useState } from "react";
import { Link, Redirect } from "expo-router";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useBusiness } from "@/providers/BusinessProvider";

type JobRow = {
  id: string;
  status: string;
  scheduled_slot: string;
  price_total: number | null;
  vehicles: { plate_number: string } | null;
  customers: { name: string } | null;
};

export default function Index() {
  const { session, isLoading: isAuthLoading, signOut } = useAuth();
  const { business, isLoading: isBusinessLoading } = useBusiness();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  useEffect(() => {
    if (!business) return;
    supabase
      .from("jobs")
      .select(
        "id, status, scheduled_slot, price_total, vehicles(plate_number), customers(name)"
      )
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setJobs((data as unknown as JobRow[]) ?? []);
        setJobsLoading(false);
      });
  }, [business]);

  if (isAuthLoading || (session && isBusinessLoading)) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!business) {
    return <Redirect href="/onboarding/business-type" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{business.name}</Text>
      <Text style={styles.text}>Signed in as {session.user.email}</Text>
      <Text style={styles.link} onPress={signOut}>
        Sign out
      </Text>

      <Link href="/jobs/new" style={styles.newJobButton}>
        + New job
      </Link>

      <Text style={styles.sectionLabel}>Recent jobs</Text>
      {jobsLoading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          style={styles.list}
          data={jobs}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.emptyText}>No jobs yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.jobRow}>
              <Text style={styles.jobPlate}>
                {item.vehicles?.plate_number ?? "?"}
              </Text>
              <Text style={styles.jobDetail}>{item.customers?.name ?? "?"}</Text>
              <Text style={styles.jobDetail}>
                {new Date(item.scheduled_slot).toLocaleString()}
              </Text>
              <Text style={styles.jobStatus}>{item.status}</Text>
            </View>
          )}
        />
      )}
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
    padding: 24,
    gap: 8,
  },
  text: {
    fontSize: 16,
  },
  link: {
    fontSize: 16,
    color: "#208AEF",
  },
  newJobButton: {
    backgroundColor: "#208AEF",
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    padding: 14,
    borderRadius: 8,
    marginTop: 16,
    overflow: "hidden",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
    marginTop: 20,
  },
  list: {
    marginTop: 8,
  },
  jobRow: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 2,
  },
  jobPlate: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  jobDetail: {
    fontSize: 14,
    color: "#555",
  },
  jobStatus: {
    fontSize: 12,
    color: "#208AEF",
    fontWeight: "600",
    textTransform: "uppercase",
    marginTop: 4,
  },
  emptyText: {
    color: "#999",
  },
});
