import { Text } from "react-native";
import { Stack } from "expo-router";
import { Card, Row, Screen, Title } from "../src/ui";
import { useAuth } from "../src/auth/AuthContext";
import { colors } from "../src/theme";

function Item({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <Row style={{ justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <Text style={{ fontSize: 12, color: colors.inkSubtle }}>{label}</Text>
      <Text selectable style={{ flexShrink: 1, textAlign: "right", fontSize: 12, fontWeight: "600",
        color: mono ? colors.inkSubtle : colors.ink, fontFamily: mono ? "monospace" : undefined }}>{value ?? ""}</Text>
    </Row>
  );
}

export default function ProfileScreen() {
  const { user } = useAuth();
  return (
    <Screen>
      <Stack.Screen options={{ title: "My profile" }} />
      <Title sub="Your account details">My profile</Title>

      <Card title="Personal details">
        <Item label="Name" value={user?.name} />
        <Item label="Role" value={user?.role} />
        <Item label="School ID" value={user?.schoolId} mono />
        <Item label="User ID" value={user?.userId} mono />
      </Card>

      {user?.role === "STUDENT" && (
        <Card title="Parent / guardian details">
          <Text style={{ fontSize: 12, color: colors.inkSubtle, backgroundColor: colors.canvas, padding: 10, borderRadius: 8 }}>
            Parents receive WhatsApp alerts for absences, assignment dues, and exam results. No separate login needed.
          </Text>
          <Item label="Father" value="(loaded from student profile)" />
          <Item label="Phone" value="(loaded from student profile)" />
          <Item label="Mother" value="(loaded from student profile)" />
        </Card>
      )}

      <Card title="App info">
        <Item label="Version" value="1.0.0-MVP" />
        <Item label="Build" value="Week 5" />
        <Item label="WhatsApp" value="Pending setup" />
        <Item label="Notifications" value="In-app (active)" />
      </Card>
    </Screen>
  );
}
