import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  getSchoolClasses, renameSchoolClass, activateSchool, deactivateSchool, getDeletionPreview, deleteSchool,
} from "../../../src/api/schoolOnboarding";
import { errorMessage } from "../../../src/api/client";
import { useAuth } from "../../../src/auth/AuthContext";
import { useLoad, unwrap } from "../../../src/lib/useLoad";
import { ALL_GRADES, gradeLabel, compareClasses } from "../../../src/lib/grade";
import { Button, Card, Chip, Empty, Field, Loading, Message, Row, Screen, Select, Title } from "../../../src/ui";
import { colors } from "../../../src/theme";

/**
 * One school, as a super admin works on it after onboarding: naming sections (routine and safe),
 * and deleting the school (the danger zone, last and separated). Delete controls only render once
 * the preview has loaded, so the counts are on screen before any control that could destroy them.
 */
export default function SchoolDetailScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { schoolId: rawId } = useLocalSearchParams<{ schoolId: string }>();
  const schoolId = String(rawId ?? "");

  const { data, loading, error, reload } = useLoad(async () => {
    const [c, p] = await Promise.all([getSchoolClasses(schoolId), getDeletionPreview(schoolId)]);
    return { classes: unwrap<any[]>(c) || [], preview: unwrap<any>(p) };
  }, [schoolId]);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGrade, setEditGrade] = useState("");
  const [editSection, setEditSection] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [deleteArmed, setDeleteArmed] = useState(false);

  const classes: any[] = data?.classes ?? [];
  const preview: any = data?.preview ?? null;
  const sorted = useMemo(() => [...classes].sort(compareClasses), [classes]);

  const run = async (fn: () => Promise<any>, ok: string): Promise<boolean> => {
    setBusy(true); setMessage(null);
    try {
      const res = await fn();
      setMessage({ type: "success", text: res?.data?.message || ok });
      await reload();
      return true;
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "That did not work.") });
      return false;
    } finally { setBusy(false); }
  };

  const onRename = async (id: string) => {
    const ok = await run(() => renameSchoolClass(schoolId, id, editGrade, editSection), "Class updated.");
    if (ok) setEditingId(null);
  };

  const onDelete = async () => {
    setBusy(true); setMessage(null);
    try {
      const res = await deleteSchool(schoolId, confirmName);
      // Navigate away: the school this screen is about no longer exists, so reloading would fail.
      router.replace({ pathname: "/super-admin/schools", params: { flash: res?.data?.message || "School deleted." } });
    } catch (err) {
      setMessage({ type: "error", text: errorMessage(err, "The school was not deleted.") });
      setBusy(false);
    }
  };

  if (user?.role !== "SUPER_ADMIN") return <Screen><Empty>Not available for your role.</Empty></Screen>;

  const nameMatches = !!preview && confirmName.trim() === preview.name;

  return (
    <Screen onRefresh={reload}>
      <Stack.Screen options={{ title: preview?.name || "School" }} />
      {loading && !data ? <Loading /> : (
        <>
          <Title sub={preview ? `${preview.subdomain} · ${preview.userCount} accounts · ${preview.studentCount} students · ${preview.classCount} classes` : undefined}>
            {preview?.name || "School"}
          </Title>
          {!!error && !message && <Message m={{ type: "error", text: error }} />}
          <Message m={message} />

          <Card title="Classes & section names">
            <Text style={{ fontSize: 11, color: colors.inkSubtle }}>
              Onboarding creates A, B, C. Rename them to whatever this school calls them — Rose, Tagore, Blue.
              Renaming only changes the label; attendance and results are unaffected.
            </Text>
            {sorted.length === 0 ? (
              <Empty>No classes yet. Add them from the onboarding wizard first.</Empty>
            ) : sorted.map((row) => (
              <View key={row.id} style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8, gap: 8 }}>
                {editingId === row.id ? (
                  <>
                    <Select label="Grade" value={editGrade} onChange={setEditGrade}
                      options={ALL_GRADES.map((g) => ({ value: g, label: gradeLabel(g) }))} />
                    <Field label="Section name" value={editSection} maxLength={20} onChangeText={setEditSection} placeholder="Section name" />
                    <Row>
                      <View style={{ flex: 1 }}><Button small busy={busy} onPress={() => onRename(row.id)}>Save</Button></View>
                      <View style={{ flex: 1 }}><Button small variant="secondary" onPress={() => setEditingId(null)}>Cancel</Button></View>
                    </Row>
                  </>
                ) : (
                  <Row style={{ justifyContent: "space-between" }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink }}>{row.label}</Text>
                      <Text style={{ fontSize: 11, color: colors.inkSubtle }}>{row.studentCount} students</Text>
                      {!row.active && <Chip tone="grey">Retired</Chip>}
                    </View>
                    <Button small variant="secondary"
                      onPress={() => { setEditingId(row.id); setEditGrade(row.grade); setEditSection(row.section); }}>Rename</Button>
                  </Row>
                )}
              </View>
            ))}
          </Card>

          <Card title="Delete this school" style={{ borderColor: "#F0B8B2", marginTop: 16 }}>
            <Text style={{ fontSize: 11, color: colors.danger }}>
              This is a soft delete: the school is marked inactive and hidden from normal use. Nothing is
              destroyed, and a super admin can restore it at any time.
            </Text>
            {preview && (
              <View style={{ gap: 2, marginVertical: 6 }}>
                <Text style={{ fontSize: 12, color: colors.inkMuted }}>{preview.userCount} user accounts</Text>
                <Text style={{ fontSize: 12, color: colors.inkMuted }}>{preview.studentCount} student records</Text>
                <Text style={{ fontSize: 12, color: colors.inkMuted }}>{preview.classCount} classes</Text>
              </View>
            )}

            {preview && preview.active === false ? (
              <>
                <Text style={{ fontSize: 12, color: colors.inkMuted }}>
                  This school is already inactive. Restore it to bring it back into normal use.
                </Text>
                <Button variant="secondary" disabled={busy} onPress={() => run(() => activateSchool(schoolId), "School restored.")}>
                  Restore school
                </Button>
              </>
            ) : preview ? (
              <>
                {!deleteArmed && <Button variant="danger" onPress={() => setDeleteArmed(true)}>Delete school</Button>}
                {deleteArmed && (
                  <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10 }}>
                    <Field label={`Type ${preview.name} to confirm`} value={confirmName} onChangeText={setConfirmName}
                      autoCapitalize="none" autoCorrect={false} autoComplete="off" />
                    <Button variant="danger" busy={busy} disabled={!nameMatches} onPress={onDelete}>Delete this school</Button>
                    <Button variant="secondary" onPress={() => { setDeleteArmed(false); setConfirmName(""); }}>Cancel</Button>
                  </View>
                )}
              </>
            ) : null}
          </Card>
        </>
      )}
    </Screen>
  );
}
