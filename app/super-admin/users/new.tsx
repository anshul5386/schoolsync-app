import { useState } from "react";
import { Stack, useRouter } from "expo-router";
import { createUser, getAllSchools } from "../../../src/api/superAdmin";
import { errorMessage } from "../../../src/api/client";
import { useAuth } from "../../../src/auth/AuthContext";
import { useLoad, unwrap } from "../../../src/lib/useLoad";
import { Button, Card, Empty, Field, Loading, Message, Screen, Select, Title } from "../../../src/ui";

// Mirrors the backend's assignable set. SUPER_ADMIN is absent by design.
const ROLES = [
  { value: "PRINCIPAL", label: "Principal", hint: "Runs the school" },
  { value: "SCHOOL_ADMIN", label: "School admin", hint: "Can approve staff requests" },
  { value: "DIRECTOR", label: "Director", hint: "Senior leadership, read-only oversight" },
  { value: "CHAIRMAN", label: "Chairman", hint: "Senior leadership, read-only oversight" },
  { value: "COORDINATOR", label: "Coordinator", hint: "Attendance and substitutions" },
  { value: "SUB_COORDINATOR", label: "Sub-coordinator", hint: "Limited coordinator rights" },
  { value: "TEACHER", label: "Teacher", hint: "Marks their class attendance" },
  { value: "STUDENT", label: "Student", hint: "Views their own records" },
];

export default function CreateUserScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const schoolsQ = useLoad(() => getAllSchools().then((r) => unwrap<any[]>(r) || []), []);
  const [form, setForm] = useState({ schoolId: "", name: "", phone: "", email: "", role: "TEACHER", password: "" });
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const schools: any[] = schoolsQ.data ?? [];
  const selectedRole = ROLES.find((r) => r.value === form.role);

  const submit = async () => {
    setMsg(null);
    if (!form.name.trim()) return setMsg({ type: "error", text: "Enter the user's full name." });
    if (!form.schoolId) return setMsg({ type: "error", text: "Choose which school this user belongs to." });
    if (!/^\d{10}$/.test(form.phone)) return setMsg({ type: "error", text: "Phone must be exactly 10 digits." });
    if (form.password.length < 6) return setMsg({ type: "error", text: "Password must be at least 6 characters." });
    setSubmitting(true);
    try {
      const res = await createUser({ ...form, email: form.email || null });
      const created = unwrap<any>(res);
      setMsg({ type: "success", text: `Created ${created.name} as ${created.role}. They can sign in with their phone and the password you set.` });
      setForm((f) => ({ ...f, name: "", phone: "", email: "", password: "" }));
    } catch (err) {
      setMsg({ type: "error", text: errorMessage(err, "Could not create the user.") });
    } finally { setSubmitting(false); }
  };

  if (user?.role !== "SUPER_ADMIN") return <Screen><Empty>Not available for your role.</Empty></Screen>;

  return (
    <Screen onRefresh={schoolsQ.reload}>
      <Stack.Screen options={{ title: "Create a user" }} />
      <Title sub="Adds an active account directly, skipping the approval queue.">Create a user</Title>
      {!!schoolsQ.error && <Message m={{ type: "error", text: "Could not load the school list." }} />}
      {schoolsQ.loading && !schoolsQ.data ? <Loading /> : (
        <Card>
          <Select label="School" value={form.schoolId} onChange={set("schoolId")} placeholder="Choose a school"
            options={schools.map((s) => ({ value: String(s.id), label: `${s.name}${s.city ? ` — ${s.city}` : ""}` }))} />
          <Field label="Full name" value={form.name} onChangeText={set("name")} />
          <Field label="Phone" value={form.phone} onChangeText={set("phone")} placeholder="10 digits" keyboardType="phone-pad" />
          <Field label="Email (optional)" value={form.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" />
          <Select label="Role" value={form.role} onChange={set("role")} hint={selectedRole?.hint}
            options={ROLES.map((r) => ({ value: r.value, label: r.label }))} />
          <Field label="Initial password" value={form.password} onChangeText={set("password")} placeholder="At least 6 characters"
            autoCapitalize="none" autoCorrect={false}
            hint="Share this with them directly. Shown in plain text so you can pass it on." />
          <Message m={msg} />
          <Button busy={submitting} onPress={submit}>Create user</Button>
          <Button variant="secondary" onPress={() => router.push("/super-admin/users")}>Done</Button>
        </Card>
      )}
    </Screen>
  );
}
