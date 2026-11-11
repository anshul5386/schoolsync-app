import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Stack } from "expo-router";
import { getMyClasses } from "../src/api/classes";
import { getSubjects } from "../src/api/subjects";
import { getLessonPlans, createLessonPlan, updateLessonPlan, deleteLessonPlan } from "../src/api/lessonPlans";
import { errorMessage } from "../src/api/client";
import { useAuth } from "../src/auth/AuthContext";
import { useLoad, unwrap } from "../src/lib/useLoad";
import { Button, Card, DateField, Empty, Field, Loading, Message, Row, Screen, Select, Title, confirm } from "../src/ui";
import { colors } from "../src/theme";

const EMPTY = { title: "", subject: "", planDate: "", content: "" };
const ALLOWED = ["PRINCIPAL", "COORDINATOR", "TEACHER", "DIRECTOR", "CHAIRMAN"];

export default function LessonPlansScreen() {
  const { user } = useAuth();
  const [classId, setClassId] = useState("");
  const [grade, setGrade] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const setup = useLoad(async () => {
    const [c, s] = await Promise.all([getMyClasses(), getSubjects()]);
    return { classes: unwrap<any[]>(c) || [], subjects: (unwrap<any[]>(s) || []).map((x: any) => String(x.name)) };
  }, []);

  const classes = setup.data?.classes ?? [];
  const subjects = setup.data?.subjects ?? [];
  const grades = useMemo(() => [...new Set(classes.map((c) => c.grade))].sort(), [classes]);
  const sections = useMemo(() => classes.filter((c) => c.grade === grade), [classes, grade]);

  useEffect(() => {
    if (grade && sections.length === 1 && !classId) setClassId(sections[0].id);
  }, [grade, sections, classId]);

  const plansQ = useLoad(
    () => (classId ? getLessonPlans(classId).then((r) => unwrap<any[]>(r) || []) : Promise.resolve([])),
    [classId]
  );

  if (user && !ALLOWED.includes(user.role)) {
    return <Screen><Stack.Screen options={{ title: "Lesson plans" }} /><Empty>Not available for your role.</Empty></Screen>;
  }

  const resetForm = () => { setForm(EMPTY); setEditingId(null); };

  const onSubmit = async () => {
    if (!classId) return;
    setBusy(true);
    setMessage(null);
    try {
      const payload = { ...form, classSectionId: classId };
      if (editingId) {
        await updateLessonPlan(editingId, payload);
        setMessage({ type: "success", text: "Lesson plan updated." });
      } else {
        await createLessonPlan(payload);
        setMessage({ type: "success", text: "Lesson plan created." });
      }
      resetForm();
      await plansQ.reload();
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "Could not save.") });
    } finally { setBusy(false); }
  };

  const onDelete = async (id: string) => {
    if (!(await confirm("Delete", "Delete this lesson plan?", "Delete", true))) return;
    setBusy(true);
    try {
      await deleteLessonPlan(id);
      setMessage({ type: "success", text: "Deleted." });
      if (editingId === id) resetForm();
      await plansQ.reload();
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "Could not delete.") });
    } finally { setBusy(false); }
  };

  return (
    <Screen onRefresh={async () => { await setup.reload(); await plansQ.reload(); }}>
      <Stack.Screen options={{ title: "Lesson plans" }} />
      <Title sub="Plans for your classes">Lesson plans</Title>
      <Message m={message} />

      {setup.loading ? <Loading /> : (
        <>
          <Select label="Grade" value={grade} onChange={(g) => { setGrade(g); setClassId(""); }}
            options={grades.map((g) => ({ value: g, label: `Grade ${g}` }))} placeholder="Choose grade" />
          {grade && sections.length > 1 && (
            <Select label="Section" value={classId} onChange={setClassId}
              options={sections.map((c) => ({ value: c.id, label: `Section ${c.section}` }))} />
          )}

          {classId && (
            <Card title={editingId ? "Edit plan" : "New plan"}>
              <Field label="Title" value={form.title} onChangeText={(t) => setForm((f) => ({ ...f, title: t }))} />
              <Select label="Subject" value={form.subject} onChange={(v) => setForm((f) => ({ ...f, subject: v }))}
                options={subjects.map((s) => ({ value: s, label: s }))} placeholder="Subject" />
              <DateField label="Date" value={form.planDate} onChange={(v) => setForm((f) => ({ ...f, planDate: v }))} />
              <Field label="Content" value={form.content} onChangeText={(t) => setForm((f) => ({ ...f, content: t }))} multiline />
              <Row>
                <View style={{ flex: 1 }}><Button busy={busy} onPress={onSubmit}>{editingId ? "Update" : "Create"}</Button></View>
                {editingId && <View style={{ flex: 1 }}><Button variant="secondary" onPress={resetForm}>Cancel</Button></View>}
              </Row>
            </Card>
          )}

          {!classId ? <Empty>Choose a class to view plans.</Empty>
            : plansQ.loading ? <Loading />
            : (plansQ.data ?? []).length === 0 ? <Empty>No lesson plans yet.</Empty>
            : (plansQ.data ?? []).map((p) => (
              <Card key={p.id}>
                <Text style={{ fontWeight: "700", color: colors.ink }}>{p.title}</Text>
                <Text style={{ fontSize: 12, color: colors.inkMuted }}>{p.subject} · {p.planDate}</Text>
                {!!p.content && <Text style={{ fontSize: 13, color: colors.ink, marginTop: 6 }} numberOfLines={4}>{p.content}</Text>}
                <Row style={{ marginTop: 8 }}>
                  <Button small variant="secondary" onPress={() => {
                    setEditingId(p.id);
                    setForm({ title: p.title, subject: p.subject, planDate: p.planDate, content: p.content || "" });
                  }}>Edit</Button>
                  <Button small variant="danger" onPress={() => onDelete(p.id)}>Delete</Button>
                </Row>
              </Card>
            ))}
        </>
      )}
    </Screen>
  );
}
