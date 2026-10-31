import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Stack } from "expo-router";
import {
  Button, Card, Chip, DateField, Field, Message, Row, Screen,
  SectionLabel, Title, confirm,
} from "../src/ui";
import { useAuth } from "../src/auth/AuthContext";
import {
  getLessonPlans, createLessonPlan, updateLessonPlan, deleteLessonPlan, LessonPlan,
} from "../src/api/lessonPlans";
import { errorMessage } from "../src/api/client";
import { colors } from "../src/theme";
import { longDate } from "../src/lib/name";

const TEACHER_ROLES = ["TEACHER", "PRINCIPAL", "COORDINATOR", "SCHOOL_ADMIN", "SUB_COORDINATOR"];

export default function LessonPlansScreen() {
  const { user } = useAuth();
  const canEdit = TEACHER_ROLES.includes(user?.role ?? "");

  const [plans,   setPlans]   = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [forming, setForming] = useState(false);
  const [editing, setEditing] = useState<LessonPlan | null>(null);

  // form state
  const [title,    setTitle]    = useState("");
  const [subject,  setSubject]  = useState("");
  const [content,  setContent]  = useState("");
  const [planDate, setPlanDate] = useState(new Date());
  const [classSId, setClassSId] = useState("");
  const [busy,     setBusy]     = useState(false);
  const [formErr,  setFormErr]  = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await getLessonPlans();
      setPlans(res.data?.data ?? []);
    } catch (e) {
      setError(errorMessage(e, "Could not load lesson plans."));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load once on mount
  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setTitle(""); setSubject(""); setContent("");
    setPlanDate(new Date()); setClassSId("");
    setFormErr(""); setForming(true);
  };

  const openEdit = (p: LessonPlan) => {
    setEditing(p);
    setTitle(p.title); setSubject(p.subject);
    setContent(p.content ?? "");
    setPlanDate(new Date(p.planDate)); setClassSId("");
    setFormErr(""); setForming(true);
  };

  const save = async () => {
    setFormErr("");
    if (!title.trim() || !subject.trim()) { setFormErr("Title and subject are required."); return; }
    setBusy(true);
    try {
      const isoDate = planDate.toISOString().split("T")[0];
      if (editing) {
        await updateLessonPlan(editing.id, { title: title.trim(), subject: subject.trim(), content, planDate: isoDate });
      } else {
        if (!classSId.trim()) { setFormErr("Class/section ID is required for new plans."); setBusy(false); return; }
        await createLessonPlan({ title: title.trim(), subject: subject.trim(), content, planDate: isoDate, classSectionId: classSId.trim() });
      }
      setForming(false);
      setLoading(true);
      load();
    } catch (e) {
      setFormErr(errorMessage(e, "Could not save lesson plan."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: LessonPlan) => {
    const yes = await confirm("Delete lesson plan", `Remove "${p.title}"? This cannot be undone.`);
    if (!yes) return;
    try {
      await deleteLessonPlan(p.id);
      setLoading(true); load();
    } catch (e) {
      setError(errorMessage(e, "Could not delete lesson plan."));
    }
  };

  const grouped = groupByMonth(plans);

  return (
    <Screen onRefresh={async () => { setLoading(true); await load(); }}>
      <Stack.Screen options={{ title: "Lesson plans" }} />
      <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
        <Title>Lesson plans</Title>
        {canEdit && !forming && <Button small onPress={openNew}>+ New plan</Button>}
      </Row>

      {!!error && <Message m={{ type: "error", text: error }} />}

      {/* ── Form ──────────────────────────────────────────────── */}
      {forming && (
        <Card title={editing ? "Edit plan" : "New lesson plan"}>
          {!!formErr && <Message m={{ type: "error", text: formErr }} />}
          <Field label="Title" required>
            <TextInput
              style={s.input} value={title} onChangeText={setTitle}
              placeholder="E.g. Introduction to fractions"
              placeholderTextColor={colors.inkSubtle}
            />
          </Field>
          <Field label="Subject" required>
            <TextInput
              style={s.input} value={subject} onChangeText={setSubject}
              placeholder="E.g. Mathematics"
              placeholderTextColor={colors.inkSubtle}
            />
          </Field>
          {!editing && (
            <Field label="Class section ID" required>
              <TextInput
                style={s.input} value={classSId} onChangeText={setClassSId}
                placeholder="UUID from classes list"
                placeholderTextColor={colors.inkSubtle}
              />
            </Field>
          )}
          <DateField label="Plan date" value={planDate} onChange={setPlanDate} />
          <Field label="Notes / learning objective">
            <TextInput
              style={[s.input, { height: 80, textAlignVertical: "top" }]}
              value={content} onChangeText={setContent}
              multiline placeholder="What should students learn by the end?"
              placeholderTextColor={colors.inkSubtle}
            />
          </Field>
          <Row style={{ gap: 8, marginTop: 4 }}>
            <Button style={{ flex: 1 }} onPress={save} busy={busy}>
              {editing ? "Save changes" : "Create plan"}
            </Button>
            <Button style={{ flex: 0.5 }} variant="secondary" onPress={() => setForming(false)}>
              Cancel
            </Button>
          </Row>
        </Card>
      )}

      {/* ── List ──────────────────────────────────────────────── */}
      {loading && !plans.length
        ? Array.from({ length: 4 }).map((_, i) => <PlanSkeleton key={i} />)
        : Object.entries(grouped).map(([month, items]) => (
          <View key={month}>
            <SectionLabel>{month}</SectionLabel>
            {items.map((p) => (
              <PlanCard
                key={p.id} plan={p} canEdit={canEdit}
                onEdit={() => openEdit(p)}
                onDelete={() => remove(p)}
              />
            ))}
          </View>
        ))
      }

      {!loading && !plans.length && !forming && (
        <Card>
          <Text style={{ fontSize: 13.5, color: colors.inkMuted, textAlign: "center", lineHeight: 22 }}>
            No lesson plans yet.{canEdit ? "\nTap "+ New plan" to add one." : ""}
          </Text>
        </Card>
      )}
    </Screen>
  );
}

/* ─── PlanCard ───────────────────────────────────────────────────────────────── */
function PlanCard({ plan, canEdit, onEdit, onDelete }: {
  plan: LessonPlan;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = plan.status?.toLowerCase();
  const tone   = status === "approved" ? "green" : status === "pending" ? "amber" : "grey";

  return (
    <Pressable onPress={() => setExpanded((v) => !v)} style={({ pressed }) => [
      s.planCard, pressed && { opacity: 0.85 },
    ]}>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={s.planTitle}>{plan.title}</Text>
          <Text style={s.planMeta}>{plan.subject}{plan.classLabel ? ` · ${plan.classLabel}` : ""}</Text>
          <Text style={s.planDate}>{longDate(new Date(plan.planDate))}</Text>
        </View>
        {plan.status && <Chip tone={tone}>{plan.status}</Chip>}
      </Row>

      {expanded && (
        <View style={{ marginTop: 10 }}>
          {!!plan.content && (
            <Text style={s.planContent}>{plan.content}</Text>
          )}
          {plan.teacherName && (
            <Text style={s.planMeta}>👩‍🏫 {plan.teacherName}</Text>
          )}
          {canEdit && (
            <Row style={{ gap: 8, marginTop: 10 }}>
              <Button small variant="secondary" onPress={onEdit} style={{ flex: 1 }}>Edit</Button>
              <Button small variant="danger" onPress={onDelete} style={{ flex: 1 }}>Delete</Button>
            </Row>
          )}
        </View>
      )}
    </Pressable>
  );
}

function PlanSkeleton() {
  return (
    <View style={[s.planCard, { opacity: 0.45 }]}>
      <View style={{ height: 14, width: "60%", backgroundColor: colors.line, borderRadius: 7, marginBottom: 8 }} />
      <View style={{ height: 11, width: "40%", backgroundColor: colors.lineSoft, borderRadius: 6 }} />
    </View>
  );
}

/* ─── helpers ────────────────────────────────────────────────────────────────── */
function groupByMonth(plans: LessonPlan[]): Record<string, LessonPlan[]> {
  const out: Record<string, LessonPlan[]> = {};
  for (const p of [...plans].sort((a, b) => b.planDate.localeCompare(a.planDate))) {
    const key = new Date(p.planDate).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    (out[key] ??= []).push(p);
  }
  return out;
}

const s = StyleSheet.create({
  planCard:    { backgroundColor: colors.white, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.line },
  planTitle:   { fontSize: 14.5, fontWeight: "700", color: colors.ink },
  planMeta:    { fontSize: 12, color: colors.inkMuted },
  planDate:    { fontSize: 11, color: colors.inkSubtle },
  planContent: { fontSize: 13, color: colors.inkMuted, lineHeight: 20, marginBottom: 8 },
  input:       { borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14.5, color: colors.ink, backgroundColor: colors.canvas },
});
