import { useMemo, useState } from "react";
import { View, Text } from "react-native";
import { Stack } from "expo-router";
import { getAllSubjects, createSubject, renameSubject, retireSubject, restoreSubject } from "../src/api/subjects";
import { errorMessage } from "../src/api/client";
import { useAuth } from "../src/auth/AuthContext";
import { useLoad, unwrap } from "../src/lib/useLoad";
import { Screen, Title, Card, Button, Field, Message, Loading, Empty, Row } from "../src/ui";
import { colors } from "../src/theme";

type Msg = { type: "success" | "error"; text: string } | null;

/** The school's subject list; every subject dropdown in the app uses it. */
export default function SubjectsScreen() {
  const { user } = useAuth();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Msg>(null);

  const { data, loading, error, reload } = useLoad<any[]>(
    () => getAllSubjects().then((r) => unwrap<any[]>(r) || []), []);
  const subjects = data ?? [];
  const active = useMemo(() => subjects.filter((s) => s.active), [subjects]);
  const retired = useMemo(() => subjects.filter((s) => !s.active), [subjects]);

  if (user?.role !== "PRINCIPAL" && user?.role !== "SCHOOL_ADMIN") {
    return <Empty>Not available for your role.</Empty>;
  }

  const run = async (fn: () => Promise<unknown>, successText: string): Promise<boolean> => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      setMessage({ type: "success", text: successText });
      await reload();
      return true;
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "That did not work.") });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const onAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    const ok = await run(() => createSubject(name), `"${name}" added.`);
    if (ok) setNewName("");
  };

  const onRename = async (id: string) => {
    const name = editingName.trim();
    if (!name) return;
    const ok = await run(() => renameSubject(id, name), "Subject renamed.");
    if (ok) { setEditingId(null); setEditingName(""); }
  };

  return (
    <Screen onRefresh={reload}>
      <Stack.Screen options={{ title: "Subjects" }} />
      <Title sub="The list every subject dropdown in the app uses. Teachers choose from it - they cannot type their own.">Subjects</Title>
      <Message m={message} />
      {!!error && <Message m={{ type: "error", text: error }} />}

      <Card title="Add a subject">
        <Field label="Subject name" value={newName} onChangeText={setNewName} placeholder="e.g. Mathematics" />
        <Button onPress={onAdd} busy={busy} disabled={!newName.trim()}>Add subject</Button>
        <Text style={{ fontSize: 11, color: colors.inkSubtle, marginTop: 4 }}>
          Your school started with a standard list. Add anything specific to your school - a second language, a vocational subject - and retire whatever you do not teach.
        </Text>
      </Card>

      {loading ? <Loading /> : (
        <>
          <Card title={`In use (${active.length} subjects)`}>
            {active.length === 0 ? (
              <Empty>No active subjects. Add one before assigning teachers to classes.</Empty>
            ) : active.map((s) => (
              <View key={s.id} style={{ paddingVertical: 6, gap: 6 }}>
                {editingId === s.id ? (
                  <>
                    <Field label="Name" value={editingName} onChangeText={setEditingName} />
                    <Row>
                      <Button small onPress={() => onRename(s.id)} busy={busy}>Save</Button>
                      <Button small variant="secondary" onPress={() => { setEditingId(null); setEditingName(""); }}>Cancel</Button>
                    </Row>
                  </>
                ) : (
                  <Row style={{ justifyContent: "space-between" }}>
                    <Text style={{ flex: 1, fontSize: 15, color: colors.ink }}>{s.name}</Text>
                    <Button small variant="secondary" onPress={() => { setEditingId(s.id); setEditingName(s.name); }}>Rename</Button>
                    <Button small variant="danger" disabled={busy} onPress={() => { run(() => retireSubject(s.id), `"${s.name}" retired.`); }}>Retire</Button>
                  </Row>
                )}
              </View>
            ))}
          </Card>

          {retired.length > 0 && (
            <Card title="Retired">
              <Text style={{ fontSize: 11, color: colors.inkSubtle }}>
                Hidden from dropdowns but kept so past assignments and results still read correctly.
              </Text>
              {retired.map((s) => (
                <Row key={s.id} style={{ justifyContent: "space-between", paddingVertical: 6 }}>
                  <Text style={{ flex: 1, fontSize: 15, color: colors.inkSubtle, textDecorationLine: "line-through" }}>{s.name}</Text>
                  <Button small variant="secondary" disabled={busy} onPress={() => { run(() => restoreSubject(s.id), `"${s.name}" restored.`); }}>Restore</Button>
                </Row>
              ))}
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}
