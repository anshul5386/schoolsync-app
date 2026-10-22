import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { getAllSchools } from "../api/superAdmin";
import { getRequests } from "../api/registrations";
import { useAuth } from "../auth/AuthContext";
import { useLoad, unwrap } from "../lib/useLoad";
import { Button, Card, Chip, Empty, Loading, Message, Row, Screen, Title } from "../ui";
import { colors } from "../theme";

/**
 * Super admins get their own landing page: a platform operator wants cross-school totals,
 * not one school's attendance.
 */
export default function SuperAdminHome() {
  const { user } = useAuth();
  const router = useRouter();
  const { data, loading, error, reload } = useLoad(async () => {
    const [s, p] = await Promise.all([getAllSchools(), getRequests("PENDING")]);
    return { schools: unwrap<any[]>(s) || [], pending: unwrap<any[]>(p) || [] };
  }, []);

  const schools: any[] = data?.schools ?? [];
  const pending: any[] = data?.pending ?? [];
  const totalUsers = schools.reduce((sum, s) => sum + (s.userCount || 0), 0);
  const totalTeachers = schools.reduce((sum, s) => sum + (s.teacherCount || 0), 0);
  const activeSchools = schools.filter((s) => s.active).length;

  const stats = [
    { label: "Schools", value: schools.length, sub: `${activeSchools} active`, highlight: false },
    { label: "Users", value: totalUsers, sub: "across all schools", highlight: false },
    { label: "Teachers", value: totalTeachers, sub: "across all schools", highlight: false },
    { label: "Pending requests", value: pending.length, sub: "awaiting review", highlight: pending.length > 0 },
  ];

  return (
    <Screen onRefresh={reload}>
      <Title sub={`Signed in as ${user?.name ?? ""} — you can see every school.`}>Platform overview</Title>
      {!!error && <Message m={{ type: "error", text: error }} />}
      {loading && !data ? <Loading /> : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {stats.map((s) => (
              <View key={s.label} style={{ width: "48%", flexGrow: 1, backgroundColor: colors.white, borderRadius: 12, padding: 14,
                borderWidth: 1, borderColor: s.highlight ? "#E5B84B" : colors.line }}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: colors.inkSubtle, textTransform: "uppercase" }}>{s.label}</Text>
                <Text style={{ fontSize: 28, fontWeight: "800", color: colors.ink, marginTop: 2 }}>{s.value}</Text>
                <Text style={{ fontSize: 11, color: colors.inkSubtle }}>{s.sub}</Text>
              </View>
            ))}
          </View>

          <Row style={{ justifyContent: "space-between", marginTop: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.ink }}>Requests awaiting review</Text>
            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.navy }} onPress={() => router.push("/approvals")}>View all</Text>
          </Row>

          {pending.length === 0 ? (
            <Card><Empty>Nothing waiting. All caught up.</Empty></Card>
          ) : (
            pending.slice(0, 8).map((r: any) => (
              <Card key={r.id}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink }}>{r.name}</Text>
                <Text style={{ fontSize: 12, color: colors.inkMuted }}>{r.schoolName || "—"}</Text>
                <Row>
                  <Chip tone="grey">{r.requestedRole}</Chip>
                  <Text style={{ fontSize: 12, color: colors.inkMuted }}>{r.phone}</Text>
                </Row>
              </Card>
            ))
          )}

          <View style={{ gap: 8, marginTop: 8 }}>
            <Button onPress={() => router.push("/approvals")}>Review requests</Button>
            <Button variant="secondary" onPress={() => router.push("/super-admin/users/new")}>Create a user</Button>
            <Button variant="secondary" onPress={() => router.push("/super-admin/schools")}>Browse schools</Button>
          </View>
        </>
      )}
    </Screen>
  );
}
