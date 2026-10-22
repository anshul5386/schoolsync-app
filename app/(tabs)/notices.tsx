import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, Switch, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { getNotices, publishNotice, pinNotice, unpinNotice, withdrawNotice, Notice } from "../../src/api/notices";
import { getMyClasses, ClassSection } from "../../src/api/classes";
import { errorMessage } from "../../src/api/client";
import { useAuth } from "../../src/auth/AuthContext";
import { Button, Card, Chip, DateField, Field, Loading, Message, Row, Select, Tabs2, Title, confirm, pretty } from "../../src/ui";
import { CATEGORY_COLOR, audienceLabel, relativeDate } from "../../src/components/NoticeStrip";
import { colors } from "../../src/theme";

const CATEGORIES = ["GENERAL", "ACADEMIC", "EVENT", "HOLIDAY", "URGENT"];
/** Matches SCHOOL_WIDE_PUBLISHERS on the server. */
const SCHOOL_WIDE_ROLES = ["PRINCIPAL", "SCHOOL_ADMIN", "COORDINATOR"];
const TONE: Record<string, "navy" | "danger" | "green" | "amber" | "grey"> = {
  URGENT: "danger", ACADEMIC: "navy", EVENT: "green", HOLIDAY: "amber", GENERAL: "grey",
};

type Msg = { type: "success" | "error"; text: string } | null;
type Item = { kind: "header"; key: string; label: string } | { kind: "notice"; key: string; n: Notice };

export default function NoticesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();
  const canPostSchoolWide = SCHOOL_WIDE_ROLES.includes(user?.role ?? "");
  const isTeacher = user?.role === "TEACHER";
  const canPost = canPostSchoolWide || isTeacher;

  const [notices, setNotices] = useState<Notice[]>([]);
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [composing, setComposing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Msg>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", body: "", category: "GENERAL",
    audience: canPostSchoolWide ? "SCHOOL_WIDE" : "CLASS",
    targetRole: "TEACHER", targetClassSectionId: "", pinned: false, expiresAt: "",
  });

  const load = useCallback(async () => {
    try {
      const res = await getNotices();
      setNotices(res.data?.data || []);
    } catch (e) {
      setMessage({ type: "error", text: errorMessage(e, "Could not load notices.") });
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  // A teacher may only address a class they teach, so the selector is populated from their own classes.
  useEffect(() => {
    if (!canPost) return;
    getMyClasses()
      .then((res) => {
        const rows: ClassSection[] = res.data?.data || [];
        setClasses(rows);
        if (rows.length > 0) setForm((f) => ({ ...f, targetClassSectionId: f.targetClassSectionId || rows[0].id }));
      })
      .catch(() => {});
  }, [canPost]);

  const filtered = useMemo(
    () => (filter === "ALL" ? notices : notices.filter((n) => n.category === filter)),
    [notices, filter]
  );

  const items: Item[] = useMemo(() => {
    const pinned = filtered.filter((n) => n.pinned);
    const rest = filtered.filter((n) => !n.pinned);
    const out: Item[] = [];
    if (pinned.length > 0) out.push({ kind: "header", key: "h-pinned", label: "Pinned" });
    pinned.forEach((n) => out.push({ kind: "notice", key: n.id, n }));
    if (pinned.length > 0 && rest.length > 0) out.push({ kind: "header", key: "h-earlier", label: "Earlier" });
    rest.forEach((n) => out.push({ kind: "notice", key: n.id, n }));
    return out;
  }, [filtered]);

  // From a notification: outline the notice it was about and scroll to it.
  const [listRef, setListRef] = useState<FlatList<Item> | null>(null);
  useEffect(() => {
    if (!highlight || loading) return;
    const idx = items.findIndex((it) => it.kind === "notice" && it.n.id === highlight);
    if (idx >= 0) {
      setFlash(highlight);
      listRef?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 });
    }
    router.setParams({ highlight: undefined });
  }, [highlight, loading, items, listRef, router]);

  const run = async (fn: () => Promise<unknown>, ok: string): Promise<boolean> => {
    setBusy(true); setMessage(null);
    try {
      await fn();
      setMessage({ type: "success", text: ok });
      await load();
      return true;
    } catch (e) {
      setMessage({ type: "error", text: errorMessage(e, "That did not work.") });
      return false;
    } finally { setBusy(false); }
  };

  const submit = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      setMessage({ type: "error", text: "A notice needs a title and a message." });
      return;
    }
    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      category: form.category,
      audience: form.audience,
      targetRole: form.audience === "ROLE" ? form.targetRole : null,
      targetClassSectionId: form.audience === "CLASS" ? form.targetClassSectionId : null,
      pinned: form.pinned,
      expiresAt: form.expiresAt || null,
    };
    const ok = await run(() => publishNotice(payload), "Notice published.");
    if (ok) {
      setForm((f) => ({ ...f, title: "", body: "", pinned: false, expiresAt: "" }));
      setComposing(false);
    }
  };

  /** The server lets staff edit any notice and a teacher only their own. */
  const canEdit = (n: Notice) => canPostSchoolWide || (!!n.authorId && n.authorId === user?.userId);

  const withdraw = async (n: Notice) => {
    if (await confirm("Withdraw notice", "Withdraw this notice? It disappears from the board.", "Withdraw", true)) {
      await run(() => withdrawNotice(n.id), "Notice withdrawn.");
    }
  };

  const subtitle = canPostSchoolWide
    ? "Announcements for the school. Pinned notices stay at the top."
    : isTeacher
      ? "Announcements for you, plus anything you post to your own classes."
      : "Announcements from your school and your class.";

  if (loading) return <Loading />;

  const header = (
    <View style={{ gap: 12, marginBottom: 4 }}>
      <Stack.Screen options={{ title: "Notice board" }} />
      <Title sub={subtitle}>Notice board</Title>
      {canPost && <Button onPress={() => setComposing((v) => !v)}>{composing ? "Close" : "Post a notice"}</Button>}
      <Message m={message} />

      {composing && canPost && (
        <Card>
          <Field label="Title" value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} />
          <Select label="Category" value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))}
            options={CATEGORIES.map((c) => ({ value: c, label: pretty(c) }))} />
          <Field label="Message" multiline value={form.body} onChangeText={(v) => setForm((f) => ({ ...f, body: v }))} />

          {canPostSchoolWide ? (
            <Select label="Send to" value={form.audience} onChange={(v) => setForm((f) => ({ ...f, audience: v }))}
              options={[
                { value: "SCHOOL_WIDE", label: "Whole school" },
                { value: "ROLE", label: "One role" },
                { value: "CLASS", label: "One class" },
              ]} />
          ) : (
            <Text style={{ fontSize: 13, color: colors.inkMuted, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.canvas }}>
              Sent to one of your classes
            </Text>
          )}

          {form.audience === "ROLE" && (
            <Select label="Role" value={form.targetRole} onChange={(v) => setForm((f) => ({ ...f, targetRole: v }))}
              options={["TEACHER", "STUDENT", "COORDINATOR", "SCHOOL_ADMIN", "PRINCIPAL"].map((r) => ({ value: r, label: pretty(r) }))} />
          )}

          {form.audience === "CLASS" && (
            <Select label="Class" value={form.targetClassSectionId} placeholder="No classes available"
              onChange={(v) => setForm((f) => ({ ...f, targetClassSectionId: v }))}
              options={classes.map((c) => ({ value: c.id, label: `Class ${c.grade}-${c.section}` }))} />
          )}

          <DateField label="Expires on" value={form.expiresAt} onChange={(v) => setForm((f) => ({ ...f, expiresAt: v }))}
            hint="Leave empty and it never expires" />

          <Row style={{ justifyContent: "space-between" }}>
            <Text style={{ fontSize: 13, color: colors.inkMuted, flex: 1 }}>Pin to the top of the board</Text>
            <Switch value={form.pinned} onValueChange={(v) => setForm((f) => ({ ...f, pinned: v }))} />
          </Row>

          <Button busy={busy} onPress={submit}>Publish notice</Button>
        </Card>
      )}

      <Tabs2 value={filter} onChange={setFilter}
        tabs={["ALL", ...CATEGORIES].map((c) => ({ value: c, label: c === "ALL" ? "All" : pretty(c) }))} />
    </View>
  );

  return (
    <FlatList
      ref={setListRef}
      style={{ backgroundColor: colors.canvas }}
      contentContainerStyle={{ padding: 16, gap: 10 }}
      data={items}
      keyExtractor={(it) => it.key}
      keyboardShouldPersistTaps="handled"
      onScrollToIndexFailed={() => {}}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => {
        setRefreshing(true); setMessage(null); await load(); setRefreshing(false);
      }} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <Card style={{ alignItems: "center", paddingVertical: 28 }}>
          <Text style={{ fontSize: 14.5, fontWeight: "700", color: colors.ink }}>Nothing on the board</Text>
          <Text style={{ fontSize: 13, color: colors.inkSubtle }}>
            {filter === "ALL" ? "No notices have been posted yet." : `No ${pretty(filter).toLowerCase()} notices.`}
          </Text>
        </Card>
      }
      renderItem={({ item }) => {
        if (item.kind === "header") {
          return <Text style={{ fontSize: 10.5, fontWeight: "700", color: colors.inkSubtle, textTransform: "uppercase" }}>{item.label}</Text>;
        }
        const n = item.n;
        return (
          <Card style={{
            borderLeftWidth: 4, borderLeftColor: CATEGORY_COLOR[n.category] ?? colors.line,
            ...(flash === n.id ? { borderColor: colors.navy, borderWidth: 2, borderLeftWidth: 4 } : {}),
          }}>
            <Row>
              <Chip tone={TONE[n.category] ?? "grey"}>{pretty(n.category)}</Chip>
              {!!n.pinned && <Text style={{ fontSize: 10, fontWeight: "700", color: "#B7791F" }}>PINNED</Text>}
            </Row>
            <Text style={{ fontSize: 15.5, fontWeight: "600", color: colors.ink }}>{n.title}</Text>
            <Text style={{ fontSize: 14, lineHeight: 20, color: colors.inkMuted }}>{n.body}</Text>
            <Text style={{ fontSize: 11.5, color: colors.inkSubtle }}>
              {`${n.authorName ?? ""} · ${audienceLabel(n)} · ${relativeDate(n.publishedAt)}${n.expiresAt ? ` · expires ${n.expiresAt}` : ""}`}
            </Text>
            {canEdit(n) && (
              <Row style={{ marginTop: 4 }}>
                <Button small variant="secondary" disabled={busy}
                  onPress={() => run(() => (n.pinned ? unpinNotice(n.id) : pinNotice(n.id)), n.pinned ? "Notice unpinned." : "Notice pinned.")}>
                  {n.pinned ? "Unpin" : "Pin"}
                </Button>
                <Button small variant="danger" disabled={busy} onPress={() => withdraw(n)}>Withdraw</Button>
              </Row>
            )}
          </Card>
        );
      }}
    />
  );
}
