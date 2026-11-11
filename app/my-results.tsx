import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { Stack } from "expo-router";
import { getMyExamResults } from "../src/api/studentRecords";
import { errorMessage } from "../src/api/client";
import { useAuth } from "../src/auth/AuthContext";
import { unwrap } from "../src/lib/useLoad";
import { Card, Empty, Message, Screen, Skeleton, Title } from "../src/ui";
import { colors } from "../src/theme";

function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function MyResultsScreen() {
  const { user } = useAuth();
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["my-exam-results"],
    queryFn: () => getMyExamResults().then((r) => unwrap<any[]>(r) || []),
    enabled: user?.role === "STUDENT",
  });

  if (user?.role !== "STUDENT") {
    return <Screen><Stack.Screen options={{ title: "My results" }} /><Empty>Not available for your role.</Empty></Screen>;
  }

  const rows = data ?? [];

  return (
    <Screen onRefresh={async () => { await refetch(); }}>
      <Stack.Screen options={{ title: "My results" }} />
      <Title sub="Exam marks for your class">My results</Title>
      {!!error && <Message m={{ type: "error", text: errorMessage(error, "Could not load results.") }} />}
      {isLoading ? <Skeleton lines={4} /> : rows.length === 0 ? (
        <Empty>No exam results published yet.</Empty>
      ) : rows.map((r) => (
        <Card key={r.examId}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", color: colors.ink }}>{r.examName}</Text>
              <Text style={{ fontSize: 12, color: colors.inkMuted }}>
                {r.subject} · {formatDate(r.examDate)} · {(r.examType || "").replace(/_/g, " ")}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              {r.marks != null ? (
                <>
                  <Text style={{ fontSize: 18, fontWeight: "800", color: colors.navy }}>
                    {r.marks}<Text style={{ fontSize: 13, fontWeight: "400", color: colors.inkMuted }}>/{r.maxMarks}</Text>
                  </Text>
                  {!!r.grade && <Text style={{ fontSize: 11, fontWeight: "600", color: colors.inkMuted }}>Grade {r.grade}</Text>}
                </>
              ) : (
                <Text style={{ fontSize: 12, color: colors.inkSubtle, fontStyle: "italic" }}>Not published</Text>
              )}
            </View>
          </View>
        </Card>
      ))}
      {isFetching && !isLoading && <Text style={{ fontSize: 11, color: colors.inkSubtle, textAlign: "center" }}>Updating…</Text>}
    </Screen>
  );
}
