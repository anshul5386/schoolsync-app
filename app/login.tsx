import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { PasswordField } from "../src/ui";
import { useAuth } from "../src/auth/AuthContext";
import { loginWithPassword, selectStudent } from "../src/api/auth";
import { extractLoginPayload, loginErrorMessage, type StudentLoginOption } from "../src/api/loginAuth";
import { errorMessage } from "../src/api/client";
import { isApiConfigured, API_BASE_URL } from "../src/config";
import { colors } from "../src/theme";

export default function LoginScreen() {
  const { applySession } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [studentPick, setStudentPick] = useState<{
    selectionToken: string;
    studentOptions: StudentLoginOption[];
  } | null>(null);

  const finishLogin = async (auth: Parameters<typeof applySession>[0]) => {
    await applySession(auth);
    router.replace("/");
  };

  const signIn = async () => {
    setError("");
    setStudentPick(null);
    if (!isApiConfigured) {
      setError("Set EXPO_PUBLIC_API_BASE_URL in .env (no /api suffix).");
      return;
    }
    setBusy(true);
    try {
      const res = await loginWithPassword(phone.trim(), password);
      const payload = extractLoginPayload(res);
      if (payload.kind === "selectStudent") {
        setStudentPick({ selectionToken: payload.selectionToken, studentOptions: payload.studentOptions });
        return;
      }
      await finishLogin(payload.auth);
    } catch (e) {
      setError(loginErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmStudent = async (userId: string) => {
    if (!studentPick) return;
    setError("");
    setBusy(true);
    try {
      const res = await selectStudent(studentPick.selectionToken, userId);
      const auth = res.data?.data;
      if (!auth?.token) throw new Error("Sign-in failed");
      await finishLogin(auth);
    } catch (e) {
      setError(errorMessage(e, "Could not sign in as that student."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={s.page} edges={["top", "bottom", "left", "right"]}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <View style={s.card}>
        <Text style={s.brand}>Easool</Text>
        <Text style={s.sub}>Sign in to your school account</Text>

        {!studentPick ? (
          <>
            <Text style={s.label}>UserName</Text>
            <TextInput style={s.input} value={phone} onChangeText={setPhone} keyboardType="default"
              autoCapitalize="characters" autoComplete="username" placeholder="QA-SCH-001-STU-0001" placeholderTextColor={colors.inkSubtle} />

            <PasswordField label="Password" value={password} onChangeText={setPassword}
              autoComplete="password" placeholder="Password" hint="Tap Show to check what you typed" />

            {!!error && <Text style={s.error}>{error}</Text>}

            <Pressable onPress={signIn} disabled={busy || !phone || !password}
              style={[s.button, (busy || !phone || !password) && { opacity: 0.5 }]}>
              <Text style={s.buttonText}>{busy ? "Signing in…" : "Sign in"}</Text>
            </Pressable>

            <Pressable onPress={() => router.push("/register")} style={{ marginTop: 16, alignItems: "center" }}>
              <Text style={{ color: colors.navy, fontSize: 13, fontWeight: "600" }}>New here? Request an account</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={[s.sub, { marginBottom: 12 }]}>Several students use this number. Who is signing in?</Text>
            {studentPick.studentOptions.map((opt) => (
              <Pressable key={opt.userId} onPress={() => confirmStudent(opt.userId)} disabled={busy}
                style={[s.studentBtn, busy && { opacity: 0.6 }]}>
                <Text style={{ fontWeight: "700", color: colors.ink }}>{opt.name}</Text>
                <Text style={{ fontSize: 12, color: colors.inkMuted }}>
                  {[opt.schoolName, opt.classLabel].filter(Boolean).join(" · ")}
                </Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setStudentPick(null)} style={{ marginTop: 12 }}>
              <Text style={{ textAlign: "center", color: colors.inkMuted, fontSize: 13 }}>Back</Text>
            </Pressable>
            {!!error && <Text style={s.error}>{error}</Text>}
          </>
        )}

        {__DEV__ && (
          <Text style={{ marginTop: 20, fontSize: 10, color: colors.inkSubtle, textAlign: "center" }}>
            API: {API_BASE_URL}
          </Text>
        )}
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24, paddingVertical: 32 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: colors.line },
  brand: { fontSize: 26, fontWeight: "800", color: colors.ink, textAlign: "center" },
  sub: { fontSize: 14, color: colors.inkMuted, textAlign: "center", marginTop: 4, marginBottom: 20 },
  label: { fontSize: 11, fontWeight: "600", color: colors.inkSubtle, marginBottom: 4, textTransform: "uppercase" },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 15 },
  button: { backgroundColor: colors.navy, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  buttonText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  studentBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 14, marginBottom: 8, backgroundColor: colors.canvas },
  error: { color: colors.danger, fontSize: 13, marginTop: 8 },
});
