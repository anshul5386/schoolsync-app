import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Stack } from "expo-router";
import { getTeacherOptions, getTeacherDay, getTeacherMonth, getTeacherGrid } from "../src/api/teacherCalendar";
import { errorMessage } from "../src/api/client";
import { useAuth } from "../src/auth/AuthContext";
import { useLoad, unwrap } from "../src/lib/useLoad";
import { Card, Chip, DateField, Empty, Field, Loading, Message, Row, Screen, Select, Tabs2, Title, prettyDate, toISODate } from "../src/ui";
import { colors } from "../src/theme";

const todayIso = () => toISODate(new Date());
const titleCase = (v?: string) => (v ? v.slice(0, 1) + v.slice(1).toLowerCase() : "");
const MONTH_OK = /^\d{4}-(0[1-9]|1[0-2])$/;

export default function TeacherCalendarScreen() {
  const { user } = useAuth();
  const teachersLoad = useLoad(() => getTeacherOptions().then((r) => (unwrap<any[]>(r) || [])), []);
  const teachers: any[] = teachersLoad.data ?? [];
  const [teacherQuery, setTeacherQuery] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [tab, setTab] = useState("teacher");
  const [mode, setMode] = useState("day");
  const [date, setDate] = useState(todayIso());
  const [month, setMonth] = useState(todayIso().slice(0, 7));
  const [dayData, setDayData] = useState<any>(null);
  const [monthData, setMonthData] = useState<any>(null);
  const [gridRows, setGridRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!selectedTeacherId && teachers.length > 0) setSelectedTeacherId(teachers[0].id);
  }, [teachers, selectedTeacherId]);

  const filteredTeachers = useMemo(() => {
    const q = teacherQuery.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) =>
      t.name?.toLowerCase().includes(q) || t.phone?.includes(q) || (t.subjects || []).join(" ").toLowerCase().includes(q));
  }, [teachers, teacherQuery]);

  useEffect(() => {
    if (tab !== "teacher" || !selectedTeacherId) return;
    if (mode === "month" && !MONTH_OK.test(month)) return;
    let live = true;
    setLoading(true);
    setError("");
    const request = mode === "day" ? getTeacherDay(selectedTeacherId, date) : getTeacherMonth(selectedTeacherId, month);
    request
      .then((res) => { if (!live) return; if (mode === "day") setDayData(unwrap(res)); else setMonthData(unwrap(res)); })
      .catch((err) => { if (live) setError(errorMessage(err, "Could not load teacher calendar.")); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [tab, mode, selectedTeacherId, date, month, tick]);

  useEffect(() => {
    if (tab !== "grid") return;
    let live = true;
    setLoading(true);
    setError("");
    getTeacherGrid(date)
      .then((res) => { if (live) setGridRows(unwrap<any[]>(res) || []); })
      .catch((err) => { if (live) setError(errorMessage(err, "Could not load school grid.")); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [tab, date, tick]);

  if (user && !["PRINCIPAL", "COORDINATOR"].includes(user.role)) {
    return <Screen><Stack.Screen options={{ title: "Teacher calendar" }} /><Empty>Not available for your role.</Empty></Screen>;
  }

  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);
  const refresh = async () => { await teachersLoad.reload(); setTick((n) => n + 1); };

  return (
    <Screen onRefresh={refresh}>
      <Stack.Screen options={{ title: "Teacher calendar" }} />
      <Title sub="View teacher schedules by day, month, or across the school.">Teacher calendar</Title>
      {!!teachersLoad.error && <Message m={{ type: "error", text: teachersLoad.error }} />}
      {!!error && <Message m={{ type: "error", text: error }} />}

      <Tabs2 tabs={[{ value: "teacher", label: "Teacher view" }, { value: "grid", label: "School grid" }]} value={tab} onChange={setTab} />

      {tab === "teacher" ? (
        <>
          <Card>
            <View style={{ gap: 10 }}>
              <Field label="Teacher" value={teacherQuery} onChangeText={setTeacherQuery} placeholder="Search name, phone, subject" />
              <Select label="Select teacher" value={selectedTeacherId} onChange={setSelectedTeacherId}
                options={filteredTeachers.map((t) => ({
                  value: String(t.id),
                  label: `${t.name}${t.subjects?.length ? ` — ${t.subjects.join(", ")}` : ""}`,
                }))} />
              <Tabs2 tabs={[{ value: "day", label: "Day" }, { value: "month", label: "Month" }]} value={mode} onChange={setMode} />
              {mode === "day" ? (
                <DateField label="Date" value={date} onChange={(v) => setDate(v || todayIso())} />
              ) : (
                <Field label="Month (YYYY-MM)" value={month} onChangeText={setMonth} placeholder="2026-10" maxLength={7}
                  keyboardType="numbers-and-punctuation"
                  hint={MONTH_OK.test(month) ? undefined : "Enter a month like 2026-10"} />
              )}
              {!!selectedTeacher && (
                <Text style={{ fontSize: 11, color: colors.inkSubtle }}>
                  Selected: <Text style={{ fontWeight: "700", color: colors.ink }}>{selectedTeacher.name}</Text>
                </Text>
              )}
            </View>
          </Card>
          {teachersLoad.loading || loading ? <Loading /> : mode === "day" ? <DaySchedule data={dayData} /> : <MonthCalendar data={monthData} />}
        </>
      ) : (
        <>
          <DateField label="Date" value={date} onChange={(v) => setDate(v || todayIso())} hint="All teachers for the selected day" />
          {loading ? <Loading /> : <SchoolGrid rows={gridRows} />}
        </>
      )}
    </Screen>
  );
}

function DaySchedule({ data }: { data: any }) {
  if (!data) return <Empty>Choose a teacher to view their schedule.</Empty>;
  const slots: any[] = data.slots || [];
  return (
    <Card title={`${data.teacherName} — ${prettyDate(data.date)}`}>
      {!!data.absent && <Chip tone="danger">Absent</Chip>}
      {slots.length === 0 ? <Empty>No periods for this teacher on this day.</Empty> : slots.map((slot) => (
        <Row key={`${slot.classSectionId}-${slot.periodNumber}`}
          style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line, gap: 10,
            backgroundColor: slot.teacherAbsent ? "#FDF1EF" : undefined }}>
          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#EEF0F4", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontWeight: "700", color: colors.inkMuted }}>{slot.periodNumber}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink }}>{slot.subject}</Text>
            <Text style={{ fontSize: 11, color: colors.inkSubtle }}>
              {slot.startTime && slot.endTime ? `${String(slot.startTime).slice(0, 5)} - ${String(slot.endTime).slice(0, 5)}` : `Period ${slot.periodNumber}`}
              {slot.classLabel ? ` · ${slot.classLabel}` : ""}
            </Text>
            {!!slot.substituteTeacherName && <Chip tone="navy">Sub: {slot.substituteTeacherName}</Chip>}
          </View>
        </Row>
      ))}
    </Card>
  );
}

function MonthCalendar({ data }: { data: any }) {
  if (!data) return <Empty>Choose a teacher to view their month.</Empty>;
  const days: any[] = data.days || [];
  if (days.length === 0) return <Empty>No days to show for this month.</Empty>;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {days.map((d) => (
        <View key={d.date} style={{ width: "48%", backgroundColor: d.absent ? "#FDF1EF" : colors.white, borderWidth: 1,
          borderColor: d.absent ? "#F2C4BE" : colors.line, borderRadius: 10, padding: 10, gap: 3, minHeight: 90 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink }}>{parseInt(String(d.date).slice(8, 10), 10)}</Text>
          <Text style={{ fontSize: 10, color: colors.inkSubtle }}>{titleCase(d.dayOfWeek)}</Text>
          <Text style={{ fontSize: 11, color: colors.inkMuted }}>{d.periodCount} periods</Text>
          {!!d.absent && <Chip tone="danger">Absent</Chip>}
          {d.substitutionCount > 0 && <Chip tone="navy">{d.substitutionCount} subs</Chip>}
        </View>
      ))}
    </View>
  );
}

function SchoolGrid({ rows }: { rows: any[] }) {
  if (!rows.length) return <Empty>No teacher schedules found for this date.</Empty>;
  return (
    <>
      {rows.map((row) => (
        <Card key={row.teacherId} title={row.teacherName} style={row.absent ? { backgroundColor: "#FDF1EF" } : undefined}>
          <Row>
            {!!row.absent && <Chip tone="danger">Absent</Chip>}
            <Text style={{ fontSize: 12, color: colors.inkMuted }}>{row.slots?.length || 0} periods</Text>
          </Row>
          {(row.slots || []).map((slot: any) => (
            <Text key={`${row.teacherId}-${slot.classSectionId}-${slot.periodNumber}`} style={{ fontSize: 12, color: colors.inkMuted }}>
              P{slot.periodNumber}: {slot.subject} · {slot.classLabel}
              {slot.substituteTeacherName ? ` · Sub ${slot.substituteTeacherName}` : ""}
            </Text>
          ))}
        </Card>
      ))}
    </>
  );
}
