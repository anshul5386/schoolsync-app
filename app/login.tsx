import { useState } from "react";
import {
  KeyboardAvoidingView, Platform, Pressable, StatusBar,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../src/auth/AuthContext";
import { errorMessage } from "../src/api/client";
import { isApiConfigured } from "../src/config";
import { colors } from "../src/theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const canSubmit = phone.trim().length === 10 && password.length >= 6;

  const submit = async () => {
    setError("");
    if (!isApiConfigured) {
      setError("App is not connected to the server.\nSet EXPO_PUBLIC_API_BASE_URL in your .env.");
      return;
    }
    setBusy(true);
    try {
      await login(phone.trim(), password);
    } catch (e: any) {
      setError(errorMessage(e, "Sign in failed. Check your number and password."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />

      {/* ── Navy hero ──────────────────────────────────────────── */}
      <View style={s.hero}>
        <View style={s.wordmarkRow}>
          <View style={s.logoIcon}>
            <Text style={s.logoLetter}>E</Text>
          </View>
          <Text style={s.brand}>Easool</Text>
        </View>
        <Text style={s.tagline}>
          School ops, simplified.{"\n"}Built for Indian classrooms.
        </Text>
      </View>

      {/* ── White card ─────────────────────────────────────────── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.cardWrap}
      >
        <View style={s.card}>
          <Text style={s.cardHeading}>Welcome back</Text>
          <Text style={s.cardSub}>Sign in to your school account</Text>

          {/* Phone */}
          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>Phone number</Text>
            <View style={s.inputRow}>
              <Text style={s.prefix}>+91</Text>
              <TextInput
                style={[s.input, s.inputFlex]}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.inkSubtle}
                autoComplete="tel"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Password */}
          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>Password</Text>
            <View style={s.inputRow}>
              <TextInput
                style={[s.input, s.inputFlex]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                placeholder="Your password"
                placeholderTextColor={colors.inkSubtle}
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={canSubmit && !busy ? submit : undefined}
              />
              <Pressable onPress={() => setShowPass((v) => !v)} hitSlop={12} style={s.eyeBtn}>
                <Text style={s.eyeIcon}>{showPass ? "🙈" : "👁"}</Text>
              </Pressable>
            </View>
          </View>

          {/* Error */}
          {!!error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {/* Sign-in button */}
          <Pressable
            onPress={submit}
            disabled={!canSubmit || busy}
            style={({ pressed }) => [
              s.signInBtn,
              (!canSubmit || busy) && { opacity: 0.5 },
              pressed && canSubmit && { opacity: 0.85 },
            ]}
          >
            <Text style={s.signInText}>
              {busy ? "Signing in…" : "Sign in"}
            </Text>
          </Pressable>

          {/* Register link */}
          <Pressable
            onPress={() => router.push("/register")}
            style={{ marginTop: 18, alignItems: "center" }}
          >
            <Text style={s.registerLink}>
              New here?{" "}
              <Text style={{ color: colors.navy, fontWeight: "700" }}>
                Request an account
              </Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: colors.navy },
  hero:        { flex: 1, justifyContent: "center", paddingHorizontal: 28, paddingBottom: 20 },
  wordmarkRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  logoIcon:    {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center",
  },
  logoLetter:  { fontSize: 22, fontWeight: "800", color: colors.white },
  brand:       { fontSize: 32, fontWeight: "800", color: colors.white, letterSpacing: -1 },
  tagline:     { fontSize: 15.5, color: "rgba(255,255,255,0.72)", lineHeight: 23 },

  cardWrap: { justifyContent: "flex-end" },
  card: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: Platform.OS === "ios" ? 44 : 28,
  },
  cardHeading: { fontSize: 22, fontWeight: "700", color: colors.ink, letterSpacing: -0.4 },
  cardSub:     { fontSize: 14, color: colors.inkMuted, marginTop: 4, marginBottom: 22 },

  fieldWrap:   { marginBottom: 14 },
  fieldLabel:  { fontSize: 11, fontWeight: "700", color: colors.inkMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  inputRow:    { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.canvas },
  input:       { paddingHorizontal: 13, paddingVertical: 13, fontSize: 15.5, color: colors.ink },
  inputFlex:   { flex: 1 },
  prefix:      { paddingLeft: 13, paddingRight: 6, fontSize: 15.5, color: colors.inkMuted, fontWeight: "600" },
  eyeBtn:      { paddingHorizontal: 13 },
  eyeIcon:     { fontSize: 16 },

  errorBox:    { padding: 12, borderRadius: 10, backgroundColor: colors.dangerSoft, marginBottom: 12 },
  errorText:   { fontSize: 13, color: colors.danger, lineHeight: 18 },

  signInBtn:   { backgroundColor: colors.navy, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  signInText:  { color: colors.white, fontWeight: "700", fontSize: 16 },
  registerLink: { fontSize: 13.5, color: colors.inkMuted, textAlign: "center" },
});
