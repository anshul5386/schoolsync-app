import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Stack } from "expo-router";
import { getTeacherAttendance, bulkMarkTeacherAttendance } from "../../src/api/teacherAttendance";
import { errorMessage } from "../../src/api/client";
import { useAuth } from "../../src/auth/AuthContext";
import { useLoad, unwrap } from "../../src/lib/useLoad";
import { Button, Card, Empty, Loading, Message, Row, Screen, Title } from "../../src/ui";
import { colors } from "../../src/theme";

type Status = "PRESENT" | "ABSENT";

function MiniStat({ value, label, color = colors.ink }: { value: string | number; label: string; color?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, alignItems: "center" }}>
      <Text style={{ fontSize: 18, fontWeight: "700", color }}>{value}</Text>
      <Text style={{ fontSize: 10, color: colors.inkSubtle, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

function MarkBtn({ l, active, ok, onPress }: { l: string; active: boolean; ok: boolean; onPress: () => void }) {
  const fg = ok ? "#1E8E5A" : colors.danger;
  const bg = ok ? "#E6F4EC" : colors.dangerSoft;
  return (
    <Pressable onPress={onPress}
      style={{ width: 38, height: 38, borderRadius: 8, borderWidth: 1.5, alignItems: "center", justifyContent: "center",
        borderColor: active ? fg : colors.line, backgroundColor: active ? bg : colors.white }}>
      <Text style={{ fontWeight: "700", fontSize: 13, color: active ? fg : colors.inkSubtle }}>{l}</Text>
    </Pressable>
  );
}

export default function TeacherAttendanceScreen() {
  const { user } = useAuth();
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data, loading, error, reload } = useLoad(async () => {
    const res = await getTeacherAttendance();
    const rows: any[] = unwrap<any[]>(res) || [];
    const existing: Record<string, Status> = {};
    rows.forEach((t) => { if (t.status) existing[t.teacherId] = t.status; });
    setMarks(existing);
    return rows;
  }, []);
  const teachers: any[] = data ?? [];

  if (user && !["PRINCIPAL", "COORDINATOR"].includes(user.role)) {
    return <Screen><Stack.Screen options={{ title: "Staff attendance" }} /><Empty>Not available for your role.</Empty></Screen>;
  }

  const setMark = (id: string, s: Status) => setMarks((p) => ({ ...p, [id]: s }));
  const markAllPresent = () => {
    const n: Record<string, Status> = {};
    teachers.forEach((t) => { n[t.teacherId] = "PRESENT"; });
    setMarks(n);
  };

  const submit = async () => {
    const unmarked = teachers.filter((t) => !marks[t.teacherId]);
    if (unmarked.length > 0) { setMessage({ type: "error", text: `${unmarked.length} teacher(s) not marked` }); return; }
    setSubmitting(true);
    setMessage(null);
    try {
      const payload = teachers.map((t) => ({ teacherId: t.teacherId as string, status: marks[t.teacherId] }));
      await bulkMarkTeacherAttendance(payload);
      setMessage({ type: "success", text: `Attendance submitted for ${teachers.length} teachers` });
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "Submit failed") });
    } finally { setSubmitting(false); }
  };

  const vals = Object.values(marks);
  const presentCount = vals.filter((v) => v === "PRESENT").length;
  const absentCount = vals.filter((v) => v === "ABSENT").length;

  return (
    <Screen onRefresh={reload}>
      <Stack.Screen options={{ title: "Staff attendance" }} />
      <Title sub="Mark teacher attendance daily at 7:45 AM — triggers substitution for absent staff">Staff attendance</Title>
      {!!error && <Message m={{ type: "error", text: "Failed to load teachers" }} />}
      <Message m={message} />
      <Text style={{ fontSize: 13, color: colors.inkMuted }}>
        {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
      </Text>
      {loading ? <Loading /> : teachers.length === 0 ? (
        !error ? <Empty>No teachers found</Empty> : null
      ) : (
        <>
          <Button small variant="secondary" onPress={markAllPresent}>All present</Button>
          <Row>
            <MiniStat value={teachers.length} label="Total staff" />
            <MiniStat value={presentCount} label="Present" color="#1E8E5A" />
            <MiniStat value={absentCount} label="Absent" color={colors.danger} />
          </Row>
          <Text style={{ fontSize: 11, color: colors.inkSubtle }}>
            Biometric (eSSL/BioMax) syncs end-of-day for HR. Mark here each morning for real-time substitution.
          </Text>
          <Card>
            {teachers.map((t) => (
              <Row key={t.teacherId} style={{ justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line,
                backgroundColor: marks[t.teacherId] === "ABSENT" ? "#FDF1EF" : undefined }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink }}>{t.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.inkSubtle }}>{t.subject} · {t.classCount} classes</Text>
                </View>
                <Row style={{ gap: 6 }}>
                  <MarkBtn l="P" ok active={marks[t.teacherId] === "PRESENT"} onPress={() => setMark(t.teacherId, "PRESENT")} />
                  <MarkBtn l="A" ok={false} active={marks[t.teacherId] === "ABSENT"} onPress={() => setMark(t.teacherId, "ABSENT")} />
                </Row>
              </Row>
            ))}
          </Card>
          <Text style={{ fontSize: 12, color: colors.inkSubtle }}>{Object.keys(marks).length}/{teachers.length} marked</Text>
          <Button onPress={submit} busy={submitting}>Submit staff attendance</Button>
        </>
      )}
    </Screen>
  );
}
