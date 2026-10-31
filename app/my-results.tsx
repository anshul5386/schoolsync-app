import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { Card, Message, Row, Screen, Title } from "../src/ui";
import { getMyExamResults, ExamResult } from "../src/api/studentRecords";
import { errorMessage } from "../src/api/client";
import { colors } from "../src/theme";
import { longDate } from "../src/lib/name";

export default function MyResultsScreen() {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await getMyExamResults();
      setResults(res.data?.data ?? []);
    } catch (e) {
      setError(errorMessage(e, "Could not load results."));
    } finally {
      setLoading(false);
    }
  }, []);

  // load once
  useEffect(() => { load(); }, [load]);

  const grouped = groupByExam(results);

  return (
    <Screen onRefresh={async () => { setLoading(true); await load(); }}>
      <Stack.Screen options={{ title: "My results" }} />
      <Title sub="All your exam results">My results</Title>
      {!!error && <Message m={{ type: "error", text: error }} />}

      {loading && !results.length
        ? Array.from({ length: 3 }).map((_, i) => <ResultSkeleton key={i} />)
        : Object.entries(grouped).map(([exam, items]) => (
          <Card key={exam} title={exam}>
            {items.map((r) => <ResultRow key={r.id} result={r} />)}
            <TotalRow items={items} />
          </Card>
        ))
      }

      {!loading && !results.length && (
        <Card>
          <Text style={{ color: colors.inkMuted, textAlign: "center", fontSize: 13.5, lineHeight: 22 }}>
            No exam results yet.{"\n"}Results appear here once your teacher saves them.
          </Text>
        </Card>
      )}
    </Screen>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────────── */
function ResultRow({ result }: { result: ExamResult }) {
  const pct       = result.maxMarks && result.marks != null ? Math.round((result.marks / result.maxMarks) * 100) : null;
  const tone      = pct == null ? colors.inkSubtle : pct >= 75 ? colors.success : pct >= 50 ? colors.warning : colors.danger;
  return (
    <Row style={s.row}>
      <View style={{ flex: 1 }}>
        <Text style={s.subject}>{result.subject}</Text>
        {result.examDate && <Text style={s.date}>{longDate(new Date(result.examDate))}</Text>}
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <Text style={[s.marks, { color: tone }]}>
          {result.marks ?? "—"}{result.maxMarks != null ? `/${result.maxMarks}` : ""}
        </Text>
        {result.grade && <Text style={s.grade}>Grade {result.grade}</Text>}
        {pct != null && <Text style={[s.pct, { color: tone }]}>{pct}%</Text>}
      </View>
    </Row>
  );
}

function TotalRow({ items }: { items: ExamResult[] }) {
  const withMarks = items.filter((r) => r.marks != null && r.maxMarks != null);
  if (withMarks.length < 2) return null;
  const total    = withMarks.reduce((s, r) => s + r.marks!, 0);
  const maxTotal = withMarks.reduce((s, r) => s + r.maxMarks!, 0);
  const pct      = Math.round((total / maxTotal) * 100);
  const tone     = pct >= 75 ? colors.success : pct >= 50 ? colors.warning : colors.danger;
  return (
    <Row style={[s.row, { backgroundColor: colors.canvas, borderRadius: 10, marginTop: 8, paddingHorizontal: 10 }]}>
      <Text style={{ fontWeight: "700", color: colors.ink, fontSize: 13 }}>Total ({withMarks.length} subjects)</Text>
      <Text style={[s.marks, { color: tone }]}>{total}/{maxTotal} · {pct}%</Text>
    </Row>
  );
}

function ResultSkeleton() {
  return (
    <View style={{ backgroundColor: colors.white, borderRadius: 14, padding: 14, marginBottom: 8 }}>
      <View style={{ height: 13, width: "45%", backgroundColor: colors.line, borderRadius: 7, marginBottom: 10 }} />
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={{ height: 11, width: `${60 + i * 10}%`, backgroundColor: colors.lineSoft, borderRadius: 6, marginBottom: 8 }} />
      ))}
    </View>
  );
}

/* ─── helpers ────────────────────────────────────────────────────────────────── */
function groupByExam(results: ExamResult[]): Record<string, ExamResult[]> {
  const out: Record<string, ExamResult[]> = {};
  for (const r of results) {
    const key = r.examName || "Other";
    (out[key] ??= []).push(r);
  }
  return out;
}

const s = StyleSheet.create({
  row:     { justifyContent: "space-between", alignItems: "center", paddingVertical: 9, borderTopWidth: 1, borderTopColor: colors.lineSoft },
  subject: { fontSize: 14, fontWeight: "600", color: colors.ink },
  date:    { fontSize: 11.5, color: colors.inkSubtle, marginTop: 1 },
  marks:   { fontSize: 15, fontWeight: "700" },
  grade:   { fontSize: 11.5, color: colors.inkSubtle },
  pct:     { fontSize: 11.5, fontWeight: "600" },
});
