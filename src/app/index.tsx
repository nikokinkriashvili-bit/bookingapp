import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/providers/AuthProvider";

export default function Index() {
  const { session, isLoading, signOut } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Signed in as {session.user.email}</Text>
      <Text style={styles.link} onPress={signOut}>
        Sign out
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  text: {
    fontSize: 16,
  },
  link: {
    fontSize: 16,
    color: "#208AEF",
  },
});
