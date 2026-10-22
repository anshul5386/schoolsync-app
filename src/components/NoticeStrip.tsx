import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { getNotices, Notice } from "../api/notices";
import { Card } from "../ui";
import { colors } from "../theme";

/** At most three one-line notices, pinned first then newest; a failed board never breaks the dashboard. */
const MAX_VISIBLE = 3;

export const CATEGORY_COLOR: Record<string, string> = {
  URGENT: colors.danger, ACADEMIC: colors.navy, EVENT: "#1E8E5A", HOLIDAY: "#B7791F", GENERAL: colors.inkSubtle,
};

export function relativeDate(iso?: string | null): string {
  if (!iso) return "";
  const then = new Date(iso);
  const days = Math.floor((Date.now() - then.getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function audienceLabel(n: Notice): string {
  if (n.audience === "CLASS") return n.targetClassLabel || "One class";
  if (n.audience === "ROLE") {
    if (!n.targetRole) return "A role";
    const p = n.targetRole.charAt(0) + n.targetRole.slice(1).toLowerCase().replace(/_/g, " ");
    return `All ${p.toLowerCase()}s`;
  }
  return "Whole school";
}

export default function NoticeStrip({ refreshKey = 0 }: { refreshKey?: number }) {
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    getNotices()
      .then((res) => { if (live) setNotices(res.data?.data || []); })
      .catch(() => { if (live) setNotices([]); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [refreshKey]);

  const open = () => router.push("/notices" as any);

  if (loading) {
    return (
      <Card>
        <View style={{ height: 12, width: 110, borderRadius: 4, backgroundColor: colors.line }} />
        <View style={{ height: 12, width: "66%", borderRadius: 4, backgroundColor: colors.line, marginTop: 8 }} />
      </Card>
    );
  }

  if (notices.length === 0) {
    return (
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 13, color: colors.inkSubtle }}>No notices on the board right now.</Text>
          <Pressable onPress={open}><Text style={{ fontSize: 12.5, fontWeight: "600", color: colors.navy }}>Notice board</Text></Pressable>
        </View>
      </Card>
    );
  }

  const visible = notices.slice(0, MAX_VISIBLE);
  const hidden = notices.length - visible.length;

  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink }}>Notice board</Text>
        <Pressable onPress={open}>
          <Text style={{ fontSize: 12.5, fontWeight: "600", color: colors.navy }}>
            {hidden > 0 ? `View all (${notices.length})` : "View all"}
          </Text>
        </Pressable>
      </View>
      {visible.map((n) => (
        <Pressable key={n.id} onPress={open}
          style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: CATEGORY_COLOR[n.category] || CATEGORY_COLOR.GENERAL }} />
          {!!n.pinned && <Text style={{ fontSize: 10, fontWeight: "700", color: "#B7791F" }}>PINNED</Text>}
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 13.5, fontWeight: "500", color: colors.ink }}>{n.title}</Text>
          <Text style={{ fontSize: 11.5, color: colors.inkSubtle }}>{relativeDate(n.publishedAt)}</Text>
        </Pressable>
      ))}
    </Card>
  );
}

export { audienceLabel };
