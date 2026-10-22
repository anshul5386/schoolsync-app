import { useState } from "react";
import { Text, View } from "react-native";
import { Stack } from "expo-router";
import { useAuth } from "../src/auth/AuthContext";
import { getRequests, approveRequest, rejectRequest } from "../src/api/registrations";
import { errorMessage } from "../src/api/client";
import { useLoad, unwrap } from "../src/lib/useLoad";
import { Screen, Title, Card, Chip, Button, Field, Message, Loading, Empty, Row, Tabs2, confirm, prettyDate } from "../src/ui";
import { colors } from "../src/theme";

const TABS = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];
const tone = { PENDING: "amber", APPROVED: "green", REJECTED: "danger" } as const;

/** Serves school admins/principals and super admins; the backend returns the right scope. */
export default function ApprovalsScreen() {
  const { user } = useAuth();
  const isSuper = user?.role === "SUPER_ADMIN";
  const [tab, setTab] = useState("PENDING");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const { data, loading, error, reload } = useLoad<any[]>(
    () => getRequests(tab).then((r) => unwrap<any[]>(r) ?? []), [tab]);

  const allowed = user?.role === "PRINCIPAL" || user?.role === "SCHOOL_ADMIN" || isSuper;
  const title = isSuper ? "All account requests" : "Account requests";
  const header = <Stack.Screen options={{ title }} />;

  if (!allowed) return <Screen>{header}<Empty>Not available for your role.</Empty></Screen>;

  const onApprove = async (row: any) => {
    const classNote = row.requestedRole === "STUDENT" && row.classLabel ? ` into ${row.classLabel}` : "";
    if (!(await confirm("Approve request",
      `Approve ${row.name} as ${row.requestedRole}${classNote}? They will be able to sign in immediately.`, "Approve"))) return;
    setBusyId(row.id); setActionError("");
    try { await approveRequest(row.id); await reload(); }
    catch (e) { setActionError(errorMessage(e, "Could not approve.")); }
    finally { setBusyId(null); }
  };

  const onReject = async (row: any) => {
    setBusyId(row.id); setActionError("");
    try {
      await rejectRequest(row.id, reason.trim() || null);
      setRejecting(null); setReason("");
      await reload();
    } catch (e) { setActionError(errorMessage(e, "Could not reject.")); }
    finally { setBusyId(null); }
  };

  const rows = data ?? [];
  const sub = isSuper
    ? "Every school's pending staff and student registrations."
    : "People asking to join your school. Approving creates their account.";

  return (
    <Screen onRefresh={reload}>
      {header}
      <Title sub={sub}>{title}</Title>
      <Tabs2 tabs={TABS} value={tab} onChange={(v) => { setTab(v); setRejecting(null); setReason(""); }} />
      {!!error && <Message m={{ type: "error", text: error }} />}
      {!!actionError && <Message m={{ type: "error", text: actionError }} />}
      {loading && !data ? <Loading /> : rows.length === 0 && !error ? (
        <Empty>No {tab.toLowerCase()} requests.</Empty>
      ) : rows.map((r) => (
        <Card key={r.id}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }}>{r.name}</Text>
          {!!r.email && <Text style={{ fontSize: 12, color: colors.inkSubtle }}>{r.email}</Text>}
          <Text style={{ fontSize: 13, color: colors.inkMuted }}>{r.phone}</Text>
          {isSuper && <Text style={{ fontSize: 13, color: colors.inkMuted }}>School: {r.schoolName || "—"}</Text>}
          <Row style={{ flexWrap: "wrap" }}>
            <Chip tone="grey">{r.requestedRole}</Chip>
            <Chip tone={tone[r.status as keyof typeof tone] ?? "grey"}>{r.status}</Chip>
          </Row>
          {r.requestedRole === "STUDENT" && (
            <Text style={{ fontSize: 12, color: colors.inkSubtle }}>{r.classLabel || "Class not recorded"}</Text>
          )}
          <Text style={{ fontSize: 11, color: colors.inkSubtle }}>Requested {r.createdAt ? prettyDate(r.createdAt) : "—"}</Text>
          {r.status === "REJECTED" && !!r.rejectionReason && (
            <Text style={{ fontSize: 12, color: colors.inkSubtle }}>{r.rejectionReason}</Text>
          )}
          {tab === "PENDING" && (rejecting === r.id ? (
            <View style={{ gap: 8, marginTop: 6 }}>
              <Field label={`Reject ${r.name}? Reason (optional)`} value={reason} onChangeText={setReason} />
              <Row>
                <View style={{ flex: 1 }}><Button variant="danger" busy={busyId === r.id} onPress={() => onReject(r)}>Reject</Button></View>
                <View style={{ flex: 1 }}><Button variant="secondary" disabled={busyId === r.id} onPress={() => { setRejecting(null); setReason(""); }}>Cancel</Button></View>
              </Row>
            </View>
          ) : (
            <Row style={{ marginTop: 6 }}>
              <View style={{ flex: 1 }}><Button disabled={busyId === r.id} onPress={() => onApprove(r)}>Approve</Button></View>
              <View style={{ flex: 1 }}><Button variant="secondary" disabled={busyId === r.id} onPress={() => { setRejecting(r.id); setReason(""); }}>Reject</Button></View>
            </Row>
          ))}
        </Card>
      ))}
    </Screen>
  );
}
