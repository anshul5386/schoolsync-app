import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Stack } from "expo-router";
import { getTimetable } from "../../src/api/timetable";
import { getMyClasses } from "../../src/api/classes";
import { errorMessage } from "../../src/api/client";
import { useLoad, unwrap } from "../../src/lib/useLoad";
import { Card, Chip, Empty, Loading, Message, Row, Screen, Select, Tabs2, Title } from "../../src/ui";
import { colors } from "../../src/theme";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const DAY_SHORT: Record<string, string> = { MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed", THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat" };

export default function TimetableScreen() {
  const classesLoad = useLoad(() => getMyClasses().then((r) => (unwrap<any[]>(r) || [])), []);
  const classes: any[] = classesLoad.data ?? [];
  const [grade, setGrade] = useState("");
  const [section, setSection] = useState("");
  const [day, setDay] = useState(() => {
    const d = new Date().getDay();
    return d >= 1 && d <= 6 ? DAYS[d - 1] : "MONDAY";
  });
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const loadTimetable = async (id: string, d: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await getTimetable(id, d);
      setSlots(unwrap<any[]>(res) || []);
    } catch (err) {
      setError(errorMessage(err, "Could not load the timetable."));
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!classId) { setSlots([]); return; }
    loadTimetable(classId, day);
  }, [classId, day]);

  const refresh = async () => {
    await classesLoad.reload();
    if (classId) await loadTimetable(classId, day);
  };

  return (
    <Screen onRefresh={refresh}>
      <Stack.Screen options={{ title: "Timetable" }} />
      <Title sub="Today's schedule with live absent-teacher flags">Timetable</Title>
      {!!classesLoad.error && <Message m={{ type: "error", text: classesLoad.error }} />}
      {!!error && <Message m={{ type: "error", text: error }} />}

      <Select label="Class" value={grade} onChange={setGrade} placeholder="Class..."
        options={grades.map((g) => ({ value: g, label: `Class ${g}` }))} />
      <Select label="Section" value={section} onChange={setSection} placeholder="Section..."
        options={sections.map((s) => ({ value: s, label: `Section ${s}` }))} />
      <Tabs2 tabs={DAYS.map((d) => ({ value: d, label: DAY_SHORT[d] }))} value={day} onChange={setDay} />

      {classesLoad.loading ? <Loading /> : !classId ? (
        <Empty>Select class and section to view timetable</Empty>
      ) : loading ? <Loading /> : slots.length === 0 ? (
        !error ? <Empty>No timetable configured for Class {grade}-{section} on {DAY_SHORT[day]}</Empty> : null
      ) : (
        <Card title={`Class ${grade}-${section} — ${DAY_SHORT[day]} · ${slots.length} periods`}>
          {slots.map((slot) => (
            <Row key={slot.periodNumber} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line, gap: 10,
              backgroundColor: slot.teacherAbsent ? "#FDF1EF" : undefined }}>
              <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#EEF0F4", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontWeight: "700", color: colors.inkMuted }}>{slot.periodNumber}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink }}>{slot.subject}</Text>
                <Text style={{ fontSize: 11, color: colors.inkSubtle }}>
                  {slot.startTime && slot.endTime ? `${String(slot.startTime).slice(0, 5)} - ${String(slot.endTime).slice(0, 5)}` : `Period ${slot.periodNumber}`}
                  {slot.teacherName ? ` · ${slot.teacherName}` : ""}
                </Text>
                {slot.teacherAbsent && !slot.substituteTeacherName && <Chip tone="danger">Absent</Chip>}
                {!!slot.substituteTeacherName && <Chip tone="navy">Sub: {slot.substituteTeacherName}</Chip>}
              </View>
            </Row>
          ))}
        </Card>
      )}
    </Screen>
  );
}
