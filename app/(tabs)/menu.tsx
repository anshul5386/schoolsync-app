import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/auth/AuthContext";
import { menuFor } from "../../src/menu";
import { Button, Card, Screen, Title } from "../../src/ui";
import { colors } from "../../src/theme";

/** Everything the signed-in role may open, mirroring the website's sidebar and route guards. */
export default function MenuScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  return (
    <Screen>
      <Title sub={user?.role?.replace(/_/g, " ")}>{user?.name}</Title>
      {menuFor(user?.role).map((m) => (
        <Card key={m.path} onPress={() => router.push(m.path as any)}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.ink }}>{m.title}</Text>
              <Text style={{ fontSize: 12, color: colors.inkMuted, marginTop: 2 }}>{m.desc}</Text>
            </View>
            <Text style={{ color: colors.inkSubtle, fontSize: 18 }}>›</Text>
          </View>
        </Card>
      ))}
      <Button variant="danger" onPress={logout}>Sign out</Button>
    </Screen>
  );
}
