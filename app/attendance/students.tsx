import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Stack } from "expo-router";
import { getClassRoster, bulkMarkAttendance, getStudentSummary, AttendanceStatus } from "../../src/api/attendance";
import { getMyClasses } from "../../src/api/classes";
import { getDashboardStats } from "../../src/api/dashboard";
import { errorMessage } from "../../src/api/client";
import { useAuth } from "../../src/auth/AuthContext";
import { useLoad, unwrap } from "../../src/lib/useLoad";
import { Button, Card, Chip, Empty, Loading, Message, Row, Screen, Select, Title, prettyDate, toISODate } from "../../src/ui";
import { colors } from "../../src/theme";

type Msg = { type: "success" | "error" | "info"; text: string } | null;

const TONES = {
  green: { bg: "#E6F4EC", fg: "#1E8E5A" },
  red: { bg: colors.dangerSoft, fg: colors.danger },
  amber: { bg: "#FDF3E1", fg: "#B7791F" },
} as const;

export default function StudentAttendanceScreen() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "STUDENT") return <StudentSelfView />;
  return <MarkAttendanceView />;
}

function MiniStat({ value, label, color = colors.ink }: { value: string | number; label: string; color?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, alignItems: "center" }}>
      <Text style={{ fontSize: 18, fontWeight: "700", color }}>{value}</Text>
      <Text style={{ fontSize: 10, color: colors.inkSubtle, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

function MarkBtn({ l, active, tone, onPress }: { l: string; active: boolean; tone: keyof typeof TONES; onPress: () => void }) {
  const t = TONES[tone];
  return (
    <Pressable onPress={onPress}
      style={{ width: 38, height: 38, borderRadius: 8, borderWidth: 1.5, alignItems: "center", justifyContent: "center",
        borderColor: active ? t.fg : colors.line, backgroundColor: active ? t.bg : colors.white }}>
      <Text style={{ fontWeight: "700", fontSize: 13, color: active ? t.fg : colors.inkSubtle }}>{l}</Text>
    </Pressable>
  );
}

function StudentSelfView() {
  const { data, loading, error, reload } = useLoad(async () => {
    const today = toISODate(new Date());
    const stats: any = unwrap(await getDashboardStats());
    const studentId = stats?.studentId;
    if (!studentId) throw { response: { data: { message: "Your student profile could not be found." } } };
    const [yearRes, todayRes] = await Promise.all([getStudentSummary(studentId), getStudentSummary(studentId, today, today)]);
    const summary: any = unwrap(yearRes);
    const t: any = unwrap(todayRes);
    let todayStatus: string | null = null;
    if (t && t.totalDays > 0) {
      if (t.present > 0) todayStatus = "PRESENT";
      else if (t.absent > 0) todayStatus = "ABSENT";
      else if (t.leave > 0) todayStatus = "LEAVE";
    }
    return { summary, todayStatus };
  }, []);

  const summary: any = data?.summary;
  const pct = summary?.percentage ?? 0;
  const statusTone = data?.todayStatus === "PRESENT" ? "green" : data?.todayStatus === "ABSENT" ? "danger" : "amber";

  return (
    <Screen onRefresh={reload}>
      <Stack.Screen options={{ title: "Student attendance" }} />
      <Title sub="Your attendance record">Student attendance</Title>
      {!!error && <Message m={{ type: "error", text: error }} />}
      {loading ? <Loading /> : summary ? (
        <>
          <Row>
            <MiniStat value={summary.percentage ? `${summary.percentage}%` : "—"} label="This year" color={pct >= 75 ? "#1E8E5A" : colors.danger} />
            <MiniStat value={summary.present} label="Present" color="#1E8E5A" />
            <MiniStat value={summary.absent} label="Absent" color={colors.danger} />
            <MiniStat value={summary.leave} label="Leave" color="#B7791F" />
          </Row>
          <Card title={summary.name}>
            {!!summary.rollNumber && <Text style={{ fontSize: 12, color: colors.inkSubtle }}>Roll #{summary.rollNumber}</Text>}
            <Row style={{ justifyContent: "space-between", paddingVertical: 8 }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink }}>Today</Text>
                <Text style={{ fontSize: 11, color: colors.inkSubtle }}>{prettyDate(toISODate(new Date()))}</Text>
              </View>
              {data?.todayStatus ? <Chip tone={statusTone as any}>{data.todayStatus}</Chip>
                : <Text style={{ fontSize: 11, color: colors.inkSubtle }}>Not marked yet</Text>}
            </Row>
            {!!summary.from && !!summary.to && (
              <Text style={{ fontSize: 11, color: colors.inkSubtle }}>
                Academic year stats from {prettyDate(summary.from)} to {prettyDate(summary.to)} ({summary.totalDays} marked days)
              </Text>
            )}
          </Card>
        </>
      ) : !error ? <Empty>No attendance found.</Empty> : null}
    </Screen>
  );
}

function MarkAttendanceView() {
  const classesLoad = useLoad(() => getMyClasses().then((r) => (unwrap<any[]>(r) || [])), []);
  const classes: any[] = classesLoad.data ?? [];
  const [grade, setGrade] = useState("");
  const [section, setSection] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<Msg>(null);

  const grades = useMemo(() => [...new Set(classes.map((c) => String(c.grade)))].sort(), [classes]);
  const sections = useMemo(
    () => (grade ? [...new Set(classes.filter((c) => String(c.grade) === grade).map((c) => String(c.section)))].sort() : []),
    [grade, classes]);

  useEffect(() => { if (grades.length === 1) setGrade(grades[0]); }, [grades]);
  useEffect(() => {
    if (!grade) { setSection(""); return; }
    setSection(sections.length === 1 ? sections[0] : "");
  }, [grade, sections]);

  const cls = classes.find((c) => String(c.grade) === grade && String(c.section) === section);
  const classId: string = cls?.id ?? "";

  const loadRoster = async (id: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await getClassRoster(id);
      const data: any[] = unwrap<any[]>(res) || [];
      setStudents(data);
      const existing: Record<string, AttendanceStatus> = {};
      data.forEach((s) => { if (s.status) existing[s.studentId] = s.status; });
      setMarks(existing);
      if (data.length === 0) setMessage({ type: "info", text: "No students in this class" });
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "Failed to load roster") });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!classId) { setStudents([]); setMarks({}); return; }
    loadRoster(classId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const setMark = (studentId: string, status: AttendanceStatus) => setMarks((p) => ({ ...p, [studentId]: status }));
  const markAll = (status: AttendanceStatus) => {
    const n: Record<string, AttendanceStatus> = {};
    students.forEach((s) => { n[s.studentId] = status; });
    setMarks(n);
  };

  const submit = async () => {
    const unmarked = students.filter((s) => !marks[s.studentId]);
    if (unmarked.length > 0) { setMessage({ type: "error", text: `${unmarked.length} student(s) not marked` }); return; }
    setSubmitting(true);
    setMessage(null);
    try {
      const payload = students.map((s) => ({ studentId: s.studentId as string, status: marks[s.studentId] }));
      await bulkMarkAttendance(classId, payload);
      setMessage({ type: "success", text: `Attendance submitted for ${students.length} students` });
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "Submit failed") });
    } finally { setSubmitting(false); }
  };

  const vals = Object.values(marks);
  const presentCount = vals.filter((v) => v === "PRESENT").length;
  const absentCount = vals.filter((v) => v === "ABSENT").length;
  const leaveCount = vals.filter((v) => v === "LEAVE").length;

  const refresh = async () => {
    await classesLoad.reload();
    if (classId) await loadRoster(classId);
  };

  return (
    <Screen onRefresh={refresh}>
      <Stack.Screen options={{ title: "Student attendance" }} />
      <Title sub="Mark P/A/L — parents get instant WhatsApp alert">Student attendance</Title>
      {!!classesLoad.error && <Message m={{ type: "error", text: classesLoad.error }} />}
      {message && (message.type === "info"
        ? <Text style={{ padding: 10, borderRadius: 8, fontSize: 13, backgroundColor: colors.navy50, color: colors.navy }}>{message.text}</Text>
        : <Message m={message} />)}

      <Select label="Class" value={grade} onChange={setGrade} placeholder="Class..."
        options={grades.map((g) => ({ value: g, label: `Class ${g}` }))} />
      <Select label="Section" value={section} onChange={setSection} placeholder="Section..."
        options={sections.map((s) => ({ value: s, label: `Section ${s}` }))} />
      <Text style={{ fontSize: 13, color: colors.inkSubtle }}>{prettyDate(toISODate(new Date()))}</Text>

      {classesLoad.loading ? <Loading /> : loading ? <Loading /> : students.length === 0 ? (
        <Empty>{grade && section ? "No students found" : "Select class and section to begin"}</Empty>
      ) : (
        <>
          <Row>
            <View style={{ flex: 1 }}><Button small variant="secondary" onPress={() => markAll("PRESENT")}>All present</Button></View>
            <View style={{ flex: 1 }}><Button small variant="danger" onPress={() => markAll("ABSENT")}>All absent</Button></View>
          </Row>
          <Row>
            <MiniStat value={students.length} label="Total" />
            <MiniStat value={presentCount} label="Present" color="#1E8E5A" />
            <MiniStat value={absentCount} label="Absent" color={colors.danger} />
            <MiniStat value={leaveCount} label="Leave" color="#B7791F" />
          </Row>
          <Card title={`Class ${grade}-${section} · ${students.length} students`}>
            {students.map((st) => (
              <Row key={st.studentId} style={{ justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line,
                backgroundColor: marks[st.studentId] ? undefined : "#FDF8EC" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink }}>{st.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.inkSubtle }}>Roll #{st.rollNumber}</Text>
                </View>
                <Row style={{ gap: 6 }}>
                  <MarkBtn l="P" tone="green" active={marks[st.studentId] === "PRESENT"} onPress={() => setMark(st.studentId, "PRESENT")} />
                  <MarkBtn l="A" tone="red" active={marks[st.studentId] === "ABSENT"} onPress={() => setMark(st.studentId, "ABSENT")} />
                  <MarkBtn l="L" tone="amber" active={marks[st.studentId] === "LEAVE"} onPress={() => setMark(st.studentId, "LEAVE")} />
                </Row>
              </Row>
            ))}
          </Card>
          <Text style={{ fontSize: 12, color: colors.inkSubtle }}>{Object.keys(marks).length}/{students.length} marked</Text>
          <Button onPress={submit} busy={submitting}>Submit attendance</Button>
        </>
      )}
    </Screen>
  );
}
