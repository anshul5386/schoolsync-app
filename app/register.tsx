import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Text } from "react-native";
import { Stack, useRouter } from "expo-router";
import { getSchoolOptions, getSchoolClassOptions, register } from "../src/api/auth";
import { errorMessage } from "../src/api/client";
import { Screen, Title, Card, Button, Field, Select, SearchableSelect, Message, Tabs2 } from "../src/ui";
import { colors } from "../src/theme";

// Only roles a person may request for themselves; the backend enforces the same list.
const REQUESTABLE = [
  { value: "TEACHER", label: "Teacher", hint: "Your mobile number must be unique." },
  { value: "STUDENT", label: "Student", hint: "Same mobile is fine for siblings — register each child with name and class." },
];

export default function RegisterScreen() {
  const router = useRouter();
  const [schools, setSchools] = useState<any[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [classes, setClasses] = useState<any[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classSectionId, setClassSectionId] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", requestedRole: "TEACHER", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    getSchoolOptions()
      .then((res) => setSchools(res.data?.data || []))
      .catch(() => setError("Could not load the school list. Please try again."));
  }, []);

  const schoolOptions = useMemo(() => schools.map((s) => {
    const sub = [s.city, s.boardType].filter(Boolean).join(" · ");
    return { value: s.id as string, label: sub ? `${s.name} (${sub})` : (s.name as string) };
  }), [schools]);
  const classOptions = useMemo(() => classes.map((c) => ({ value: c.id as string, label: c.label as string })), [classes]);

  const isStudent = form.requestedRole === "STUDENT";
  const selected = schools.find((s) => s.id === schoolId);

  // Classes belong to one school: refetch whenever the school changes and clear any old choice.
  useEffect(() => {
    setClasses([]);
    setClassSectionId("");
    if (!schoolId || !isStudent) return;
    setClassesLoading(true);
    getSchoolClassOptions(schoolId)
      .then((res) => setClasses(res.data?.data || []))
      .catch(() => setError("Could not load this school's classes. Please try again."))
      .finally(() => setClassesLoading(false));
  }, [schoolId, isStudent]);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError("");
    if (!schoolId) return setError("Please choose your school.");
    if (isStudent && !classSectionId) return setError("Please choose your class.");
    if (!/^\d{10}$/.test(form.phone)) return setError("Phone must be exactly 10 digits.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    setSubmitting(true);
    try {
      await register({
        schoolId,
        ...form,
        email: form.email || null,
        classSectionId: isStudent ? classSectionId : null,
      });
      setDone(true);
    } catch (e) {
      setError(errorMessage(e, "Could not submit your request."));
    } finally {
      setSubmitting(false);
    }
  };

  const header = <Stack.Screen options={{ title: "Request an account" }} />;

  if (done) {
    return (
      <Screen>
        {header}
        <Card title="Request submitted">
          <Text style={{ fontSize: 14, color: colors.inkMuted, lineHeight: 20 }}>
            An administrator at {selected?.name} will review your request.
            {isStudent ? " Register each sibling separately with the same mobile if needed." : ""}
          </Text>
          <Button onPress={() => router.replace("/login")}>Back to sign in</Button>
        </Card>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        {header}
        <Title sub="Choose teacher or student registration">Request an account</Title>
        <Tabs2 tabs={REQUESTABLE.map((r) => ({ value: r.value, label: r.label }))} value={form.requestedRole}
          onChange={(v) => { setForm((f) => ({ ...f, requestedRole: v })); setClassSectionId(""); }} />
        <Text style={{ fontSize: 12, color: colors.inkSubtle, marginBottom: 4 }}>
          {REQUESTABLE.find((r) => r.value === form.requestedRole)?.hint}
        </Text>
        <Card style={{ gap: 14 }}>
          <SearchableSelect label="Your school" value={schoolId} onChange={setSchoolId} options={schoolOptions}
            placeholder="Select your school" searchPlaceholder="Search by name or city" />
          <Field label="Full name" value={form.name} onChangeText={set("name")} />
          <Field label="Phone" value={form.phone} onChangeText={set("phone")} keyboardType="phone-pad" placeholder="10 digits" />
          <Field label="Email (optional)" value={form.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" />

          {isStudent && (
            !schoolId ? <Text style={{ fontSize: 12, color: colors.inkSubtle }}>Choose your school first.</Text>
            : classesLoading ? <Text style={{ fontSize: 12, color: colors.inkSubtle }}>Loading classes…</Text>
            : classOptions.length === 0 ? <Text style={{ fontSize: 12, color: colors.inkSubtle }}>This school has not added its classes yet. Contact them directly.</Text>
            : <SearchableSelect label="Class" value={classSectionId} onChange={setClassSectionId} options={classOptions} placeholder="Select your class" />
          )}

          <Field label="Choose a password" value={form.password} onChangeText={set("password")} secureTextEntry
            placeholder="At least 6 characters" hint="You will use this to sign in as soon as your request is approved." />

          <Message m={error ? { type: "error", text: error } : null} />
          <Button busy={submitting} onPress={submit}>Submit request</Button>
          <Button variant="secondary" onPress={() => router.replace("/login")}>Already approved? Sign in</Button>
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}
