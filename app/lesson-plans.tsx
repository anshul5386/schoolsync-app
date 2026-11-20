import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Stack } from "expo-router";
import { getAllClasses, getMyClasses } from "../src/api/classes";
import { getSchoolTeacher, getSchoolTeachers } from "../src/api/schoolTeachers";
import { getLessonPlans, createLessonPlan, updateLessonPlan, deleteLessonPlan } from "../src/api/lessonPlans";
import { errorMessage } from "../src/api/client";
import { useAuth } from "../src/auth/AuthContext";
import { useLoad, unwrap } from "../src/lib/useLoad";
import { Button, Card, DateField, Empty, Field, Loading, Message, Row, Screen, Select, Title, confirm } from "../src/ui";
import { colors } from "../src/theme";

const EMPTY = { title: "", subject: "", planDate: "", endDate: "", content: "", teacherId: "" };
const TEACHER_ROLES = ["TEACHER"];
const COORDINATOR_ROLES = ["PRINCIPAL", "COORDINATOR", "SCHOOL_ADMIN", "SUB_COORDINATOR"];
const ALLOWED = [...COORDINATOR_ROLES, "TEACHER", "DIRECTOR", "CHAIRMAN"];

export default function LessonPlansScreen() {
  const { user } = useAuth();
  const role = user?.role ?? "";
  const isCoordinator = COORDINATOR_ROLES.includes(role);
  const isTeacher = TEACHER_ROLES.includes(role);
  const canCreate = isTeacher || isCoordinator;
  const [classId, setClassId] = useState("");
  const [grade, setGrade] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const setup = useLoad(async () => {
    const classesPromise = isTeacher ? getMyClasses() : getAllClasses();
    const teachersPromise = isCoordinator ? getSchoolTeachers() : Promise.resolve(null);
    const [classesRes, teachersRes] = await Promise.all([classesPromise, teachersPromise]);
    return {
      allClasses: unwrap<any[]>(classesRes) || [],
      myClasses: isTeacher ? unwrap<any[]>(classesRes) || [] : [],
      teachers: teachersRes ? unwrap<any[]>(teachersRes) || [] : [],
    };
  }, [isTeacher, isCoordinator]);

  const allClasses = setup.data?.allClasses ?? [];
  const myClasses = setup.data?.myClasses ?? [];
  const teachers = setup.data?.teachers ?? [];
  const browseClasses = isTeacher ? myClasses : allClasses;
  const grades = useMemo(() => [...new Set(browseClasses.map((c) => c.grade))].sort(), [browseClasses]);
  const sections = useMemo(() => browseClasses.filter((c) => c.grade === grade), [browseClasses, grade]);

  const formClasses = useMemo(() => {
    if (isCoordinator && form.teacherId) return teacherClasses;
    return [];
  }, [isCoordinator, form.teacherId, teacherClasses]);

  const availableSubjects = useMemo(() => {
    if (isTeacher) {
      const cls = myClasses.find((c) => c.id === classId);
      if (cls?.subjects) return String(cls.subjects).split(",").map((s) => s.trim()).filter(Boolean);
      return [];
    }
    if (isCoordinator && form.teacherId && classId) {
      const assignment = teacherClasses.find((tc) => tc.classSectionId === classId);
      if (assignment?.subjects) return String(assignment.subjects).split(",").map((s) => s.trim()).filter(Boolean);
      return [];
    }
    return [];
  }, [isTeacher, isCoordinator, classId, myClasses, form.teacherId, teacherClasses]);

  useEffect(() => {
    if (!isCoordinator || !form.teacherId) {
      setTeacherClasses([]);
      return;
    }
    let cancelled = false;
    getSchoolTeacher(form.teacherId)
      .then((res) => {
        if (cancelled) return;
        const profile = unwrap<any>(res);
        const grouped: Record<string, { classSectionId: string; classLabel?: string; subjects: string[] }> = {};
        for (const a of profile?.classAssignments || []) {
          if (!grouped[a.classSectionId]) {
            grouped[a.classSectionId] = { classSectionId: a.classSectionId, classLabel: a.classLabel, subjects: [] };
          }
          grouped[a.classSectionId].subjects.push(a.subject);
        }
        setTeacherClasses(Object.values(grouped).map((g) => ({ ...g, subjects: g.subjects.join(", ") })));
      })
      .catch(() => setTeacherClasses([]));
    return () => { cancelled = true; };
  }, [isCoordinator, form.teacherId]);

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
      <Title sub="Plan what you will teach, class by class.">Lesson plans</Title>
      <Message m={message} />

      {setup.loading ? <Loading /> : (
        <>
          <Select label="Grade" value={grade} onChange={(g) => { setGrade(g); setClassId(""); }}
            options={grades.map((g) => ({ value: g, label: `Grade ${g}` }))} placeholder="Choose grade" />
          {grade && sections.length > 1 && (
            <Select label="Section" value={classId} onChange={setClassId}
              options={sections.map((c) => ({ value: c.id, label: `Section ${c.section}` }))} />
          )}

          {canCreate && (
            <Card title={editingId ? "Edit plan" : "New plan"}>
              {isCoordinator && (
                <>
                  <Select label="Teacher" value={form.teacherId}
                    onChange={(v) => setForm((f) => ({ ...f, teacherId: v, subject: "" }))}
                    options={teachers.map((t) => ({ value: String(t.userId), label: t.name }))}
                    placeholder="Select teacher..." />
                  {!!form.teacherId && (
                    <Select label="Class" value={classId}
                      onChange={(v) => { setClassId(v); setForm((f) => ({ ...f, subject: "" })); }}
                      options={formClasses.map((c) => ({ value: c.classSectionId, label: c.classLabel || c.classSectionId }))}
                      placeholder="Class (from teacher's assignments)..." />
                  )}
                </>
              )}
              <Field label="Title" value={form.title} onChangeText={(t) => setForm((f) => ({ ...f, title: t }))} />
              <Select label="Subject" value={form.subject} onChange={(v) => setForm((f) => ({ ...f, subject: v }))}
                options={availableSubjects.map((s) => ({ value: s, label: s }))}
                placeholder={availableSubjects.length === 0
                  ? isCoordinator ? "Select teacher + class first..." : "Select a class first..."
                  : "Subject"} />
              <DateField label="Start date" value={form.planDate} onChange={(v) => setForm((f) => ({ ...f, planDate: v }))} />
              <DateField label="End date (optional - for multi-day topics)" value={form.endDate}
                onChange={(v) => setForm((f) => ({ ...f, endDate: v }))} />
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
                <Text style={{ fontSize: 12, color: colors.inkMuted }}>
                  {p.subject} · {p.planDate}{p.endDate ? ` to ${p.endDate}` : ""}
                </Text>
                {!!p.content && <Text style={{ fontSize: 13, color: colors.ink, marginTop: 6 }} numberOfLines={4}>{p.content}</Text>}
                <Row style={{ marginTop: 8 }}>
                  <Button small variant="secondary" onPress={() => {
                    setEditingId(p.id);
                    setForm({
                      title: p.title,
                      subject: p.subject,
                      planDate: p.planDate,
                      endDate: p.endDate || "",
                      content: p.content || "",
                      teacherId: p.teacherId || "",
                    });
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
