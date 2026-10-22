import { ReactNode, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import {
  getSubjectCatalogue, createSchool, createSchoolClasses, createSchoolSubjects, getSchoolSetup,
} from "../../src/api/schoolOnboarding";
import { createUser } from "../../src/api/superAdmin";
import { errorMessage } from "../../src/api/client";
import { useAuth } from "../../src/auth/AuthContext";
import { ALL_GRADES, gradeLabel } from "../../src/lib/grade";
import { Button, Card, Empty, Field, Message, Row, Screen, Select, Title } from "../../src/ui";
import { colors } from "../../src/theme";

/**
 * Super-admin school onboarding: school record, classes, subjects, first accounts.
 * Sequential with the school id held in state: steps are not transactional across each other, so if
 * a later step fails the school and earlier work still exist and the operator resumes.
 */
const BOARDS = ["CBSE", "ICSE", "State Board", "IB", "IGCSE"];

const PRESETS: Record<string, { grades: string[]; sections: number }> = {
  "Primary only (1–5)": { grades: ["1", "2", "3", "4", "5"], sections: 2 },
  "Middle (1–8)": { grades: ["1", "2", "3", "4", "5", "6", "7", "8"], sections: 2 },
  "Secondary (1–10)": { grades: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"], sections: 3 },
  "Full K–12": { grades: ALL_GRADES, sections: 3 },
};

type Staff = { name: string; phone: string; email: string; password: string };
const emptyStaff = (): Staff => ({ name: "", phone: "", email: "", password: "" });
const emptyForm = () => ({
  name: "", boardType: "CBSE", subdomain: "", city: "", state: "",
  address: "", phone: "", email: "", academicYear: "", affiliationCode: "",
});

export default function OnboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Step 1
  const [form, setForm] = useState(emptyForm());
  const [subdomainEdited, setSubdomainEdited] = useState(false);
  const [school, setSchool] = useState<any>(null);

  // Step 2: grade code -> section count. Absent means the school does not run that grade.
  const [sections, setSections] = useState<Record<string, number>>({});

  // Step 3
  const [catalogue, setCatalogue] = useState<string[]>([]);
  const [chosenSubjects, setChosenSubjects] = useState<Set<string>>(new Set());
  const [customSubject, setCustomSubject] = useState("");

  // Step 4
  const [principal, setPrincipal] = useState<Staff>(emptyStaff());
  const [coordinator, setCoordinator] = useState<Staff>(emptyStaff());
  const [setup, setSetup] = useState<any>(null);

  useEffect(() => {
    getSubjectCatalogue()
      .then((res) => {
        const names: string[] = res.data?.data || [];
        setCatalogue(names);
        // Pre-ticked: unticking what a school does not teach is faster than picking 20 items.
        setChosenSubjects(new Set(names));
      })
      .catch(() => {});
  }, []);

  // Suggest a subdomain from the name until the operator types their own.
  useEffect(() => {
    if (subdomainEdited) return;
    const slug = form.name.toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
    setForm((f) => ({ ...f, subdomain: slug }));
  }, [form.name, subdomainEdited]);

  const chosenGrades = useMemo(
    () => ALL_GRADES.filter((g) => (sections[g] || 0) > 0).map((g) => ({ grade: g, sections: sections[g] })),
    [sections]
  );
  const totalClasses = chosenGrades.reduce((sum, g) => sum + g.sections, 0);

  const setF = (k: keyof ReturnType<typeof emptyForm>) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const applyPreset = (key: string) => {
    const preset = PRESETS[key];
    const next: Record<string, number> = {};
    preset.grades.forEach((g) => { next[g] = preset.sections; });
    setSections(next);
  };

  const setGradeSections = (grade: string, count: number) => {
    setSections((prev) => {
      const next = { ...prev };
      if (!count || count < 1) delete next[grade];
      else next[grade] = Math.min(26, count);
      return next;
    });
  };

  const toggleSubject = (name: string) => {
    setChosenSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const addCustomSubject = () => {
    const name = customSubject.trim();
    if (!name) return;
    setCatalogue((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setChosenSubjects((prev) => new Set(prev).add(name));
    setCustomSubject("");
  };

  const guard = async (fn: () => Promise<void>, ok?: string): Promise<boolean> => {
    setBusy(true); setMessage(null);
    try {
      await fn();
      if (ok) setMessage({ type: "success", text: ok });
      return true;
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "That did not work.") });
      return false;
    } finally { setBusy(false); }
  };

  const submitSchool = async () => {
    if (!form.name.trim() || !form.subdomain.trim()) {
      setMessage({ type: "error", text: "School name and subdomain are required." });
      return;
    }
    const ok = await guard(async () => {
      const res = await createSchool({
        ...form,
        city: form.city || null, state: form.state || null, address: form.address || null,
        phone: form.phone || null, email: form.email || null,
        academicYear: form.academicYear || null, affiliationCode: form.affiliationCode || null,
      });
      setSchool(res.data?.data);
    }, "School created.");
    if (ok) setStep(2);
  };

  const submitClasses = async () => {
    if (chosenGrades.length === 0) {
      setMessage({ type: "error", text: "Choose at least one grade." });
      return;
    }
    const ok = await guard(async () => { await createSchoolClasses(school.id, chosenGrades); }, `${totalClasses} classes created.`);
    if (ok) setStep(3);
  };

  const submitSubjects = async () => {
    if (chosenSubjects.size === 0) {
      setMessage({ type: "error", text: "Choose at least one subject." });
      return;
    }
    const ok = await guard(async () => { await createSchoolSubjects(school.id, Array.from(chosenSubjects)); }, "Subjects added.");
    if (ok) setStep(4);
  };

  const submitStaff = async () => {
    if (!principal.name || !/^\d{10}$/.test(principal.phone) || principal.password.length < 6) {
      setMessage({ type: "error", text: "The principal needs a name, a 10-digit phone and a password of at least 6 characters." });
      return;
    }
    const ok = await guard(async () => {
      await createUser({ ...principal, schoolId: school.id, role: "PRINCIPAL", email: principal.email || null });
      if (coordinator.name && /^\d{10}$/.test(coordinator.phone) && coordinator.password.length >= 6) {
        await createUser({ ...coordinator, schoolId: school.id, role: "COORDINATOR", email: coordinator.email || null });
      }
      const res = await getSchoolSetup(school.id);
      setSetup(res.data?.data);
    }, "Staff created.");
    if (ok) setStep(5);
  };

  const reset = () => {
    setStep(1); setMessage(null); setForm(emptyForm()); setSubdomainEdited(false); setSchool(null);
    setSections({}); setCustomSubject(""); setPrincipal(emptyStaff()); setCoordinator(emptyStaff()); setSetup(null);
    setChosenSubjects(new Set(catalogue));
  };

  if (user?.role !== "SUPER_ADMIN") return <Screen><Empty>Not available for your role.</Empty></Screen>;

  return (
    <Screen>
      <Stack.Screen options={{ title: "Onboard a school" }} />
      <Title sub="Creates the school, its classes and sections, its subject list, and the first accounts.">Onboard a school</Title>
      <Steps step={step} />
      <Message m={message} />

      {step === 1 && (
        <Card title="School details">
          <Field label="School name" value={form.name} onChangeText={setF("name")} />
          <Select label="Board" value={form.boardType} onChange={setF("boardType")} options={BOARDS.map((b) => ({ value: b, label: b }))} />
          <Field label="Subdomain" value={form.subdomain} autoCapitalize="none" autoCorrect={false}
            onChangeText={(v) => { setSubdomainEdited(true); setForm((f) => ({ ...f, subdomain: v })); }}
            hint="Lowercase letters, numbers and hyphens. Must be unique across the platform — it is checked when you submit." />
          <Field label="City" value={form.city} onChangeText={setF("city")} />
          <Field label="State" value={form.state} onChangeText={setF("state")} />
          <Field label="Phone" value={form.phone} onChangeText={setF("phone")} keyboardType="phone-pad" />
          <Field label="Email" value={form.email} onChangeText={setF("email")} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Academic year" value={form.academicYear} onChangeText={setF("academicYear")} placeholder="2026-2027" />
          <Field label="Affiliation code" value={form.affiliationCode} onChangeText={setF("affiliationCode")} />
          <Field label="Address" value={form.address} onChangeText={setF("address")} />
          <Button busy={busy} onPress={submitSchool}>Create school and continue</Button>
        </Card>
      )}

      {step === 2 && (
        <Card title="Grades and sections">
          <Text style={{ fontSize: 12, color: colors.inkSubtle }}>{school?.name} — pick the grades this school runs</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {Object.keys(PRESETS).map((key) => (
              <Pressable key={key} onPress={() => applyPreset(key)}
                style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.canvas }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: colors.inkMuted }}>{key}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setSections({})}
              style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white }}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: colors.danger }}>Clear</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {ALL_GRADES.map((g) => {
              const count = sections[g] || 0;
              return (
                <View key={g} style={{ width: "48%", flexGrow: 1, borderWidth: 1, borderRadius: 8, padding: 10,
                  borderColor: count > 0 ? colors.navy : colors.line, backgroundColor: count > 0 ? colors.navy50 : colors.white }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.ink }}>{gradeLabel(g)}</Text>
                  <Row style={{ marginTop: 6, gap: 6 }}>
                    <Stepper label="−" onPress={() => setGradeSections(g, count - 1)} />
                    <Text style={{ minWidth: 22, textAlign: "center", fontSize: 14, fontWeight: "700", color: colors.ink }}>{count}</Text>
                    <Stepper label="+" onPress={() => setGradeSections(g, count + 1)} />
                    <Text style={{ fontSize: 10, color: colors.inkSubtle }}>
                      {count > 0 ? `A–${String.fromCharCode(64 + count)}` : "none"}
                    </Text>
                  </Row>
                </View>
              );
            })}
          </View>

          <Text style={{ fontSize: 12, color: colors.inkMuted }}>
            {totalClasses === 0
              ? "No grades chosen yet."
              : `${chosenGrades.length} grades, ${totalClasses} classes in total. Sections are named A, B, C…`}
          </Text>
          <Button busy={busy} disabled={totalClasses === 0} onPress={submitClasses}>Create classes and continue</Button>
          <Button variant="secondary" onPress={() => { setMessage(null); setStep(3); }}>Skip for now</Button>
        </Card>
      )}

      {step === 3 && (
        <Card title="Subjects">
          <Text style={{ fontSize: 12, color: colors.inkSubtle }}>Untick anything this school does not teach</Text>
          {catalogue.map((name) => {
            const on = chosenSubjects.has(name);
            return (
              <Pressable key={name} onPress={() => toggleSubject(name)}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, paddingHorizontal: 10, borderWidth: 1, borderRadius: 8,
                  borderColor: on ? colors.navy : colors.line, backgroundColor: on ? colors.navy50 : colors.white }}>
                <Text style={{ fontSize: 16, color: on ? colors.navy : colors.inkSubtle }}>{on ? "☑" : "☐"}</Text>
                <Text style={{ fontSize: 13, color: colors.ink }}>{name}</Text>
              </Pressable>
            );
          })}
          <Field label="Custom subject" value={customSubject} onChangeText={setCustomSubject} placeholder="Add something specific to this school" />
          <Button small variant="secondary" onPress={addCustomSubject}>Add</Button>
          <Text style={{ fontSize: 12, color: colors.inkMuted }}>{chosenSubjects.size} subjects selected.</Text>
          <Button busy={busy} disabled={chosenSubjects.size === 0} onPress={submitSubjects}>Add subjects and continue</Button>
          <Button variant="secondary" onPress={() => { setMessage(null); setStep(4); }}>Skip for now</Button>
        </Card>
      )}

      {step === 4 && (
        <Card title="First accounts">
          <Text style={{ fontSize: 12, color: colors.inkSubtle }}>
            The principal is required — without one, nobody at the school can approve teachers
          </Text>
          <StaffFields legend="Principal (required)" value={principal} onChange={setPrincipal} />
          <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 6 }} />
          <StaffFields legend="Coordinator (optional)" value={coordinator} onChange={setCoordinator} />
          <Text style={{ fontSize: 11, color: colors.inkSubtle }}>
            Passwords are shown in plain text so you can pass them on. Share them directly and ask each person to change theirs.
          </Text>
          <Button busy={busy} onPress={submitStaff}>Create accounts and finish</Button>
          <Button variant="secondary" onPress={() => { setMessage(null); setStep(5); }}>Skip for now</Button>
        </Card>
      )}

      {step === 5 && (
        <Card title="Ready to hand over">
          {!!school?.name && <Text style={{ fontSize: 12, color: colors.inkSubtle }}>{school.name}</Text>}
          {setup ? (
            <>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Stat label="Classes" value={setup.classCount} />
                <Stat label="Subjects" value={setup.subjectCount} />
                <Stat label="Teachers" value={setup.teacherCount} />
                <Stat label="Students" value={setup.studentCount} />
              </View>
              {setup.missing?.length > 0 ? (
                <View style={{ padding: 10, backgroundColor: "#FDF3E1", borderRadius: 8, gap: 3 }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#8A5A12" }}>Still to do</Text>
                  {setup.missing.map((m: string) => (
                    <Text key={m} style={{ fontSize: 12, color: "#8A5A12" }}>· {m}</Text>
                  ))}
                </View>
              ) : (
                <Message m={{ type: "success", text: "Fully set up. The principal can sign in and start running the school." }} />
              )}
            </>
          ) : (
            <Text style={{ fontSize: 13, color: colors.inkMuted }}>
              Onboarding finished. Open the school from All schools to check what is still outstanding.
            </Text>
          )}
          <Button onPress={() => router.replace("/super-admin/schools")}>Back to all schools</Button>
          <Button variant="secondary" onPress={reset}>Onboard another</Button>
        </Card>
      )}
    </Screen>
  );
}

function Steps({ step }: { step: number }) {
  const labels = ["School", "Classes", "Subjects", "Accounts", "Done"];
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {labels.map((label, i) => {
        const n = i + 1;
        const state = n === step ? "current" : n < step ? "done" : "todo";
        const bg = state === "current" ? colors.navy : state === "done" ? "#E6F4EC" : colors.white;
        const fg = state === "current" ? colors.white : state === "done" ? "#1E8E5A" : colors.inkSubtle;
        return (
          <Text key={label} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, overflow: "hidden", borderWidth: 1,
            borderColor: state === "current" ? colors.navy : colors.line, backgroundColor: bg, color: fg, fontSize: 11, fontWeight: "600" }}>
            {n}. {label}
          </Text>
        );
      })}
    </View>
  );
}

function Stepper({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6}
      style={{ width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center", backgroundColor: colors.white }}>
      <Text style={{ fontSize: 14, color: colors.inkMuted }}>{label}</Text>
    </Pressable>
  );
}

function StaffFields({ legend, value, onChange }: { legend: string; value: Staff; onChange: (s: Staff) => void }) {
  const set = (k: keyof Staff) => (v: string) => onChange({ ...value, [k]: v });
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink }}>{legend}</Text>
      <Field label="Full name" value={value.name} onChangeText={set("name")} />
      <Field label="Phone" value={value.phone} onChangeText={set("phone")} placeholder="10 digits" keyboardType="phone-pad" />
      <Field label="Email (optional)" value={value.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Password" value={value.password} onChangeText={set("password")} placeholder="At least 6 characters" autoCapitalize="none" autoCorrect={false} />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View style={{ width: "48%", flexGrow: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 10 }}>
      <Text style={{ fontSize: 10, fontWeight: "700", color: colors.inkSubtle, textTransform: "uppercase" }}>{label}</Text>
      <Text style={{ fontSize: 18, fontWeight: "700", color: colors.ink }}>{value}</Text>
    </View>
  );
}
