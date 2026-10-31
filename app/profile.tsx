import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { Card, Message, Row, Screen, Title } from "../src/ui";
import { useAuth } from "../src/auth/AuthContext";
import { getProfile, ProfileData } from "../src/api/profile";
import { errorMessage } from "../src/api/client";
import { colors } from "../src/theme";
import { initials } from "../src/lib/name";

function Item({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <Row style={s.item}>
      <Text style={s.label}>{label}</Text>
      <Text selectable style={[s.value, mono && s.mono]}>{value}</Text>
    </Row>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error,   setError]   = useState("");

  const load = useCallback(async () => {
    try {
      const res = await getProfile();
      setProfile(res.data?.data ?? null);
    } catch (e) {
      setError(errorMessage(e, "Could not load profile."));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const displayRole = (r?: string) =>
    r?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "";

  const roleBg: Record<string, string> = {
    PRINCIPAL: colors.navy,    COORDINATOR: colors.navy700, SCHOOL_ADMIN: colors.navy,
    TEACHER: colors.success,   STUDENT: colors.warning,
  };
  const avatarBg = roleBg[user?.role ?? ""] ?? colors.inkSubtle;

  return (
    <Screen>
      <Stack.Screen options={{ title: "My profile" }} />

      {/* Avatar hero */}
      <View style={s.hero}>
        <View style={[s.avatar, { backgroundColor: avatarBg }]}>
          <Text style={s.avatarText}>{initials(user?.name ?? profile?.name)}</Text>
        </View>
        <Text style={s.heroName}>{profile?.name ?? user?.name ?? "—"}</Text>
        <View style={s.rolePill}>
          <Text style={s.rolePillText}>{displayRole(user?.role)}</Text>
        </View>
        {profile?.schoolName && (
          <Text style={s.heroSub}>🏫 {profile.schoolName}</Text>
        )}
      </View>

      {!!error && <Message m={{ type: "error", text: error }} />}

      {/* Contact */}
      <Card title="Contact">
        <Item label="Phone" value={profile?.phone} />
        <Item label="Email" value={profile?.email} />
      </Card>

      {/* Student info */}
      {user?.role === "STUDENT" && (
        <Card title="Academic details">
          <Item label="Class" value={profile?.student?.classLabel} />
          <Item label="Roll No" value={profile?.student?.rollNumber?.toString()} />
        </Card>
      )}

      {user?.role === "STUDENT" && (
        <Card title="Parent / guardian">
          <Item label="Father" value={profile?.student?.fatherName} />
          <Item label="Father's phone" value={profile?.student?.fatherPhone} />
          <Item label="Mother" value={profile?.student?.motherName} />
          <Item label="Mother's phone" value={profile?.student?.motherPhone} />
          {!profile?.student?.fatherName && !profile?.student?.motherName && (
            <Text style={{ fontSize: 12.5, color: colors.inkMuted, lineHeight: 19 }}>
              Parent info is set by the school. Contact your administrator if something is wrong.
            </Text>
          )}
        </Card>
      )}

      {/* Account */}
      <Card title="Account">
        <Item label="User ID" value={user?.userId} mono />
        <Item label="School ID" value={user?.schoolId} mono />
      </Card>

      {/* App info */}
      <Card title="App">
        <Item label="Version" value="1.1.0" />
        <Item label="Notifications" value="In-app (active)" />
      </Card>

      {/* Sign out */}
      <Pressable
        onPress={logout}
        style={({ pressed }) => [s.signOutBtn, pressed && { opacity: 0.7 }]}
      >
        <Text style={s.signOutText}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

const s = StyleSheet.create({
  hero:         { alignItems: "center", paddingVertical: 24, gap: 6 },
  avatar:       { width: 68, height: 68, borderRadius: 99, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  avatarText:   { fontSize: 24, fontWeight: "800", color: colors.white },
  heroName:     { fontSize: 20, fontWeight: "700", color: colors.ink, letterSpacing: -0.3 },
  rolePill:     { backgroundColor: colors.navy50, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4 },
  rolePillText: { fontSize: 12, fontWeight: "700", color: colors.navy, textTransform: "uppercase", letterSpacing: 0.4 },
  heroSub:      { fontSize: 13, color: colors.inkMuted },
  item:         { justifyContent: "space-between", paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  label:        { fontSize: 12.5, color: colors.inkSubtle },
  value:        { flexShrink: 1, textAlign: "right", fontSize: 13, fontWeight: "600", color: colors.ink },
  mono:         { fontFamily: "monospace", color: colors.inkSubtle, fontSize: 11.5 },
  signOutBtn:   { margin: 4, padding: 16, backgroundColor: colors.dangerSoft, borderRadius: 14, alignItems: "center" },
  signOutText:  { fontSize: 15, fontWeight: "700", color: colors.danger },
});
