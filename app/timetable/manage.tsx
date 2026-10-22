import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Stack } from "expo-router";
import { getMyClasses } from "../../src/api/classes";
import { getTeacherOptions } from "../../src/api/teacherCalendar";
import { getSubjects } from "../../src/api/subjects";
import { getTimetable, saveTimetableSlot, deleteTimetableSlot } from "../../src/api/timetable";
import { errorMessage } from "../../src/api/client";
import { useAuth } from "../../src/auth/AuthContext";
import { useLoad, unwrap } from "../../src/lib/useLoad";
import { Button, Card, Empty, Field, Loading, Message, Row, Screen, Select, Tabs2, Title, confirm } from "../../src/ui";
import { colors } from "../../src/theme";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const DAY_LABEL: Record<string, string> = { MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday", THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday" };

type PeriodRow = { id: string | null; periodNumber: number; subject: string; teacherId: string; startTime: string; endTime: string };
type Msg = { type: "success" | "error"; text: string } | null;

/** Accepts "HH:MM" while typing; the server gets the same "HH:MM" string the web <input type=time> sent. */
const TIME_OK = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function TimetableManageScreen() {
  const { user } = useAuth();
  const setup = useLoad(async () => {
    const [c, t, s] = await Promise.all([getMyClasses(), getTeacherOptions(), getSubjects()]);
    return {
      classes: unwrap<any[]>(c) || [],
      teachers: unwrap<any[]>(t) || [],
      subjects: (unwrap<any[]>(s) || []).map((x: any) => String(x.name)),
    };
  }, []);
  const classes: any[] = setup.data?.classes ?? [];
  const teachers: any[] = setup.data?.teachers ?? [];
  const subjects: string[] = setup.data?.subjects ?? [];

  const [classId, setClassId] = useState("");
  const [day, setDay] = useState("MONDAY");
  const [rows, setRows] = useState<PeriodRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<Msg>(null);

  useEffect(() => {
    if (!classId && classes.length > 0) setClassId(classes[0].id);
  }, [classes, classId]);

  const load = async () => {
    if (!classId) return;
    setLoading(true);
    try {
      const res = await getTimetable(classId, day);
      const slots: PeriodRow[] = (unwrap<any[]>(res) || [])
        .slice()
        .sort((a: any, b: any) => a.periodNumber - b.periodNumber)
        .map((s: any) => ({
          id: s.id,
          periodNumber: s.periodNumber,
          subject: s.subject,
          teacherId: s.teacherId || "",
          startTime: (s.startTime || "").slice(0, 5),
          endTime: (s.endTime || "").slice(0, 5),
        }));
      setRows(slots);
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "Could not load the timetable.") });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [classId, day]);

  const nextPeriodNumber = useMemo(
    () => (rows.length === 0 ? 1 : Math.max(...rows.map((r) => r.periodNumber)) + 1), [rows]);

  if (user && !["PRINCIPAL", "COORDINATOR"].includes(user.role)) {
    return <Screen><Stack.Screen options={{ title: "Build timetable" }} /><Empty>Not available for your role.</Empty></Screen>;
  }

  const addRow = () => setRows((prev) => [...prev, { id: null, periodNumber: nextPeriodNumber, subject: "", teacherId: "", startTime: "", endTime: "" }]);
  const updateRow = (index: number, patch: Partial<PeriodRow>) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const saveRow = async (index: number) => {
    const row = rows[index];
    if (!row.subject.trim()) {
      setMessage({ type: "error", text: "Choose a subject before saving this period." });
      return;
    }
    if ((row.startTime && !TIME_OK.test(row.startTime)) || (row.endTime && !TIME_OK.test(row.endTime))) {
      setMessage({ type: "error", text: "Enter times as HH:MM, for example 09:30." });
      return;
    }
    setBusyIndex(index);
    setMessage(null);
    try {
      const res = await saveTimetableSlot({
        classSectionId: classId,
        dayOfWeek: day,
        periodNumber: row.periodNumber,
        subject: row.subject,
        teacherId: row.teacherId || null,
        startTime: row.startTime || null,
        endTime: row.endTime || null,
      });
      const saved: any = unwrap(res);
      updateRow(index, { id: saved?.id ?? row.id });
      setMessage({ type: "success", text: `Period ${row.periodNumber} saved.` });
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "Could not save that period.") });
    } finally { setBusyIndex(null); }
  };

  const removeRow = async (index: number) => {
    const row = rows[index];
    if (!row.id) {
      setRows((prev) => prev.filter((_, i) => i !== index));
      return;
    }
    if (!(await confirm("Remove period", `Remove period ${row.periodNumber}?`, "Remove", true))) return;
    setBusyIndex(index);
    try {
      await deleteTimetableSlot(row.id);
      setRows((prev) => prev.filter((_, i) => i !== index));
      setMessage({ type: "success", text: "Period removed." });
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "Could not remove that period.") });
    } finally { setBusyIndex(null); }
  };

  const cls = classes.find((c) => c.id === classId);
  const refresh = async () => { await setup.reload(); await load(); };

  return (
    <Screen onRefresh={refresh}>
      <Stack.Screen options={{ title: "Build timetable" }} />
      <Title sub="Set the periods for one class on one day. Students, teachers and the substitution screen all read from what is saved here.">
        Build the timetable
      </Title>
      {!!setup.error && <Message m={{ type: "error", text: setup.error }} />}
      <Message m={message} />

      {setup.loading ? <Loading /> : (
        <>
          <Select label="Class" value={classId} onChange={setClassId}
            options={classes.map((c) => ({ value: c.id, label: `Class ${c.grade}-${c.section}` }))} />
          <Tabs2 tabs={DAYS.map((d) => ({ value: d, label: DAY_LABEL[d].slice(0, 3) }))} value={day} onChange={setDay} />
          <Row style={{ justifyContent: "space-between" }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink, flex: 1 }}>
              {cls ? `Class ${cls.grade}-${cls.section}` : "—"} — {DAY_LABEL[day]}
            </Text>
            <Button small onPress={addRow}>+ Add period</Button>
          </Row>

          {loading ? <Loading /> : rows.length === 0 ? (
            <Empty>No periods yet for {DAY_LABEL[day].toLowerCase()}. Tap "Add period" to start.</Empty>
          ) : rows.map((row, index) => (
            <Card key={row.id || `new-${index}`} title={`P${row.periodNumber}`}>
              <View style={{ gap: 10 }}>
                <Select label="Subject" value={row.subject} onChange={(v) => updateRow(index, { subject: v })}
                  placeholder="Subject…" options={subjects.map((s) => ({ value: s, label: s }))} />
                <Select label="Teacher" value={row.teacherId} onChange={(v) => updateRow(index, { teacherId: v })}
                  placeholder="No teacher yet"
                  options={[{ value: "", label: "No teacher yet" }, ...teachers.map((t) => ({ value: String(t.id), label: String(t.name) }))]} />
                <Row>
                  <View style={{ flex: 1 }}>
                    <Field label="Start (HH:MM)" value={row.startTime} placeholder="09:00" maxLength={5}
                      keyboardType="numbers-and-punctuation" onChangeText={(v) => updateRow(index, { startTime: v })} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="End (HH:MM)" value={row.endTime} placeholder="09:45" maxLength={5}
                      keyboardType="numbers-and-punctuation" onChangeText={(v) => updateRow(index, { endTime: v })} />
                  </View>
                </Row>
                <Row>
                  <View style={{ flex: 1 }}><Button small onPress={() => saveRow(index)} busy={busyIndex === index}>Save</Button></View>
                  <View style={{ flex: 1 }}><Button small variant="danger" onPress={() => removeRow(index)} disabled={busyIndex === index}>Remove</Button></View>
                </Row>
              </View>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
