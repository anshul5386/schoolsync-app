import { useEffect, useState } from "react";
import { Text } from "react-native";
import { Stack } from "expo-router";
import { getProfile } from "../src/api/profile";
import { getWhatsappSettings } from "../src/api/whatsapp";
import { errorMessage } from "../src/api/client";
import { useAuth } from "../src/auth/AuthContext";
import { unwrap } from "../src/lib/useLoad";
import { API_BASE_URL } from "../src/config";
import { Card, Loading, Message, Row, Screen, Title } from "../src/ui";
import { colors } from "../src/theme";

function Item({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <Row style={{ justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <Text style={{ fontSize: 12, color: colors.inkSubtle }}>{label}</Text>
      <Text selectable style={{ flexShrink: 1, textAlign: "right", fontSize: 12, fontWeight: "600",
        color: mono ? colors.inkSubtle : colors.ink, fontFamily: mono ? "monospace" : undefined }}>{value ?? "—"}</Text>
    </Row>
  );
}

export default function ProfileScreen() {
  const { user, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [whatsapp, setWhatsapp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getProfile();
      setProfile(unwrap(res));
      try {
        const wa = await getWhatsappSettings();
        setWhatsapp(unwrap(wa));
      } catch {
        setWhatsapp(null);
      }
      await refreshProfile();
    } catch (e) {
      setError(errorMessage(e, "Could not load profile."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const schoolLabel = user?.schoolName || profile?.schoolName;

  return (
    <Screen onRefresh={load}>
      <Stack.Screen options={{ title: "My profile" }} />
      <Title sub={schoolLabel || "Your school"}>{user?.name}</Title>
      {!!error && <Message m={{ type: "error", text: error }} />}
      {loading ? <Loading /> : (
        <>
          <Card title="Account">
            <Item label="Name" value={profile?.name || user?.name} />
            <Item label="Role" value={profile?.role || user?.role} />
            <Item label="Phone" value={profile?.phone} />
            <Item label="Email" value={profile?.email} />
            <Item label="School" value={schoolLabel} />
          </Card>

          {profile?.student && (
            <Card title="Student">
              <Item label="Class" value={profile.student.classLabel} />
              <Item label="Roll number" value={String(profile.student.rollNumber ?? "")} />
              <Item label="Father" value={profile.student.fatherName} />
              <Item label="Mother" value={profile.student.motherName} />
              <Item label="Parent phone" value={profile.student.parentPhone} />
            </Card>
          )}

          {profile?.teacher && (
            <Card title="Teaching">
              <Item label="Subjects" value={(profile.teacher.subjects || []).join(", ")} />
            </Card>
          )}

          <Card title="App">
            <Item label="API" value={API_BASE_URL} mono />
            <Item label="Version" value="1.1.0-pilot" />
            <Item label="WhatsApp" value={
              whatsapp?.whatsappEnabled ? "Enabled for your school" : "Off — enable in Menu → WhatsApp"
            } />
          </Card>
        </>
      )}
    </Screen>
  );
}
