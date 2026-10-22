import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Stack } from "expo-router";
import {
  getManagedClasses, createClass, createClassesBulk, renameClass, retireClass, restoreClass, deleteClass,
} from "../../src/api/schoolClasses";
import { errorMessage } from "../../src/api/client";
import { useAuth } from "../../src/auth/AuthContext";
import { useLoad, unwrap } from "../../src/lib/useLoad";
import { ALL_GRADES, gradeLabel, compareClasses } from "../../src/lib/grade";
import { Screen, Title, Card, Button, Field, Select, Message, Loading, Empty, Row, confirm } from "../../src/ui";
import { colors } from "../../src/theme";

type Msg = { type: "success" | "error"; text: string } | null;

const MANAGERS = ["PRINCIPAL", "SCHOOL_ADMIN"];
const ALLOWED = ["PRINCIPAL", "COORDINATOR", "SCHOOL_ADMIN"];
const SECTION_MAX = 20;
const gradeOptions = () => (ALL_GRADES as any[]).map((g) => ({ value: String(g), label: String(gradeLabel(g)) }));

/** Class and section management. Coordinators can only rename; the server enforces the same split. */
export default function ClassesManageScreen() {
  const { user } = useAuth();
  const canManage = !!user && MANAGERS.includes(user.role);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Msg>(null);
  const [newGrade, setNewGrade] = useState("1");
  const [newSection, setNewSection] = useState("A");
  const [bulkGrade, setBulkGrade] = useState("1");
  const [bulkSections, setBulkSections] = useState("2");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGrade, setEditGrade] = useState("");
  const [editSection, setEditSection] = useState("");

  const { data, loading, error, reload } = useLoad<any[]>(
    () => getManagedClasses().then((r) => unwrap<any[]>(r) || []), []);
  const rows = data ?? [];
  const active = useMemo(() => rows.filter((r) => r.active).sort(compareClasses), [rows]);
  const retired = useMemo(() => rows.filter((r) => !r.active).sort(compareClasses), [rows]);

  if (!user || !ALLOWED.includes(user.role)) return <Empty>Not available for your role.</Empty>;

  const run = async (fn: () => Promise<any>, ok: string): Promise<boolean> => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fn();
      setMessage({ type: "success", text: res?.data?.message || ok });
      await reload();
      return true;
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "That did not work.") });
      return false;
    } finally {
      setBusy(false);
    }
  };

  // No upper-casing: the server upper-cases a single letter and otherwise keeps capitalisation as typed.
  const onAdd = () => { run(() => createClass(newGrade, newSection), "Class added."); };
  const onBulk = () => {
    run(() => createClassesBulk([{ grade: bulkGrade, sections: Number(bulkSections) }]), "Classes added.");
  };
  const onRename = async (id: string) => {
    const ok = await run(() => renameClass(id, editGrade, editSection), "Class updated.");
    if (ok) setEditingId(null);
  };
  const onDelete = async (row: any) => {
    const yes = await confirm("Delete class", `Delete ${row.label}? This cannot be undone.`, "Delete", true);
    if (!yes) return;
    await run(() => deleteClass(row.id), "Class deleted.");
  };

  const lastLetter = String.fromCharCode(64 + Math.min(26, Math.max(1, Number(bulkSections) || 1)));

  return (
    <Screen onRefresh={reload}>
      <Stack.Screen options={{ title: "Classes & sections" }} />
      <Title sub={canManage
        ? "Add sections as the school grows, and rename them to whatever your school calls them. Classes with history are retired rather than deleted."
        : "Rename sections to whatever your school calls them. Adding and retiring classes is done by the principal."}>
        Classes & sections
      </Title>
      <Message m={message} />
      {!!error && <Message m={{ type: "error", text: error }} />}

      {canManage && (
        <>
          <Card title="Add one class">
            <Select label="Grade" value={newGrade} onChange={setNewGrade} options={gradeOptions()} />
            <Field label="Section" value={newSection} maxLength={SECTION_MAX} onChangeText={setNewSection}
              placeholder="A, or Rose" hint="A letter, or a name - houses and founders are both common." />
            <Button onPress={onAdd} busy={busy}>Add class</Button>
          </Card>
          <Card title="Add several sections">
            <Select label="Grade" value={bulkGrade} onChange={setBulkGrade} options={gradeOptions()} />
            <Field label="Sections" value={bulkSections} keyboardType="number-pad" onChangeText={setBulkSections}
              hint={`Creates A-${lastLetter}. Sections that already exist are skipped. Rename them afterwards if your school uses names.`} />
            <Button variant="secondary" onPress={onBulk} busy={busy}>Add sections</Button>
          </Card>
        </>
      )}

      {loading ? <Loading /> : rows.length === 0 ? (
        <Empty>
          No classes yet. {canManage
            ? "Add them above before assigning teachers or marking attendance."
            : "Ask your principal to add them before assigning teachers or marking attendance."}
        </Empty>
      ) : (
        <>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.ink }}>In use ({active.length} classes)</Text>
          {active.map((row) => (
            <Card key={row.id}>
              {editingId === row.id ? (
                <View style={{ gap: 8 }}>
                  <Select label="Grade" value={editGrade} onChange={setEditGrade} options={gradeOptions()} />
                  <Field label="Section name" value={editSection} maxLength={SECTION_MAX}
                    onChangeText={setEditSection} placeholder="Section name" />
                  <Row>
                    <Button small onPress={() => onRename(row.id)} busy={busy}>Save</Button>
                    <Button small variant="secondary" onPress={() => setEditingId(null)}>Cancel</Button>
                  </Row>
                </View>
              ) : (
                <>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }}>{row.label}</Text>
                  <Text style={{ fontSize: 12, color: colors.inkMuted }}>
                    {row.studentCount} students · {row.teacherAssignmentCount} teachers · {row.timetableSlotCount} periods
                  </Text>
                  <Row style={{ flexWrap: "wrap", marginTop: 4 }}>
                    <Button small variant="secondary" onPress={() => {
                      setEditingId(row.id); setEditGrade(String(row.grade)); setEditSection(String(row.section));
                    }}>Rename</Button>
                    {canManage && (
                      <Button small variant="secondary" disabled={busy}
                        onPress={() => { run(() => retireClass(row.id), "Class retired."); }}>Retire</Button>
                    )}
                    {canManage && !!row.deletable && (
                      <Button small variant="danger" disabled={busy} onPress={() => { onDelete(row); }}>Delete</Button>
                    )}
                  </Row>
                </>
              )}
            </Card>
          ))}

          {retired.length > 0 && (
            <Card title="Retired">
              <Text style={{ fontSize: 11, color: colors.inkSubtle }}>
                Hidden from every dropdown, but their attendance and results history stays intact.
              </Text>
              {retired.map((row) => (
                <Row key={row.id} style={{ justifyContent: "space-between", paddingVertical: 6 }}>
                  <Text style={{ flex: 1, fontSize: 15, color: colors.inkSubtle, textDecorationLine: "line-through" }}>{row.label}</Text>
                  {canManage && (
                    <Button small variant="secondary" disabled={busy}
                      onPress={() => { run(() => restoreClass(row.id), "Class restored."); }}>Restore</Button>
                  )}
                </Row>
              ))}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}
