import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Stack } from "expo-router";
import { getClassRoster, getAttendanceByDate, bulkMarkAttendance, getStudentSummary, AttendanceStatus } from "../../src/api/attendance";
import { getMyClasses } from "../../src/api/classes";
import { getDashboardStats } from "../../src/api/dashboard";
import { errorMessage } from "../../src/api/client";
import { useAuth } from "../../src/auth/AuthContext";
import { useLoad, unwrap } from "../../src/lib/useLoad";
import { Button, Card, Empty, Loading, Message, Row, Screen, Select, Title, prettyDate } from "../../src/ui";
import { AttendanceDatePicker, MonthCalendar, PastDayBanner, type Marker } from "../../src/components/AttendanceCalendar";
import { longDate, monthEnd, monthStart, relativeDayLabel, todayISO } from "../../src/lib/dates";
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

type DayStatus = "PRESENT" | "ABSENT" | "LEAVE" | "NONE";
const DAY_TONE: Record<Exclude<DayStatus, "NONE">, Marker> = { PRESENT: "success", ABSENT: "danger", LEAVE: "warning" };

function dayStatus(sum: any): DayStatus {
  if (!sum || !sum.totalDays) return "NONE";
  if (sum.present > 0) return "PRESENT";
  if (sum.absent > 0) return "ABSENT";
  if (sum.leave > 0) return "LEAVE";
  return "NONE";
}

function BigStatus({ status }: { status: DayStatus }) {
  const map = {
    PRESENT: { text: "Present", bg: TONES.green.bg, fg: TONES.green.fg },
    ABSENT: { text: "Absent", bg: TONES.red.bg, fg: TONES.red.fg },
    LEAVE: { text: "On leave", bg: TONES.amber.bg, fg: TONES.amber.fg },
    NONE: { text: "Not marked", bg: "#EEF0F4", fg: colors.inkMuted },
  }[status];
  return (
    <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: map.bg,
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: map.fg }} />
      <Text style={{ fontSize: 16, fontWeight: "700", color: map.fg }}>{map.text}</Text>
    </View>
  );
}

function StudentSelfView() {
  const today = todayISO();
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(monthStart(today));
  const [day, setDay] = useState<DayStatus | "ERROR" | null>(null);
  const [monthSum, setMonthSum] = useState<any>(null);

  const { data, loading, error, reload } = useLoad(async () => {
    const stats: any = unwrap(await getDashboardStats());
    const studentId = stats?.studentId;
    if (!studentId) throw { response: { data: { message: "Your student profile could not be found." } } };
    const summary: any = unwrap(await getStudentSummary(studentId));
    return { studentId: studentId as string, summary };
  }, []);
  const studentId = data?.studentId;
  const summary: any = data?.summary;

  useEffect(() => {
    if (!studentId) return;
    let live = true;
    setDay(null);
    getStudentSummary(studentId, date, date)
      .then((r) => { if (live) setDay(dayStatus(unwrap(r))); })
      .catch(() => { if (live) setDay("ERROR"); });
    return () => { live = false; };
  }, [studentId, date]);

  useEffect(() => {
    if (!studentId) return;
    let live = true;
    const end = monthEnd(month) > today ? today : monthEnd(month);
    setMonthSum(null);
    getStudentSummary(studentId, month, end)
      .then((r) => { if (live) setMonthSum(unwrap(r)); })
      .catch(() => { if (live) setMonthSum(null); });
    return () => { live = false; };
  }, [studentId, month, today]);

  const pct = summary?.percentage ?? 0;
  const monthName = new Date(month + "T00:00:00").toLocaleDateString("en-IN", { month: "long" });
  const markers = day && day !== "ERROR" && day !== "NONE" ? { [date]: DAY_TONE[day] } : {};
  const share = (n: number) => (monthSum?.totalDays ? `${(n / monthSum.totalDays) * 100}%` as const : "0%");

  return (
    <Screen onRefresh={reload}>
      <Stack.Screen options={{ title: "My attendance" }} />
      <Title sub="Tap any day to see if you were marked present">My attendance</Title>
      {!!error && <Message m={{ type: "error", text: error }} />}
      {loading ? <Loading /> : summary ? (
        <>
          <Row>
            <MiniStat value={summary.percentage ? `${summary.percentage}%` : "—"} label="This year" color={pct >= 75 ? "#1E8E5A" : colors.danger} />
            <MiniStat value={summary.present} label="Present" color="#1E8E5A" />
            <MiniStat value={summary.absent} label="Absent" color={colors.danger} />
            <MiniStat value={summary.leave} label="Leave" color="#B7791F" />
          </Row>

          <Card>
            <MonthCalendar value={date} onChange={setDate} onMonthChange={setMonth} markers={markers} />
          </Card>

          <Card>
            <Text style={{ fontSize: 11, fontWeight: "700", color: colors.inkSubtle, textTransform: "uppercase", letterSpacing: 0.8 }}>
              {relativeDayLabel(date)}
            </Text>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.ink, marginBottom: 6 }}>{longDate(date)}</Text>
            {day === null ? <Text style={{ color: colors.inkSubtle }}>Checking…</Text>
              : day === "ERROR" ? <Text style={{ color: colors.danger }}>Could not load this day.</Text>
              : <BigStatus status={day} />}
          </Card>

          <Card>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }}>{monthName} so far</Text>
              {!!monthSum && <Text style={{ fontSize: 12, color: colors.inkMuted }}>{monthSum.totalDays} marked days</Text>}
            </Row>
            {monthSum ? (
              <>
                <View style={{ height: 10, borderRadius: 5, backgroundColor: colors.line, overflow: "hidden", flexDirection: "row", marginTop: 8 }}>
                  <View style={{ width: share(monthSum.present), backgroundColor: TONES.green.fg }} />
                  <View style={{ width: share(monthSum.leave), backgroundColor: TONES.amber.fg }} />
                  <View style={{ width: share(monthSum.absent), backgroundColor: TONES.red.fg }} />
                </View>
                <Row style={{ justifyContent: "space-around", marginTop: 10 }}>
                  <LegendItem color={TONES.green.fg} label="Present" value={monthSum.present} />
                  <LegendItem color={TONES.amber.fg} label="Leave" value={monthSum.leave} />
                  <LegendItem color={TONES.red.fg} label="Absent" value={monthSum.absent} />
                </Row>
              </>
            ) : <Text style={{ color: colors.inkSubtle, marginTop: 6 }}>Loading…</Text>}
          </Card>

          {!!summary.from && !!summary.to && (
            <Text style={{ fontSize: 11, color: colors.inkSubtle }}>
              Academic year {prettyDate(summary.from)} – {prettyDate(summary.to)} ({summary.totalDays} marked days)
            </Text>
          )}
        </>
      ) : !error ? <Empty>No attendance found.</Empty> : null}
    </Screen>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Text style={{ fontSize: 18, fontWeight: "700", color: colors.ink }}>{value}</Text>
      <Row style={{ gap: 5 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
        <Text style={{ fontSize: 11.5, color: colors.inkMuted }}>{label}</Text>
      </Row>
    </View>
  );
}

function StatusPill({ status }: { status?: AttendanceStatus }) {
  const t = status === "PRESENT" ? TONES.green : status === "ABSENT" ? TONES.red : status === "LEAVE" ? TONES.amber : null;
  const label = status === "PRESENT" ? "Present" : status === "ABSENT" ? "Absent" : status === "LEAVE" ? "Leave" : "Not marked";
  return (
    <Text style={{ overflow: "hidden", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, fontSize: 11.5, fontWeight: "700",
      backgroundColor: t ? t.bg : "#EEF0F4", color: t ? t.fg : colors.inkMuted }}>{label}</Text>
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
  const today = todayISO();
  const [date, setDate] = useState(today);
  const isPast = date !== today;

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

  // Today: the editable roster. Any other day: that day's saved marks, read-only.
  const loadRoster = async (id: string, day: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const res = day === todayISO() ? await getClassRoster(id) : await getAttendanceByDate(id, day);
      const data: any[] = unwrap<any[]>(res) || [];
      setStudents(data);
      const existing: Record<string, AttendanceStatus> = {};
      data.forEach((s) => { if (s.status) existing[s.studentId] = s.status; });
      setMarks(existing);
      if (data.length === 0) setMessage({ type: "info", text: "No students in this class" });
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "Failed to load attendance") });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!classId) { setStudents([]); setMarks({}); return; }
    loadRoster(classId, date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, date]);

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
  const notMarked = students.length - Object.keys(marks).length;

  const refresh = async () => {
    await classesLoad.reload();
    if (classId) await loadRoster(classId, date);
  };

  return (
    <Screen onRefresh={refresh}>
      <Stack.Screen options={{ title: "Student attendance" }} />
      <Title sub={isPast ? "Look back at any day this class was marked" : "Mark P/A/L — parents get instant WhatsApp alert"}>Student attendance</Title>
      {!!classesLoad.error && <Message m={{ type: "error", text: classesLoad.error }} />}
      {message && (
        message.type === "info"
          ? <Text style={{ padding: 10, borderRadius: 8, fontSize: 13, backgroundColor: colors.navy50, color: colors.navy }}>{message.text}</Text>
          : (message.type === "success" || message.type === "error")
            ? <Message m={{ type: message.type, text: message.text }} />
            : null
      )}

      <Select label="Class" value={grade} onChange={setGrade} placeholder="Class..."
        options={grades.map((g) => ({ value: g, label: `Class ${g}` }))} />
      <Select label="Section" value={section} onChange={setSection} placeholder="Section..."
        options={sections.map((s) => ({ value: s, label: `Section ${s}` }))} />
      <AttendanceDatePicker value={date} onChange={setDate} />
      {isPast && <PastDayBanner date={date} onToday={() => setDate(today)} />}

      {classesLoad.loading ? <Loading /> : loading ? <Loading /> : students.length === 0 ? (
        <Empty>{grade && section ? "No students found" : "Select class and section to begin"}</Empty>
      ) : (
        <>
          {!isPast && (
            <Row>
              <View style={{ flex: 1 }}><Button small variant="secondary" onPress={() => markAll("PRESENT")}>All present</Button></View>
              <View style={{ flex: 1 }}><Button small variant="danger" onPress={() => markAll("ABSENT")}>All absent</Button></View>
            </Row>
          )}
          <Row>
            <MiniStat value={students.length} label="Total" />
            <MiniStat value={presentCount} label="Present" color="#1E8E5A" />
            <MiniStat value={absentCount} label="Absent" color={colors.danger} />
            <MiniStat value={leaveCount} label="Leave" color="#B7791F" />
          </Row>
          {isPast && notMarked > 0 && (
            <Text style={{ fontSize: 12, color: "#B7791F" }}>{notMarked} student(s) were not marked on this day.</Text>
          )}
          <Card title={`Class ${grade}-${section} · ${relativeDayLabel(date)}`}>
            {students.map((st) => (
              <Row key={st.studentId} style={{ justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line,
                backgroundColor: isPast || marks[st.studentId] ? undefined : "#FDF8EC" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink }}>{st.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.inkSubtle }}>Roll #{st.rollNumber}</Text>
                </View>
                {isPast ? <StatusPill status={marks[st.studentId]} /> : (
                  <Row style={{ gap: 6 }}>
                    <MarkBtn l="P" tone="green" active={marks[st.studentId] === "PRESENT"} onPress={() => setMark(st.studentId, "PRESENT")} />
                    <MarkBtn l="A" tone="red" active={marks[st.studentId] === "ABSENT"} onPress={() => setMark(st.studentId, "ABSENT")} />
                    <MarkBtn l="L" tone="amber" active={marks[st.studentId] === "LEAVE"} onPress={() => setMark(st.studentId, "LEAVE")} />
                  </Row>
                )}
              </Row>
            ))}
          </Card>
          {!isPast && (
            <>
              <Text style={{ fontSize: 12, color: colors.inkSubtle }}>{Object.keys(marks).length}/{students.length} marked</Text>
              <Button onPress={submit} busy={submitting}>Submit attendance</Button>
            </>
          )}
        </>
      )}
    </Screen>
  );
}
