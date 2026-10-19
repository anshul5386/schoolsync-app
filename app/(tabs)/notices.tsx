import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getNotices, Notice } from "../../src/api/notices";
import { errorMessage } from "../../src/api/client";
import { colors } from "../../src/theme";

const CATEGORY_COLOR: Record<string, string> = {
  URGENT: colors.danger, ACADEMIC: colors.navy, EVENT: "#1E8E5A", HOLIDAY: "#B7791F", GENERAL: colors.line,
};

/** Read-only notice board. Posting notices (staff) comes with the teacher/staff screens. */
export default function NoticesScreen() {
  const router = useRouter();
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();
  const [rows, setRows] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await getNotices();
      setRows(res.data?.data ?? []);
    } catch (e) {
      setError(errorMessage(e, "Could not load notices."));
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  // Pinned first, as on the website.
  const sorted = useMemo(() => [...rows].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned)), [rows]);

  // From a notification: outline the notice it was about and scroll to it.
  const [listRef, setListRef] = useState<FlatList<Notice> | null>(null);
  useEffect(() => {
    if (!highlight || loading) return;
    const idx = sorted.findIndex((n) => n.id === highlight);
    if (idx >= 0) {
      setFlash(highlight);
      listRef?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 });
    }
    router.setParams({ highlight: undefined });
  }, [highlight, loading, sorted, listRef, router]);

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.navy} /></View>;

  return (
    <FlatList
      ref={setListRef}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      data={sorted}
      keyExtractor={(n) => n.id}
      onScrollToIndexFailed={() => {}}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => {
        setRefreshing(true); await load(); setRefreshing(false);
      }} />}
      ListHeaderComponent={error ? <Text style={s.error}>{error}</Text> : null}
      ListEmptyComponent={!error ? <Text style={s.empty}>No notices have been posted yet.</Text> : null}
      renderItem={({ item }) => (
        <View style={[s.card, { borderLeftColor: CATEGORY_COLOR[item.category] ?? colors.line },
          flash === item.id && s.flash]}>
          <View style={s.row}>
            <Text style={s.chip}>{item.category}</Text>
            {item.pinned && <Text style={s.pinned}>PINNED</Text>}
          </View>
          <Text style={s.title}>{item.title}</Text>
          <Text style={s.body}>{item.body}</Text>
          <Text style={s.meta}>{[item.authorName, audience(item)].filter(Boolean).join(" · ")}</Text>
        </View>
      )}
    />
  );
}

function audience(n: Notice) {
  if (n.audience === "CLASS") return n.targetClassLabel || "One class";
  if (n.audience === "ROLE") return `All ${(n.targetRole ?? "").toLowerCase()}s`;
  return "Whole school";
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { textAlign: "center", marginTop: 40, color: colors.inkMuted, fontSize: 13 },
  error: { padding: 10, borderRadius: 8, backgroundColor: colors.dangerSoft, color: colors.danger, fontSize: 13, marginBottom: 10 },
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.line, borderLeftWidth: 4 },
  flash: { borderColor: colors.navy, borderWidth: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  chip: { fontSize: 10, fontWeight: "700", color: colors.navy, backgroundColor: colors.navy50, paddingHorizontal: 8,
    paddingVertical: 2, borderRadius: 99, overflow: "hidden" },
  pinned: { fontSize: 10, fontWeight: "700", color: "#B7791F" },
  title: { fontSize: 15, fontWeight: "600", color: colors.ink },
  body: { fontSize: 13.5, lineHeight: 20, color: colors.inkMuted, marginTop: 4 },
  meta: { fontSize: 11.5, color: colors.inkSubtle, marginTop: 8 },
});
