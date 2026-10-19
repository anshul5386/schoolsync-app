import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../src/auth/AuthContext";
import { errorMessage } from "../src/api/client";
import { isApiConfigured } from "../src/config";
import { colors } from "../src/theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!isApiConfigured) {
      setError("The app is not connected to the server yet. Set EXPO_PUBLIC_API_BASE_URL.");
      return;
    }
    setBusy(true);
    try {
      await login(phone.trim(), password);
    } catch (e: any) {
      setError(errorMessage(e, "Login failed. Check your phone number and password."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={s.card}>
        <Text style={s.brand}>Easool</Text>
        <Text style={s.sub}>Sign in to your school account</Text>

        <Text style={s.label}>Phone number</Text>
        <TextInput style={s.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad"
          autoComplete="tel" placeholder="10-digit mobile number" placeholderTextColor={colors.inkSubtle} />

        <Text style={s.label}>Password</Text>
        <TextInput style={s.input} value={password} onChangeText={setPassword} secureTextEntry
          autoComplete="password" placeholder="Password" placeholderTextColor={colors.inkSubtle} />

        {!!error && <Text style={s.error}>{error}</Text>}

        <Pressable onPress={submit} disabled={busy || !phone || !password}
          style={[s.button, (busy || !phone || !password) && { opacity: 0.5 }]}>
          <Text style={s.buttonText}>{busy ? "Signing in…" : "Sign in"}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas, justifyContent: "center", padding: 20 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: colors.line },
  brand: { fontSize: 28, fontWeight: "700", color: colors.navy },
  sub: { fontSize: 14, color: colors.inkMuted, marginTop: 4, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: "600", color: colors.inkMuted, marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 15, color: colors.ink, backgroundColor: colors.canvas },
  error: { marginTop: 12, padding: 10, borderRadius: 8, backgroundColor: colors.dangerSoft, color: colors.danger, fontSize: 13 },
  button: { marginTop: 20, backgroundColor: colors.navy, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  buttonText: { color: colors.white, fontWeight: "600", fontSize: 15 },
});
