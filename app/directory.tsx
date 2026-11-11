import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Stack } from "expo-router";
import { getMyClasses } from "../src/api/classes";
import { getSchoolTeachers } from "../src/api/schoolTeachers";
import { getSchoolStudents, updateRollNumber, updateStudentGuardian, resetSchoolUserPassword } from "../src/api/schoolDirectory";
import { errorMessage } from "../src/api/client";
import { useAuth } from "../src/auth/AuthContext";
import { useLoad, unwrap } from "../src/lib/useLoad";
import { Button, Card, Empty, Field, Loading, Message, Row, Screen, Select, Tabs2, Title, confirm } from "../src/ui";
import { colors } from "../src/theme";

type Msg = { type: "success" | "error"; text: string } | null;

export default function DirectoryScreen() {
  const { user } = useAuth();
  const canReset = user?.role === "PRINCIPAL" || user?.role === "SCHOOL_ADMIN";
  const [tab, setTab] = useState("students");
  const [classId, setClassId] = useState("");
  const [message, setMessage] = useState<Msg>(null);
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [guardianFor, setGuardianFor] = useState<any | null>(null);
  const [guardianForm, setGuardianForm] = useState({
    fatherPhone: "", fatherName: "", motherPhone: "", motherName: "",
    guardianPhone: "", guardianName: "",
  });

  const setup = useLoad(async () => {
    const [c, t] = await Promise.all([getMyClasses(), getSchoolTeachers()]);
    return { classes: unwrap<any[]>(c) || [], teachers: unwrap<any[]>(t) || [] };
  }, []);

  const studentsQ = useLoad(
    () => getSchoolStudents(classId || undefined).then((r) => unwrap<any[]>(r) || []),
    [classId, tab]
  );

  if (user && !["PRINCIPAL", "SCHOOL_ADMIN", "COORDINATOR"].includes(user.role)) {
    return <Screen><Stack.Screen options={{ title: "Directory" }} /><Empty>Not available for your role.</Empty></Screen>;
  }

  const saveRoll = async (studentId: string, value: string) => {
    const rollNumber = parseInt(value, 10);
    if (!rollNumber || rollNumber < 1) return;
    try {
      await updateRollNumber(studentId, rollNumber);
      setMessage({ type: "success", text: "Roll number updated." });
      await studentsQ.reload();
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "Update failed.") });
    }
  };

  const submitGuardian = async () => {
    if (!guardianFor) return;
    try {
      await updateStudentGuardian(guardianFor.studentId, guardianForm);
      setMessage({ type: "success", text: "Parent contact saved." });
      setGuardianFor(null);
      await studentsQ.reload();
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "Save failed.") });
    }
  };

  const submitReset = async () => {
    if (!resetFor || newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    try {
      await resetSchoolUserPassword(resetFor, newPassword);
      setMessage({ type: "success", text: "Password updated." });
      setResetFor(null);
      setNewPassword("");
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "Reset failed.") });
    }
  };

  const classes = setup.data?.classes ?? [];
  const teachers = setup.data?.teachers ?? [];
  const students = studentsQ.data ?? [];

  return (
    <Screen onRefresh={async () => { await setup.reload(); await studentsQ.reload(); }}>
      <Stack.Screen options={{ title: "Directory" }} />
      <Title sub="Students and teachers in your school">Directory</Title>
      <Message m={message} />
      <Tabs2 tabs={[{ value: "students", label: "Students" }, { value: "teachers", label: "Teachers" }]} value={tab} onChange={setTab} />

      {tab === "students" && (
        <>
          <Select label="Class filter" value={classId} onChange={setClassId} placeholder="All classes"
            options={[{ value: "", label: "All classes" }, ...classes.map((c) => ({
              value: c.id, label: `Class ${c.grade}-${c.section}`,
            }))]} />
          {studentsQ.loading ? <Loading /> : students.length === 0 ? <Empty>No students found.</Empty> : students.map((s) => (
            <Card key={s.studentId}>
              <Text style={{ fontWeight: "700", color: colors.ink }}>{s.name}</Text>
              <Text style={{ fontSize: 12, color: colors.inkMuted }}>
                {s.classLabel} · UserName {s.username || s.userId} · {s.phone}
              </Text>
              <Row style={{ alignItems: "center", marginTop: 8, gap: 8, flexWrap: "wrap" }}>
                <Button small variant="secondary" onPress={() => {
                  setGuardianFor(s);
                  setGuardianForm({
                    fatherName: s.fatherName || "",
                    fatherPhone: s.fatherPhone || "",
                    motherName: s.motherName || "",
                    motherPhone: s.motherPhone || "",
                    guardianName: s.guardianName || "",
                    guardianPhone: s.guardianPhone || "",
                  });
                }}>Parent phone</Button>
                <Text style={{ fontSize: 12, color: colors.inkSubtle }}>Roll</Text>
                <TextInput defaultValue={String(s.rollNumber)} keyboardType="number-pad"
                  onEndEditing={(e) => saveRoll(s.studentId, e.nativeEvent.text)}
                  style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 6, width: 56, textAlign: "center" }} />
                {canReset && (
                  <Button small variant="secondary" onPress={() => { setResetFor(s.userId); setNewPassword(""); }}>
                    Reset password
                  </Button>
                )}
              </Row>
            </Card>
          ))}
        </>
      )}

      {tab === "teachers" && (
        setup.loading ? <Loading /> : teachers.length === 0 ? <Empty>No teachers.</Empty> : teachers.map((t) => (
          <Card key={t.id}>
            <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", color: colors.ink }}>{t.name}</Text>
                <Text style={{ fontSize: 12, color: colors.inkMuted }}>{t.phone}</Text>
              </View>
              {canReset && (
                <Button small variant="secondary" onPress={() => { setResetFor(t.id); setNewPassword(""); }}>
                  Reset password
                </Button>
              )}
            </Row>
          </Card>
        ))
      )}

      {guardianFor && (
        <Card title={`Parent — ${guardianFor.name}`}>
          <Field label="Father name" value={guardianForm.fatherName} onChangeText={(v) => setGuardianForm((f) => ({ ...f, fatherName: v }))} />
          <Field label="Father phone" value={guardianForm.fatherPhone} onChangeText={(v) => setGuardianForm((f) => ({ ...f, fatherPhone: v }))} keyboardType="phone-pad" />
          <Field label="Mother name" value={guardianForm.motherName} onChangeText={(v) => setGuardianForm((f) => ({ ...f, motherName: v }))} />
          <Field label="Mother phone" value={guardianForm.motherPhone} onChangeText={(v) => setGuardianForm((f) => ({ ...f, motherPhone: v }))} keyboardType="phone-pad" />
          <Field label="Guardian name" value={guardianForm.guardianName} onChangeText={(v) => setGuardianForm((f) => ({ ...f, guardianName: v }))} />
          <Field label="Guardian phone" value={guardianForm.guardianPhone} onChangeText={(v) => setGuardianForm((f) => ({ ...f, guardianPhone: v }))} keyboardType="phone-pad" />
          <Row>
            <View style={{ flex: 1 }}><Button onPress={submitGuardian}>Save</Button></View>
            <View style={{ flex: 1 }}><Button variant="secondary" onPress={() => setGuardianFor(null)}>Cancel</Button></View>
          </Row>
        </Card>
      )}

      {resetFor && (
        <Card title="Set new password">
          <Field label="New password (min 6)" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
          <Row>
            <View style={{ flex: 1 }}><Button onPress={submitReset}>Save</Button></View>
            <View style={{ flex: 1 }}><Button variant="secondary" onPress={() => setResetFor(null)}>Cancel</Button></View>
          </Row>
        </Card>
      )}
    </Screen>
  );
}
