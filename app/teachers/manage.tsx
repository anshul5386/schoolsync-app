import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import {
  getSchoolTeachers, getSchoolTeacher, getSchoolTeacherClasses, updateTeacherAssignments, TeacherAssignment,
} from "../../src/api/schoolTeachers";
import { getSubjects } from "../../src/api/subjects";
import { errorMessage } from "../../src/api/client";
import { useAuth } from "../../src/auth/AuthContext";
import { useLoad, unwrap } from "../../src/lib/useLoad";
import { Screen, Title, Card, Button, Field, Select, Message, Loading, Empty, Row } from "../../src/ui";
import { colors } from "../../src/theme";

type Msg = { type: "success" | "error"; text: string } | null;
type Boot = { teachers: any[]; classes: any[]; subjects: any[] };

/**
 * Same tuple the database constrains, minus school_id. Subject is compared case-insensitively so
 * "history" and "History" count as one responsibility, matching how the server reconciles them.
 */
const rowKey = (row: any) => `${row.classSectionId || ""}:${(row.subject || "").trim().toLowerCase()}`;

export default function TeacherManagementScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Msg>(null);

  const { data, loading, error, reload } = useLoad<Boot>(async () => {
    const [t, c, s] = await Promise.all([getSchoolTeachers(), getSchoolTeacherClasses(), getSubjects()]);
    return {
      teachers: unwrap<any[]>(t) || [],
      classes: unwrap<any[]>(c) || [],
      subjects: unwrap<any[]>(s) || [],
    };
  }, []);
  const teachers = data?.teachers ?? [];
  const classes = data?.classes ?? [];
  const subjects = data?.subjects ?? [];

  useEffect(() => {
    if (!selectedTeacherId) return;
    let cancelled = false;
    setProfileLoading(true);
    setMessage(null);
    getSchoolTeacher(selectedTeacherId)
      .then((res) => {
        if (cancelled) return;
        const d = unwrap<any>(res);
        setProfile(d);
        setAssignments(d?.assignments || []);
      })
      .catch((err) => { if (!cancelled) setMessage({ type: "error", text: errorMessage(err, "Could not load teacher profile.") }); })
      .finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled = true; };
  }, [selectedTeacherId]);

  const filteredTeachers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) =>
      t.name?.toLowerCase().includes(q) ||
      t.phone?.includes(q) ||
      (t.subjects || []).join(" ").toLowerCase().includes(q));
  }, [teachers, query]);

  /** Keys appearing more than once: flagged in the form rather than rejected after saving. */
  const duplicateKeys = useMemo(() => {
    const counts = new Map<string, number>();
    assignments.forEach((row) => {
      if (!row.classSectionId || !row.subject?.trim()) return;
      const k = rowKey(row);
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    const dup = new Set<string>();
    counts.forEach((n, k) => { if (n > 1) dup.add(k); });
    return dup;
  }, [assignments]);

  if (user?.role !== "PRINCIPAL" && user?.role !== "SCHOOL_ADMIN") {
    return <Empty>Not available for your role.</Empty>;
  }

  const isDuplicate = (row: any) => !!(row.classSectionId && row.subject?.trim() && duplicateKeys.has(rowKey(row)));

  /** Keep a retired subject in that row's options so it is not silently blanked and dropped on save. */
  const optionsFor = (row: any) => {
    const names: string[] = subjects.map((s) => s.name);
    const all = row.subject && !names.includes(row.subject) ? [row.subject, ...names] : names;
    return all.map((n) => ({ value: n, label: n }));
  };
  const classOptions = classes.map((c) => ({ value: c.id as string, label: `Class ${c.grade}-${c.section}` }));

  const addAssignment = () => {
    setAssignments((rows) => [...rows, { classSectionId: classes[0]?.id || "", subject: "", canWrite: true }]);
  };
  const updateRow = (index: number, patch: any) => {
    setAssignments((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };
  const removeRow = (index: number) => {
    setAssignments((rows) => rows.filter((_, i) => i !== index));
  };

  const save = async () => {
    if (!selectedTeacherId) return;
    const invalid = assignments.some((row) => !row.classSectionId || !row.subject?.trim());
    if (invalid) {
      setMessage({ type: "error", text: "Every responsibility needs a class and subject." });
      return;
    }
    if (duplicateKeys.size > 0) {
      setMessage({ type: "error", text: "The same class and subject is listed more than once. Remove the highlighted duplicate rows." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const payload: TeacherAssignment[] = assignments.map((row) => ({
        classSectionId: row.classSectionId,
        subject: row.subject.trim(),
        canWrite: row.canWrite !== false,
      }));
      const res = await updateTeacherAssignments(selectedTeacherId, payload);
      const d = unwrap<any>(res);
      setProfile(d);
      setAssignments(d?.assignments || []);
      setMessage({ type: "success", text: "Responsibilities updated." });
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "Could not save responsibilities.") });
    } finally {
      setSaving(false);
    }
  };

  const noSubjects = !loading && !error && subjects.length === 0;

  return (
    <Screen onRefresh={reload}>
      <Stack.Screen options={{ title: "Teachers" }} />
      <Title sub="Give approved teachers responsibility for classes and subjects.">Teacher onboarding</Title>
      <Button small variant="secondary" onPress={() => router.push("/subjects")}>Manage subject list</Button>
      <Message m={message} />
      {!!error && <Message m={{ type: "error", text: error }} />}

      {noSubjects && (
        <Text style={{ padding: 10, borderRadius: 8, backgroundColor: "#FDF3E1", color: "#B7791F", fontSize: 13 }}>
          Your school has no subjects yet, so there is nothing to assign. Use "Manage subject list" to add subjects first.
        </Text>
      )}

      {loading ? <Loading /> : (
        <>
          <Card title="Teachers">
            <Field label="Search" value={query} onChangeText={setQuery} placeholder="Search teacher or subject" />
            {filteredTeachers.length === 0 ? (
              <Empty>No teachers found.</Empty>
            ) : filteredTeachers.map((t) => (
              <Pressable key={t.id} onPress={() => setSelectedTeacherId(t.id)}
                style={{ paddingVertical: 10, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: colors.line, borderRadius: 8,
                  backgroundColor: selectedTeacherId === t.id ? colors.navy50 : colors.white }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.ink }}>{t.name}</Text>
                <Text style={{ fontSize: 11.5, color: colors.inkSubtle }}>{t.phone}</Text>
                <Text style={{ fontSize: 11, color: colors.inkMuted, marginTop: 2 }}>
                  {(t.subjects || []).length ? t.subjects.join(", ") : "No subjects assigned"}
                </Text>
              </Pressable>
            ))}
          </Card>

          {profileLoading ? <Loading /> : !profile ? (
            <Empty>Select a teacher to manage responsibilities.</Empty>
          ) : (
            <Card>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.ink }}>{profile.name}</Text>
              <Text style={{ fontSize: 12, color: colors.inkSubtle }}>{profile.email || profile.phone}</Text>
              <Button small variant="secondary" onPress={addAssignment} disabled={classes.length === 0 || subjects.length === 0}>
                Add responsibility
              </Button>

              {assignments.length === 0 ? (
                <Empty>No responsibilities assigned yet.</Empty>
              ) : assignments.map((row, index) => {
                const dup = isDuplicate(row);
                return (
                  <View key={row.id || `new-${index}`}
                    style={{ gap: 8, padding: 10, borderRadius: 10, borderWidth: 1,
                      borderColor: dup ? colors.danger : colors.line, backgroundColor: dup ? colors.dangerSoft : colors.white }}>
                    <Select label="Class" value={row.classSectionId || ""} placeholder="Choose class"
                      onChange={(v) => updateRow(index, { classSectionId: v })} options={classOptions} />
                    <Select label="Subject" value={row.subject || ""} placeholder="Choose subject"
                      onChange={(v) => updateRow(index, { subject: v })} options={optionsFor(row)} />
                    <Row style={{ justifyContent: "space-between" }}>
                      <Pressable onPress={() => updateRow(index, { canWrite: row.canWrite === false })}
                        style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: colors.navy,
                          alignItems: "center", justifyContent: "center",
                          backgroundColor: row.canWrite !== false ? colors.navy : colors.white }}>
                          {row.canWrite !== false && <Text style={{ color: colors.white, fontSize: 12, fontWeight: "700" }}>✓</Text>}
                        </View>
                        <Text style={{ fontSize: 13, color: colors.inkMuted }}>Can write</Text>
                      </Pressable>
                      <Button small variant="danger" onPress={() => removeRow(index)}>Remove</Button>
                    </Row>
                  </View>
                );
              })}

              <Text style={{ fontSize: 11, color: colors.inkSubtle }}>
                {duplicateKeys.size > 0
                  ? "Duplicate rows are highlighted - remove them to save."
                  : "Saving with no changes is safe."}
              </Text>
              <Button onPress={save} busy={saving} disabled={duplicateKeys.size > 0}>Save responsibilities</Button>
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}
