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

type CustomerRow = {
  id: string;
  name: string;
  phone: string;
};

export default function Customers() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { business } = useBusiness();
  const t = useT();

  const [customers, setCustomers] = useState<CustomerRow[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!business) return;
    supabase
      .from("customers")
      .select("id, name, phone")
      .eq("business_id", business.id)
      .order("name")
      .then(({ data }) => setCustomers(data ?? []));
  }, [business]);

  const filtered = useMemo(() => {
    if (!customers) return null;
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customers, search]);

  if (!filtered) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("customers.title")}</Text>
      <TextInput
        style={styles.search}
        placeholder={t("customers.searchPlaceholder")}
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        data={filtered}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {search ? t("customers.noResults") : t("customers.empty")}
          </Text>
        }
        renderItem={({ item }) => (
          <Link href={`/customers/${item.id}`} asChild>
            <Pressable style={styles.row}>
              <Text style={styles.rowName}>{item.name}</Text>
              <Text style={styles.rowPhone}>{item.phone}</Text>
            </Pressable>
          </Link>
        )}
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
  },
  list: {
    gap: 8,
    paddingBottom: 24,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    padding: 14,
    backgroundColor: colors.surface,
  },
  rowName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "600",
  },
  rowPhone: {
    fontSize: 13,
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
