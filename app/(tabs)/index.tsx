import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { getMyAssignments, Assignment } from "../../src/api/studentRecords";
import { errorMessage } from "../../src/api/client";
import { useAuth } from "../../src/auth/AuthContext";
import { colors } from "../../src/theme";

/** First real screen: a student's assignments. Other roles get their screens in later PRs. */
export default function AssignmentsScreen() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await getMyAssignments();
      setRows(res.data?.data ?? []);
    } catch (e) {
      setError(errorMessage(e, "Could not load your assignments."));
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  if (user?.role !== "STUDENT") {
    return (
      <View style={s.center}>
        <Text style={s.title}>Welcome, {user?.name}</Text>
        <Text style={s.muted}>Screens for the {user?.role?.toLowerCase()} role are coming soon.</Text>
      </View>
    );
  }
  if (loading) return <View style={s.center}><ActivityIndicator color={colors.navy} /></View>;

  return (
    <FlatList
      contentContainerStyle={{ padding: 16, gap: 10 }}
      data={rows}
      keyExtractor={(a) => a.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => {
        setRefreshing(true); await load(); setRefreshing(false);
      }} />}
      ListHeaderComponent={error ? <Text style={s.error}>{error}</Text> : null}
      ListEmptyComponent={!error ? <Text style={[s.muted, { textAlign: "center", marginTop: 40 }]}>Nothing set right now.</Text> : null}
      renderItem={({ item }) => (
        <View style={s.card}>
          <Text style={s.chip}>{item.subject}</Text>
          <Text style={s.cardTitle}>{item.title}</Text>
          {!!item.description && <Text numberOfLines={2} style={s.muted}>{item.description}</Text>}
          <Text style={s.meta}>Due {new Date(item.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            {item.teacherName ? ` · ${item.teacherName}` : ""}</Text>
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.canvas },
  title: { fontSize: 18, fontWeight: "600", color: colors.ink, marginBottom: 6 },
  muted: { fontSize: 13, color: colors.inkMuted },
  error: { padding: 10, borderRadius: 8, backgroundColor: colors.dangerSoft, color: colors.danger, fontSize: 13, marginBottom: 10 },
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.line, gap: 4 },
  chip: { alignSelf: "flex-start", backgroundColor: colors.navy50, color: colors.navy, fontSize: 10, fontWeight: "700",
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, overflow: "hidden", textTransform: "uppercase" },
  cardTitle: { fontSize: 15, fontWeight: "600", color: colors.navy },
  meta: { fontSize: 11.5, color: colors.inkSubtle, marginTop: 2 },
});
