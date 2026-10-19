import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { getNotifications, markRead, AppNotification } from "../../src/api/notifications";
import { errorMessage } from "../../src/api/client";
import { colors } from "../../src/theme";

export default function NotificationsScreen() {
  const [rows, setRows] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await getNotifications();
      setRows(res.data?.data ?? []);
    } catch (e) {
      setError(errorMessage(e, "Could not load notifications."));
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const isRead = (n: AppNotification) => !!(n.read ?? n.isRead);

  const open = async (n: AppNotification) => {
    if (!isRead(n)) {
      setRows((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true, isRead: true } : x)));
      markRead(n.id).catch(() => {});
    }
    // Tap-to-open deep links (assignment popup, notice) arrive with the next PR, mirroring the
    // website's notificationTarget().
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={colors.navy} /></View>;

  return (
    <FlatList
      contentContainerStyle={{ padding: 16, gap: 8 }}
      data={rows}
      keyExtractor={(n) => n.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => {
        setRefreshing(true); await load(); setRefreshing(false);
      }} />}
      ListHeaderComponent={error ? <Text style={s.error}>{error}</Text> : null}
      ListEmptyComponent={!error ? <Text style={s.empty}>You are all caught up.</Text> : null}
      renderItem={({ item }) => (
        <Pressable onPress={() => open(item)} style={[s.card, !isRead(item) && s.unread]}>
          <Text style={s.title}>{item.title}</Text>
          {!!(item.body ?? item.message) && <Text style={s.body}>{item.body ?? item.message}</Text>}
        </Pressable>
      )}
    />
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { textAlign: "center", marginTop: 40, color: colors.inkMuted, fontSize: 13 },
  error: { padding: 10, borderRadius: 8, backgroundColor: colors.dangerSoft, color: colors.danger, fontSize: 13, marginBottom: 10 },
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.line },
  unread: { borderColor: colors.navy, backgroundColor: colors.navy50 },
  title: { fontSize: 14, fontWeight: "600", color: colors.ink },
  body: { fontSize: 13, color: colors.inkMuted, marginTop: 3 },
});
