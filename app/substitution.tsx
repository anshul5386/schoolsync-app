import { useState } from "react";
import { Text, View } from "react-native";
import { Stack } from "expo-router";
import { useAuth } from "../src/auth/AuthContext";
import { getSubstitutionsNeeded, assignSubstitution, removeSubstitution } from "../src/api/substitution";
import { errorMessage } from "../src/api/client";
import { useLoad, unwrap } from "../src/lib/useLoad";
import { Screen, Title, Card, Chip, Button, Select, Message, Loading, Empty, Row, confirm } from "../src/ui";
import { colors } from "../src/theme";

type Msg = { type: "success" | "error"; text: string } | null;

function SubRow({ cls, absentTeacherId, available, onDone, setMsg }: {
  cls: any; absentTeacherId: string; available: any[]; onDone: () => void; setMsg: (m: Msg) => void;
}) {
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);

  const assign = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await assignSubstitution({ absentTeacherId, substituteTeacherId: selected, classSectionId: cls.classSectionId });
      setMsg({ type: "success", text: "Substitute assigned" });
      setSelected("");
      onDone();
    } catch (e) {
      setMsg({ type: "error", text: errorMessage(e, "Failed to assign") });
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!(await confirm("Remove substitute", `Remove ${cls.substituteTeacherName} from Class ${cls.grade}-${cls.section}?`, "Remove", true))) return;
    setBusy(true);
    try {
      await removeSubstitution(cls.substitutionId);
      setMsg({ type: "success", text: "Substitution removed" });
      onDone();
    } catch {
      setMsg({ type: "error", text: "Failed to remove" });
    } finally { setBusy(false); }
  };

  return (
    <View style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line, gap: 8 }}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink }}>Class {cls.grade}-{cls.section}</Text>
      {cls.substituteTeacherName ? (
        <Row style={{ justifyContent: "space-between" }}>
          <Chip tone="green">{cls.substituteTeacherName}</Chip>
          <Button small variant="danger" busy={busy} onPress={remove}>Remove</Button>
        </Row>
      ) : (
        <View style={{ gap: 8 }}>
          <Select label="Substitute" value={selected} onChange={setSelected} placeholder="Assign substitute..."
            options={available.map((t: any) => ({ value: t.teacherId, label: `${t.name} (${t.subject})` }))} />
          <Button small busy={busy} disabled={!selected} onPress={assign}>Assign</Button>
        </View>
      )}
    </View>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, alignItems: "center" }}>
      <Text style={{ fontSize: 18, fontWeight: "700", color }}>{value}</Text>
      <Text style={{ fontSize: 10, color: colors.inkSubtle, textAlign: "center" }}>{label}</Text>
    </View>
  );
}

export default function SubstitutionScreen() {
  const { user } = useAuth();
  const [msg, setMsg] = useState<Msg>(null);
  const { data, loading, error, reload } = useLoad<any[]>(
    () => getSubstitutionsNeeded().then((r) => unwrap<any[]>(r) ?? []), []);

  const allowed = user?.role === "PRINCIPAL" || user?.role === "COORDINATOR";
  const header = <Stack.Screen options={{ title: "Substitution" }} />;

  if (!allowed) return <Screen>{header}<Empty>Not available for your role.</Empty></Screen>;
  if (loading && !data) return <>{header}<Loading /></>;

  const rows = data ?? [];
  const totalAffected = rows.reduce((sum, d) => sum + (d.affectedClasses?.length ?? 0), 0);
  const totalAssigned = rows.reduce((sum, d) => sum + (d.affectedClasses ?? []).filter((c: any) => c.substituteTeacherName).length, 0);

  return (
    <Screen onRefresh={reload}>
      {header}
      <Title sub="Assign replacement teachers for absent staff">Substitution</Title>
      <Message m={msg} />
      {!!error && <Message m={{ type: "error", text: error }} />}

      {rows.length > 0 && (
        <Row style={{ alignItems: "stretch" }}>
          <Stat value={rows.length} label="Absent teachers" color={colors.danger} />
          <Stat value={totalAffected} label="Affected classes" color="#B7791F" />
          <Stat value={totalAssigned} label="Substitutes assigned" color="#1E8E5A" />
        </Row>
      )}

      {rows.length === 0 && !error ? (
        <Card>
          <Text style={{ textAlign: "center", fontSize: 14, fontWeight: "600", color: "#1E8E5A" }}>All teachers present today</Text>
          <Text style={{ textAlign: "center", fontSize: 12, color: colors.inkSubtle }}>No substitutions needed</Text>
        </Card>
      ) : (
        rows.map((item) => {
          const n = item.affectedClasses?.length ?? 0;
          return (
            <Card key={item.absentTeacherId}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }}>{item.absentTeacherName}</Text>
              <Text style={{ fontSize: 12, color: colors.danger }}>{item.subject} · Absent today</Text>
              <Chip tone="danger">{n} class{n > 1 ? "es" : ""} affected</Chip>
              {(item.affectedClasses ?? []).map((cls: any) => (
                <SubRow key={cls.classSectionId} cls={cls} absentTeacherId={item.absentTeacherId}
                  available={item.availableTeachers ?? []} onDone={reload} setMsg={setMsg} />
              ))}
            </Card>
          );
        })
      )}
    </Screen>
  );
}
