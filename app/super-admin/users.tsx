import { useEffect, useState } from "react";
import { Text } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { activateUser, deactivateUser, getAllSchools, getAllUsers } from "../../src/api/superAdmin";
import { errorMessage } from "../../src/api/client";
import { useAuth } from "../../src/auth/AuthContext";
import { useLoad, unwrap } from "../../src/lib/useLoad";
import { Button, Card, Chip, Empty, Loading, Message, Row, Screen, Select, Title } from "../../src/ui";
import { colors } from "../../src/theme";

const ROLES = ["PRINCIPAL", "SCHOOL_ADMIN", "COORDINATOR", "SUB_COORDINATOR", "TEACHER", "STUDENT"];

export default function UsersScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ schoolId?: string; role?: string }>();
  const [schoolId, setSchoolId] = useState(params.schoolId ? String(params.schoolId) : "");
  const [role, setRole] = useState(params.role ? String(params.role) : "");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  // Follow route params if they change (e.g. arriving from a school's "users" link).
  useEffect(() => {
    setSchoolId(params.schoolId ? String(params.schoolId) : "");
    setRole(params.role ? String(params.role) : "");
  }, [params.schoolId, params.role]);

  const schoolsQ = useLoad(() => getAllSchools().then((r) => unwrap<any[]>(r) || []).catch(() => [] as any[]), []);
  const { data, loading, error, reload } = useLoad(
    () => getAllUsers(schoolId || undefined, role || undefined).then((r) => unwrap<any[]>(r) || []),
    [schoolId, role]
  );

  const rows: any[] = data ?? [];
  const schools: any[] = schoolsQ.data ?? [];

  const toggleActive = async (row: any) => {
    setBusyId(row.id); setActionError("");
    try {
      if (row.active) await deactivateUser(row.id);
      else await activateUser(row.id);
      await reload();
    } catch (err) {
      setActionError(errorMessage(err, "Could not update the user."));
    } finally { setBusyId(null); }
  };

  if (user?.role !== "SUPER_ADMIN") return <Screen><Empty>Not available for your role.</Empty></Screen>;

  return (
    <Screen onRefresh={async () => { await Promise.all([reload(), schoolsQ.reload()]); }}>
      <Stack.Screen options={{ title: "All users" }} />
      <Title sub={`${rows.length} ${schoolId || role ? "matching" : "across every school"}`}>All users</Title>
      <Button onPress={() => router.push("/super-admin/users/new")}>Create user</Button>

      <Select label="School" value={schoolId} onChange={setSchoolId} placeholder="All schools"
        options={[{ value: "", label: "All schools" }, ...schools.map((s) => ({ value: String(s.id), label: s.name }))]} />
      <Select label="Role" value={role} onChange={setRole} placeholder="All roles"
        options={[{ value: "", label: "All roles" }, ...ROLES.map((r) => ({ value: r, label: r }))]} />
      {(!!schoolId || !!role) && (
        <Button small variant="secondary" onPress={() => { setSchoolId(""); setRole(""); }}>Clear filters</Button>
      )}

      {!!error && <Message m={{ type: "error", text: error }} />}
      {!!actionError && <Message m={{ type: "error", text: actionError }} />}

      {loading && !data ? <Loading /> : rows.length === 0 ? (
        !error ? <Empty>No users match those filters.</Empty> : null
      ) : rows.map((u) => (
        <Card key={u.id}>
          <Row style={{ justifyContent: "space-between" }}>
            <Text style={{ flex: 1, fontSize: 15, fontWeight: "700", color: colors.ink }}>{u.name}</Text>
            <Chip tone={u.active ? "green" : "grey"}>{u.active ? "Active" : "Disabled"}</Chip>
          </Row>
          {!!u.email && <Text style={{ fontSize: 11, color: colors.inkSubtle }}>{u.email}</Text>}
          <Text style={{ fontSize: 12, color: colors.inkMuted }}>{u.phone} · {u.schoolName || "—"}</Text>
          <Chip tone="grey">{u.role}</Chip>
          <Button small variant="secondary" busy={busyId === u.id} onPress={() => toggleActive(u)}>
            {u.active ? "Disable" : "Enable"}
          </Button>
        </Card>
      ))}
    </Screen>
  );
}
