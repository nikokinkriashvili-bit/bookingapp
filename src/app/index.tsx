import { Link, Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/providers/AuthProvider";
import { useBusiness } from "@/providers/BusinessProvider";

export default function Index() {
  const { session, isLoading: isAuthLoading, signOut } = useAuth();
  const { business, isLoading: isBusinessLoading } = useBusiness();

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

      <Link href="/whiteboard" style={styles.whiteboardButton}>
        Whiteboard
      </Link>
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
  whiteboardButton: {
    backgroundColor: "#fff",
    color: "#208AEF",
    borderWidth: 1,
    borderColor: "#208AEF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    padding: 14,
    borderRadius: 8,
    overflow: "hidden",
  },
});
