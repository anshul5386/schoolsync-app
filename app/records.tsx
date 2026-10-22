import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../src/auth/AuthContext";
import { errorMessage } from "../src/api/client";
import { getMyClasses } from "../src/api/classes";
import type { ClassSection } from "../src/api/classes";
import { getTeacherOptions } from "../src/api/teacherCalendar";
import { getClassRoster } from "../src/api/attendance";
import { getSubjects } from "../src/api/subjects";
import {
  getAssignments, createAssignment, updateAssignment, deleteAssignment,
  getExams, createExam, getResults, saveResults,
} from "../src/api/records";
import { uploadAttachment, StagedFile } from "../src/api/attachments";
import AttachmentBar from "../src/components/AttachmentBar";
import StagedFileField from "../src/components/StagedFileField";
import AssignmentDetailModal from "../src/components/AssignmentDetailModal";
import { useLoad, unwrap } from "../src/lib/useLoad";
import {
  Button, Card, DateField, Empty, Field, Loading, Message, Row, Screen, Select, Tabs2, Title,
  confirm, pretty, prettyDate,
} from "../src/ui";
import type { Option } from "../src/ui";
import { colors } from "../src/theme";

const ASSIGNMENT_TYPES = ["HOMEWORK", "LAB", "ESSAY", "PROJECT", "WORKSHEET"];
const EXAM_TYPES = ["UNIT_TEST", "HALF_YEARLY", "PRE_BOARD", "ANNUAL"];
const typeOptions = (types: string[]): Option[] => types.map((t) => ({ value: t, label: pretty(t) }));

// Only these roles may create, edit, delete or attach - matches the server's write rules.
// DIRECTOR and CHAIRMAN can open this screen to read records only.
const CAN_ATTACH_ROLES = ["PRINCIPAL", "COORDINATOR", "TEACHER"];
const ALLOWED_ROLES = ["PRINCIPAL", "COORDINATOR", "TEACHER", "DIRECTOR", "CHAIRMAN"];

type Msg = { type: "success" | "error"; text: string } | null;
type AForm = { title: string; description: string; subject: string; teacherId: string; dueDate: string; type: string };
type EForm = { name: string; subject: string; examDate: string; maxMarks: string; type: string };
type Mark = { marks: string; grade: string };

const blankAssignment = (teacherId: string): AForm => ({ title: "", description: "", subject: "", teacherId, dueDate: "", type: "HOMEWORK" });
const blankExam = (): EForm => ({ name: "", subject: "", examDate: "", maxMarks: "100", type: "UNIT_TEST" });

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const classLabelOf = (c: ClassSection) => `Class ${c.grade}-${c.section}`;

export default function RecordsScreen() {
  const { user } = useAuth();
  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return (
      <Screen>
        <Stack.Screen options={{ title: "Records" }} />
        <Empty>Not available for your role.</Empty>
      </Screen>
    );
  }
  return <RecordsInner role={user.role} />;
}

function RecordsInner({ role }: { role: string }) {
  const router = useRouter();
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();
  const isTeacher = role === "TEACHER";
  const canAttach = CAN_ATTACH_ROLES.includes(role);
  const canCreate = canAttach;

  const [tab, setTab] = useState("assignments");
  const [classId, setClassId] = useState("");
  const [teachers, setTeachers] = useState<any[]>([]);
  const [schoolSubjects, setSchoolSubjects] = useState<string[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [roster, setRoster] = useState<any[]>([]);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [message, setMessage] = useState<Msg>(null);
  const [publishing, setPublishing] = useState(false);

  const [assignmentForm, setAssignmentForm] = useState<AForm>(blankAssignment(""));
  const [examForm, setExamForm] = useState<EForm>(blankExam());

  // Staged, not yet uploaded: there is no assignment/exam id to attach to until the form is submitted.
  const [assignmentFile, setAssignmentFile] = useState<StagedFile | null>(null);
  const [assignmentFileError, setAssignmentFileError] = useState<string | null>(null);
  const [examFile, setExamFile] = useState<StagedFile | null>(null);
  const [examFileError, setExamFileError] = useState<string | null>(null);

  // Only one assignment can be mid-edit at a time.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingResults, setSavingResults] = useState(false);

  const [openAssignment, setOpenAssignment] = useState<any | null>(null);

  const classes = useLoad<ClassSection[]>(() => getMyClasses().then((r) => unwrap<ClassSection[]>(r) || []), []);

  // First class becomes the default once classes arrive (same as the web).
  useEffect(() => {
    if (!classId && classes.data && classes.data.length > 0) setClassId(classes.data[0].id);
  }, [classes.data, classId]);

  // The school's curated subject list. Failure is silent, as on the web.
  useEffect(() => {
    getSubjects()
      .then((res: any) => setSchoolSubjects(((unwrap<any[]>(res) || []) as any[]).map((s) => s.name)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isTeacher) return;
    getTeacherOptions()
      .then((res: any) => {
        const rows = unwrap<any[]>(res) || [];
        setTeachers(rows);
        if (rows.length > 0) setAssignmentForm((f) => (f.teacherId ? f : { ...f, teacherId: rows[0].id }));
      })
      .catch(() => {});
  }, [isTeacher]);

  const selectedClass = (classes.data || []).find((c) => c.id === classId);
  const teacherSubjects = useMemo(() => {
    if (!selectedClass?.subjects) return [] as string[];
    return selectedClass.subjects.split(",").map((s) => s.trim()).filter(Boolean);
  }, [selectedClass]);
  // Subjects are chosen, never typed; the server rejects anything outside the school list.
  const subjectOptions: string[] = isTeacher ? teacherSubjects : schoolSubjects;

  const records = useLoad<{ assignments: any[]; exams: any[]; results: any[] } | null>(async () => {
    if (!classId) return null;
    const [a, e, r] = await Promise.all([
      getAssignments(classId),
      getExams(classId),
      getResults({ classSectionId: classId }),
    ]);
    return {
      assignments: unwrap<any[]>(a) || [],
      exams: unwrap<any[]>(e) || [],
      results: unwrap<any[]>(r) || [],
    };
  }, [classId]);

  const assignments: any[] = records.data?.assignments ?? [];
  const exams: any[] = records.data?.exams ?? [];

  useEffect(() => {
    if (!records.data) return;
    setResults(records.data.results);
    setSelectedExamId((cur) => cur || (records.data!.exams.length > 0 ? records.data!.exams[0].id : ""));
  }, [records.data]);

  // Upcoming first (soonest due at the top); previous assignments most-recently-due first.
  const { upcoming, past } = useMemo(() => {
    const today = startOfDay(new Date());
    const up: any[] = [];
    const pa: any[] = [];
    assignments.forEach((a) => (startOfDay(new Date(a.dueDate)) >= today ? up : pa).push(a));
    up.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    pa.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
    return { upcoming: up, past: pa };
  }, [assignments]);

  // Notification deep link: open the assignment it was about, then clear the param.
  useEffect(() => {
    if (!highlight || records.loading || !records.data) return;
    const match = assignments.find((a) => a.id === highlight);
    if (match) setOpenAssignment(match);
    router.setParams({ highlight: undefined });
  }, [highlight, records.loading, records.data, assignments, router]);

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  useEffect(() => {
    if (!selectedExam) return;
    Promise.all([getClassRoster(selectedExam.classSectionId), getResults({ examId: selectedExam.id })])
      .then(([rosterRes, resultsRes]) => {
        const rosterRows = unwrap<any[]>(rosterRes) || [];
        const resultRows = unwrap<any[]>(resultsRes) || [];
        setRoster(rosterRows);
        setResults(resultRows);
        const next: Record<string, Mark> = {};
        resultRows.forEach((r) => {
          next[r.studentId] = { marks: r.marks == null ? "" : String(r.marks), grade: r.grade || "" };
        });
        rosterRows.forEach((s) => {
          if (!next[s.studentId]) next[s.studentId] = { marks: "", grade: "" };
        });
        setMarks(next);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExamId]);

  const refresh = async () => {
    await Promise.all([classes.reload(), records.reload()]);
  };

  const onCreateAssignment = async () => {
    setMessage(null);
    if (assignmentFileError) {
      setMessage({ type: "error", text: assignmentFileError });
      return;
    }
    if (!assignmentForm.title.trim() || !assignmentForm.subject || !assignmentForm.dueDate) {
      setMessage({ type: "error", text: "Please fill in the title, subject and due date." });
      return;
    }
    setPublishing(true);
    try {
      const res = await createAssignment({
        ...assignmentForm,
        classSectionId: classId,
        teacherId: isTeacher ? null : assignmentForm.teacherId,
      });
      const created = unwrap<any>(res);
      const reset = () => setAssignmentForm((f) => ({ ...f, title: "", description: "", subject: "", dueDate: "" }));

      // The assignment exists even if the attachment step fails: publishing is not rolled back.
      if (assignmentFile) {
        try {
          await uploadAttachment("ASSIGNMENT", created.id, assignmentFile);
        } catch (attachErr) {
          setMessage({
            type: "error",
            text: `Assignment created, but the file could not be attached: ${errorMessage(attachErr, "please attach it from the list below.")}`,
          });
          reset();
          setAssignmentFile(null);
          records.reload();
          return;
        }
      }

      reset();
      setAssignmentFile(null);
      setMessage({ type: "success", text: assignmentFile ? "Assignment published with attachment." : "Assignment created." });
      records.reload();
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "Could not create assignment.") });
    } finally {
      setPublishing(false);
    }
  };

  const startEdit = (a: any) => {
    setEditingId(a.id);
    setEditForm({
      title: a.title,
      description: a.description || "",
      subject: a.subject,
      teacherId: a.teacherId || "",
      dueDate: a.dueDate?.slice(0, 10) || "",
      type: a.type,
    });
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEdit = async (id: string) => {
    if (!editForm) return;
    setMessage(null);
    if (!editForm.title.trim() || !editForm.subject || !editForm.dueDate) {
      setMessage({ type: "error", text: "Please fill in the title, subject and due date." });
      return;
    }
    setSavingEdit(true);
    try {
      await updateAssignment(id, { ...editForm, teacherId: isTeacher ? null : editForm.teacherId });
      setEditingId(null);
      setEditForm(null);
      setMessage({ type: "success", text: "Assignment updated. The class has been notified." });
      records.reload();
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "Could not update assignment.") });
    } finally {
      setSavingEdit(false);
    }
  };

  const onDelete = async (a: any) => {
    const ok = await confirm(
      `Delete "${a.title}"?`,
      `Every student in ${a.classLabel} will be notified that it has been removed, and any attached files will be deleted with it. This cannot be undone.`,
      "Delete",
      true
    );
    if (!ok) return;
    setMessage(null);
    try {
      await deleteAssignment(a.id);
      setMessage({ type: "success", text: "Assignment deleted and the class notified." });
      if (editingId === a.id) cancelEdit();
      records.reload();
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "Could not delete assignment.") });
    }
  };

  const onCreateExam = async () => {
    setMessage(null);
    if (examFileError) {
      setMessage({ type: "error", text: examFileError });
      return;
    }
    if (!examForm.name.trim() || !examForm.subject || !examForm.examDate || !examForm.maxMarks.trim()) {
      setMessage({ type: "error", text: "Please fill in the name, subject, exam date and max marks." });
      return;
    }
    setPublishing(true);
    try {
      const res = await createExam({ ...examForm, classSectionId: classId, maxMarks: parseInt(examForm.maxMarks, 10) });
      const created = unwrap<any>(res);
      const reset = () => setExamForm((f) => ({ ...f, name: "", subject: "", examDate: "", maxMarks: "100" }));

      if (examFile) {
        try {
          await uploadAttachment("EXAM", created.id, examFile);
        } catch (attachErr) {
          setMessage({
            type: "error",
            text: `Exam created, but the file could not be attached: ${errorMessage(attachErr, "please attach it from the list below.")}`,
          });
          reset();
          setExamFile(null);
          records.reload();
          return;
        }
      }

      reset();
      setExamFile(null);
      setMessage({ type: "success", text: examFile ? "Exam published with attachment." : "Exam created." });
      records.reload();
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "Could not create exam.") });
    } finally {
      setPublishing(false);
    }
  };

  const onSaveResults = async () => {
    if (!selectedExam) return;
    const payload = roster
      .filter((st) => marks[st.studentId]?.marks !== "" && marks[st.studentId]?.marks != null)
      .map((st) => ({
        studentId: st.studentId as string,
        marks: parseInt(marks[st.studentId].marks, 10),
        grade: marks[st.studentId].grade || null,
      }));
    setSavingResults(true);
    try {
      await saveResults(selectedExam.id, payload);
      setMessage({ type: "success", text: "Results saved." });
      const res = await getResults({ examId: selectedExam.id });
      setResults(unwrap<any[]>(res) || []);
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "Could not save results.") });
    } finally {
      setSavingResults(false);
    }
  };

  const setMark = (studentId: string, patch: Partial<Mark>) =>
    setMarks((m) => ({ ...m, [studentId]: { marks: "", grade: "", ...(m[studentId] || {}), ...patch } }));

  const classOptions: Option[] = (classes.data || []).map((c) => ({ value: c.id, label: classLabelOf(c) }));
  const subjectSelectOptions: Option[] = subjectOptions.map((n) => ({ value: n, label: n }));
  const teacherOptions: Option[] = teachers.map((t) => ({ value: t.id, label: t.name }));
  const subjectHint = subjectOptions.length === 0
    ? (isTeacher
      ? "You are not assigned a subject for this class. Ask your principal to add it under Teacher onboarding."
      : "No subjects in your school list yet. Add them under Subjects.")
    : undefined;

  const renderRow = (a: any, isPast: boolean) => {
    if (editingId === a.id && editForm) {
      return (
        <Card key={a.id} style={{ backgroundColor: colors.canvas }}>
          <Field label="Title" value={editForm.title} onChangeText={(v) => setEditForm({ ...editForm, title: v })} />
          <Select label="Subject" value={editForm.subject} options={subjectSelectOptions} placeholder="Choose subject"
            hint={subjectHint} onChange={(v) => setEditForm({ ...editForm, subject: v })} />
          {!isTeacher && (
            <Select label="Teacher" value={editForm.teacherId} options={teacherOptions}
              onChange={(v) => setEditForm({ ...editForm, teacherId: v })} />
          )}
          <Select label="Type" value={editForm.type} options={typeOptions(ASSIGNMENT_TYPES)}
            onChange={(v) => setEditForm({ ...editForm, type: v })} />
          <DateField label="Due date" value={editForm.dueDate} onChange={(v) => setEditForm({ ...editForm, dueDate: v })} />
          <Field label="Description" multiline value={editForm.description}
            onChangeText={(v) => setEditForm({ ...editForm, description: v })} />
          <Row>
            <Button small busy={savingEdit} onPress={() => saveEdit(a.id)}>Save changes</Button>
            <Button small variant="secondary" disabled={savingEdit} onPress={cancelEdit}>Cancel</Button>
          </Row>
          <Text style={{ fontSize: 11, color: colors.inkSubtle }}>Saving notifies the class that this assignment was updated.</Text>
        </Card>
      );
    }
    return (
      <Card key={a.id} style={{ opacity: isPast ? 0.8 : 1, borderColor: highlight === a.id ? colors.navy : colors.line }}>
        <Text onPress={() => setOpenAssignment(a)}
          style={{ fontSize: 15, fontWeight: "600", textDecorationLine: "underline", color: isPast ? colors.inkMuted : colors.navy }}>
          {a.title}
        </Text>
        <Text style={{ fontSize: 11.5, color: colors.inkSubtle }}>
          {a.classLabel} · {a.subject} · due {prettyDate(a.dueDate)}
        </Text>
        {!!a.description && <Text numberOfLines={2} style={{ fontSize: 12, color: colors.inkMuted }}>{a.description}</Text>}
        {canAttach && (
          <Row style={{ marginTop: 4 }}>
            <Button small variant="secondary" onPress={() => startEdit(a)}>Edit</Button>
            <Button small variant="danger" onPress={() => onDelete(a)}>Delete</Button>
          </Row>
        )}
        <AttachmentBar entityType="ASSIGNMENT" entityId={a.id} canUpload={canAttach} />
      </Card>
    );
  };

  return (
    <Screen onRefresh={refresh}>
      <Stack.Screen options={{ title: "Records" }} />
      <Title sub={isTeacher ? "Assignments and results for your assigned subjects." : "Assignments and results across your school."}>
        Records
      </Title>

      <Message m={message} />
      {!!classes.error && <Message m={{ type: "error", text: classes.error }} />}
      {!!records.error && <Message m={{ type: "error", text: records.error }} />}

      {classes.loading ? (
        <Loading />
      ) : (classes.data || []).length === 0 ? (
        <Empty>No classes available.</Empty>
      ) : (
        <>
          <Select label="Class" value={classId} options={classOptions} onChange={setClassId} />
          <Tabs2
            tabs={[
              { value: "assignments", label: "Assignments" },
              { value: "exams", label: "Exams" },
              { value: "results", label: "Results" },
            ]}
            value={tab}
            onChange={setTab}
          />
          {records.loading && <Loading />}
        </>
      )}

      {tab === "assignments" && (classes.data || []).length > 0 && (
        <>
          {canCreate && (
            <Card title="Create assignment">
              <Field label="Title" value={assignmentForm.title} onChangeText={(v) => setAssignmentForm((f) => ({ ...f, title: v }))} />
              <Select label="Subject" value={assignmentForm.subject} options={subjectSelectOptions} placeholder="Choose subject"
                hint={subjectHint} onChange={(v) => setAssignmentForm((f) => ({ ...f, subject: v }))} />
              {!isTeacher && (
                <Select label="Teacher" value={assignmentForm.teacherId} options={teacherOptions}
                  onChange={(v) => setAssignmentForm((f) => ({ ...f, teacherId: v }))} />
              )}
              <Select label="Type" value={assignmentForm.type} options={typeOptions(ASSIGNMENT_TYPES)}
                onChange={(v) => setAssignmentForm((f) => ({ ...f, type: v }))} />
              <DateField label="Due date" value={assignmentForm.dueDate} onChange={(v) => setAssignmentForm((f) => ({ ...f, dueDate: v }))} />
              <Field label="Description" multiline value={assignmentForm.description}
                onChangeText={(v) => setAssignmentForm((f) => ({ ...f, description: v }))} />
              <StagedFileField file={assignmentFile} error={assignmentFileError}
                onChange={(file, error) => { setAssignmentFile(file); setAssignmentFileError(error); }} />
              <Button busy={publishing} disabled={subjectOptions.length === 0} onPress={onCreateAssignment}>
                Publish assignment
              </Button>
            </Card>
          )}

          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink }}>
            {`Upcoming${upcoming.length ? ` (${upcoming.length})` : ""}`}
          </Text>
          {upcoming.length === 0 ? <Empty>Nothing due yet.</Empty> : upcoming.map((a) => renderRow(a, false))}

          {past.length > 0 && (
            <>
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink, marginTop: 8 }}>
                {`Previous assignments (${past.length})`}
              </Text>
              {past.map((a) => renderRow(a, true))}
            </>
          )}

          {assignments.length === 0 && !records.loading && <Empty>No assignments yet.</Empty>}
        </>
      )}

      {tab === "exams" && (classes.data || []).length > 0 && (
        <>
          {canCreate && (
            <Card title="Create exam">
              <Field label="Name" value={examForm.name} onChangeText={(v) => setExamForm((f) => ({ ...f, name: v }))} />
              <Select label="Subject" value={examForm.subject} options={subjectSelectOptions} placeholder="Choose subject"
                hint={subjectHint} onChange={(v) => setExamForm((f) => ({ ...f, subject: v }))} />
              <Select label="Type" value={examForm.type} options={typeOptions(EXAM_TYPES)}
                onChange={(v) => setExamForm((f) => ({ ...f, type: v }))} />
              <DateField label="Exam date" value={examForm.examDate} onChange={(v) => setExamForm((f) => ({ ...f, examDate: v }))} />
              <Field label="Max marks" keyboardType="number-pad" value={examForm.maxMarks}
                onChangeText={(v) => setExamForm((f) => ({ ...f, maxMarks: v }))} />
              <StagedFileField file={examFile} error={examFileError}
                onChange={(file, error) => { setExamFile(file); setExamFileError(error); }} />
              <Button busy={publishing} disabled={subjectOptions.length === 0} onPress={onCreateExam}>
                Publish exam
              </Button>
            </Card>
          )}
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink }}>Exams</Text>
          {exams.length === 0 ? <Empty>No exams yet.</Empty> : exams.map((e) => (
            <Card key={e.id} onPress={() => { setSelectedExamId(e.id); setTab("results"); }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.ink }}>{e.name}</Text>
              <Text style={{ fontSize: 11.5, color: colors.inkSubtle }}>
                {e.classLabel} · {e.subject} · {prettyDate(e.examDate)} · {e.maxMarks} marks
              </Text>
              <AttachmentBar entityType="EXAM" entityId={e.id} canUpload={canAttach} />
            </Card>
          ))}
        </>
      )}

      {tab === "results" && (classes.data || []).length > 0 && (
        <>
          <Card title="Enter results">
            <Select label="Exam" value={selectedExamId} placeholder="Choose exam"
              options={exams.map((e) => ({ value: e.id, label: `${e.name} — ${e.subject}` }))}
              onChange={setSelectedExamId} />
            {selectedExam && (
              <>
                <Text style={{ fontSize: 12, color: colors.inkSubtle }}>{selectedExam.classLabel} · max {selectedExam.maxMarks}</Text>
                {canCreate && roster.map((st) => (
                  <View key={st.studentId} style={{ gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.line }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: colors.ink }}>{st.name}</Text>
                    <Text style={{ fontSize: 11.5, color: colors.inkSubtle }}>Roll #{st.rollNumber}</Text>
                    <Row>
                      <View style={{ flex: 1 }}>
                        <Field label="Marks" keyboardType="number-pad" value={marks[st.studentId]?.marks ?? ""}
                          onChangeText={(v) => setMark(st.studentId, { marks: v })} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Field label="Grade" placeholder="Grade" value={marks[st.studentId]?.grade ?? ""}
                          onChangeText={(v) => setMark(st.studentId, { grade: v })} />
                      </View>
                    </Row>
                  </View>
                ))}
                {canCreate && <Button busy={savingResults} onPress={onSaveResults}>Save results</Button>}
              </>
            )}
          </Card>

          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink }}>Saved results</Text>
          {results.length === 0 ? <Empty>No results saved yet.</Empty> : results.map((r) => (
            <Card key={r.id}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.ink }}>{r.studentName}</Text>
              <Text style={{ fontSize: 11.5, color: colors.inkSubtle }}>{r.examName} · {r.subject}</Text>
              <Text style={{ fontSize: 13, color: colors.inkMuted }}>{r.marks}/{r.maxMarks} {r.grade ? `· ${r.grade}` : ""}</Text>
              <AttachmentBar entityType="EXAM_RESULT" entityId={r.id} canUpload={canAttach} />
            </Card>
          ))}
        </>
      )}

      {/* Staff can attach directly from this popup, unlike the student's view-only one. */}
      <AssignmentDetailModal assignment={openAssignment} onClose={() => setOpenAssignment(null)} canUpload={canAttach} />
    </Screen>
  );
}
