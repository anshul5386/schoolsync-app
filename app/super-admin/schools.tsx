import { useEffect, useMemo, useState } from "react";
import { Text } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { getAllSchools } from "../../src/api/superAdmin";
import { useAuth } from "../../src/auth/AuthContext";
import { useLoad, unwrap } from "../../src/lib/useLoad";
import { Button, Card, Chip, Empty, Field, Loading, Message, Row, Screen, Title } from "../../src/ui";
import { colors } from "../../src/theme";

export default function SchoolsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ flash?: string }>();
  const [search, setSearch] = useState("");
  const [flash, setFlash] = useState("");
  const { data, loading, error, reload } = useLoad(() => getAllSchools().then((r) => unwrap<any[]>(r) || []), []);

  // Set by the school detail screen after a deletion: shown once, then cleared from the route.
  useEffect(() => {
    if (params.flash) {
      setFlash(String(params.flash));
      router.setParams({ flash: undefined });
    }
  }, [params.flash, router]);

  const schools: any[] = data ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter((s) => s.name?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q));
  }, [schools, search]);

  if (user?.role !== "SUPER_ADMIN") return <Screen><Empty>Not available for your role.</Empty></Screen>;

  return (
    <Screen onRefresh={reload}>
      <Stack.Screen options={{ title: "All schools" }} />
      <Title sub={`${schools.length} on the platform`}>All schools</Title>
      <Field label="Search" value={search} onChangeText={setSearch} placeholder="Search name or city" autoCapitalize="none" />
      {!!flash && <Message m={{ type: "success", text: flash }} />}
      {!!error && <Message m={{ type: "error", text: error }} />}
      {loading && !data ? <Loading /> : filtered.length === 0 ? (
        !error ? <Empty>No schools match that search.</Empty> : null
      ) : filtered.map((s) => (
        <Card key={s.id}>
          <Row style={{ justifyContent: "space-between" }}>
            <Text style={{ flex: 1, fontSize: 15, fontWeight: "700", color: colors.ink }}>{s.name}</Text>
            <Chip tone={s.active ? "green" : "grey"}>{s.active ? "Active" : "Inactive"}</Chip>
          </Row>
          <Text style={{ fontSize: 11, color: colors.inkSubtle }}>
            {s.subdomain}{s.city ? ` · ${s.city}` : ""}{s.state ? `, ${s.state}` : ""}
          </Text>
          <Text style={{ fontSize: 12, color: colors.inkMuted }}>
            Board: {s.boardType || "—"} · Year: {s.academicYear || "—"}
          </Text>
          <Row>
            <Text style={{ fontSize: 12, color: colors.navy, fontWeight: "600" }}
              onPress={() => router.push(`/super-admin/users?schoolId=${s.id}`)}>{s.userCount} users</Text>
            <Text style={{ fontSize: 12, color: colors.inkMuted }}>· {s.teacherCount} teachers</Text>
            {s.pendingRequestCount > 0 ? <Chip tone="amber">{`${s.pendingRequestCount} pending`}</Chip>
              : <Text style={{ fontSize: 12, color: colors.inkSubtle }}>· 0 pending</Text>}
          </Row>
          <Button small variant="secondary" onPress={() => router.push(`/super-admin/schools/${s.id}`)}>Open</Button>
        </Card>
      ))}
    </Screen>
  );
}
