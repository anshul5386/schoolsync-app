import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../../src/auth/AuthContext";
import { colors } from "../../src/theme";

export default function AccountScreen() {
  const { user, logout } = useAuth();
  return (
    <View style={s.page}>
      <Text style={s.name}>{user?.name}</Text>
      <Text style={s.role}>{user?.role}</Text>
      <Pressable onPress={logout} style={s.button}>
        <Text style={s.buttonText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, padding: 24, backgroundColor: colors.canvas },
  name: { fontSize: 20, fontWeight: "600", color: colors.ink },
  role: { fontSize: 13, color: colors.inkMuted, marginTop: 2, marginBottom: 24 },
  button: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  buttonText: { color: colors.danger, fontWeight: "600" },
});
