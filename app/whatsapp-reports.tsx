import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Stack } from "expo-router";
import { getMyClasses } from "../src/api/classes";
import {
  getWhatsappLog,
  getWhatsappSettings,
  patchWhatsappSettings,
  sendMonthlyAttendanceReport,
} from "../src/api/whatsapp";
import { errorMessage } from "../src/api/client";
import { useAuth } from "../src/auth/AuthContext";
import { useLoad, unwrap } from "../src/lib/useLoad";
import { Button, Card, Empty, Loading, Message, Screen, Select, Title } from "../src/ui";
import { colors } from "../src/theme";

type Msg = { type: "success" | "error"; text: string } | null;
type WhatsappSettings = {
  whatsappEnabled: boolean;
  whatsappSentThisMonth: number;
  lastMonthlyReportAt?: string | null;
};

export default function WhatsappReportsScreen() {
  const { user } = useAuth();
  const canManage = user?.role === "PRINCIPAL" || user?.role === "SCHOOL_ADMIN";
  const [message, setMessage] = useState<Msg>(null);
  const [classId, setClassId] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [busy, setBusy] = useState(false);

  const settingsQ = useLoad(() => getWhatsappSettings().then((r) => unwrap<WhatsappSettings>(r)), []);
  const logQ = useLoad(() => getWhatsappLog(20).then((r) => unwrap<any[]>(r) || []), []);
  const classesQ = useLoad(() => getMyClasses().then((r) => unwrap<any[]>(r) || []), []);

  if (user && !["PRINCIPAL", "SCHOOL_ADMIN", "COORDINATOR"].includes(user.role)) {
    return <Screen><Stack.Screen options={{ title: "WhatsApp" }} /><Empty>Not available for your role.</Empty></Screen>;
  }

  const settings = settingsQ.data;
  const log = logQ.data ?? [];
  const classes = classesQ.data ?? [];

  const toggle = async () => {
    if (!canManage || !settings) return;
    setBusy(true);
    try {
      await patchWhatsappSettings({ whatsappEnabled: !settings.whatsappEnabled });
      setMessage({ type: "success", text: "Settings saved." });
      await settingsQ.reload();
    } catch (e) {
      setMessage({ type: "error", text: errorMessage(e, "Save failed.") });
    } finally {
      setBusy(false);
    }
  };

  const sendReport = async () => {
    setBusy(true);
    try {
      await sendMonthlyAttendanceReport({
        classSectionId: classId || undefined,
        year: year ? parseInt(year, 10) : undefined,
        month: month ? parseInt(month, 10) : undefined,
      });
      setMessage({ type: "success", text: "Monthly reports queued." });
      await logQ.reload();
    } catch (e) {
      setMessage({ type: "error", text: errorMessage(e, "Send failed.") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen onRefresh={async () => { await settingsQ.reload(); await logQ.reload(); }}>
      <Stack.Screen options={{ title: "WhatsApp" }} />
      <Title sub="Parent alerts and monthly attendance">WhatsApp</Title>
      <Message m={message} />
      {settingsQ.loading ? <Loading /> : (
        <>
          <Card title="School status">
            <Text style={{ fontSize: 13, color: colors.ink }}>
              {settings?.whatsappEnabled ? "Enabled" : "Disabled"}
            </Text>
            <Text style={{ fontSize: 12, color: colors.inkMuted, marginTop: 4 }}>
              {settings?.whatsappSentThisMonth ?? 0} sent this month
            </Text>
            {canManage && (
              <View style={{ marginTop: 8 }}>
                <Button small variant="secondary" onPress={toggle} disabled={busy}>
                  {settings?.whatsappEnabled ? "Turn off" : "Turn on"}
                </Button>
              </View>
            )}
          </Card>

          <Card title="Send monthly report">
            <Select label="Class" value={classId} onChange={setClassId} placeholder="Whole school"
              options={[{ value: "", label: "Whole school" }, ...classes.map((c) => ({
                value: c.id, label: `Class ${c.grade}-${c.section}`,
              }))]} />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <TextInput placeholder="Year" value={year} onChangeText={setYear} keyboardType="number-pad"
                style={{ flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 8 }} />
              <TextInput placeholder="Month" value={month} onChangeText={setMonth} keyboardType="number-pad"
                style={{ flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 8 }} />
            </View>
            <View style={{ marginTop: 12 }}>
              <Button onPress={sendReport} disabled={busy || !settings?.whatsappEnabled}>
                Send now
              </Button>
            </View>
          </Card>

          <Card title="Recent log">
            {log.length === 0 ? <Text style={{ fontSize: 12, color: colors.inkMuted }}>No activity yet.</Text> : null}
            {log.map((row) => (
              <Text key={row.id} style={{ fontSize: 12, color: colors.ink, marginBottom: 6 }}>
                {row.templateName} · {row.status} · {row.recipientPhone}
              </Text>
            ))}
          </Card>
        </>
      )}
    </Screen>
  );
}
