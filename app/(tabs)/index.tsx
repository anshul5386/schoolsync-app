import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, Chip, Loading, Message, Row, Screen, Title } from "../../src/ui";
import { useAuth } from "../../src/auth/AuthContext";
import { getDashboardStats, DashboardStats } from "../../src/api/dashboard";
import { getPendingCount } from "../../src/api/registrations";
import { getMyAssignments, Assignment } from "../../src/api/studentRecords";
import { errorMessage } from "../../src/api/client";
import { displayName, greeting, longDate } from "../../src/lib/name";
import NoticeStrip from "../../src/components/NoticeStrip";
import SuperAdminHome from "../../src/screens/SuperAdminHome";
import { colors } from "../../src/theme";

const ADMIN_ROLES = ["PRINCIPAL", "COORDINATOR", "SCHOOL_ADMIN", "SUB_COORDINATOR"];
const COORDINATOR_ROLES = ["PRINCIPAL", "COORDINATOR"];
const MARK_ATTENDANCE_ROLES = ["PRINCIPAL", "COORDINATOR", "TEACHER"];
const APPROVER_ROLES = ["PRINCIPAL", "SCHOOL_ADMIN"];
// Read-only senior leadership: same KPI cards as an admin, never the focus panel's action prompts.
const LEADERSHIP_ROLES = ["DIRECTOR", "CHAIRMAN"];

type Link = { to: string; label: string };
type Focus = {
  tone?: "calm"; kicker: string; title: string; body: string;
  figure?: string | number; figureCaption?: string; primary?: Link; secondary?: Link | null;
};

export default function Home() {
  const { user } = useAuth();
  if (user?.role === "SUPER_ADMIN") return <SuperAdminHome />;
  return <Dashboard />;
}

function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const role = user?.role ?? "";
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tick, setTick] = useState(0);

  const isOperationalAdmin = ADMIN_ROLES.includes(role);
  const isLeadership = LEADERSHIP_ROLES.includes(role);
  const isAdmin = isOperationalAdmin || isLeadership;
  const isCoordinator = COORDINATOR_ROLES.includes(role);
  const canMarkAttendance = MARK_ATTENDANCE_ROLES.includes(role);
  const canApprove = APPROVER_ROLES.includes(role);
  const isTeacher = role === "TEACHER";
  const isStudent = role === "STUDENT";

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await getDashboardStats();
      setStats(res.data?.data ?? null);
    } catch (e) {
      setError(errorMessage(e, "Could not load dashboard figures."));
    } finally {
      setLoading(false);
    }
    if (canApprove) {
      try {
        const res = await getPendingCount();
        setPending(res.data?.data?.count || 0);
      } catch { /* the count is optional */ }
    }
    if (isStudent) {
      try {
        const res = await getMyAssignments();
        setAssignments(res.data?.data || []);
      } catch { /* optional */ }
    }
  }, [canApprove, isStudent]);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => { await load(); setTick((t) => t + 1); };

  const startOfToday = new Date(new Date().toDateString());
  // Only what is still due, soonest first, capped at three.
  const upcoming = assignments.filter((a) => new Date(a.dueDate) >= startOfToday).slice(0, 3);

  const focus = isLeadership ? null
    : deriveFocus({ stats, isAdmin: isOperationalAdmin, isTeacher, isStudent, pending });

  const go = (to: string) => router.push(to as any);

  return (
    <Screen onRefresh={refresh}>
      <Title sub={longDate()}>{`${greeting()}, ${displayName(user?.name)}`}</Title>
      {!!error && <Message m={{ type: "error", text: error }} />}

      {loading ? <Loading /> : (
        <>
          {focus && <FocusPanel focus={focus} onGo={go} />}

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {isAdmin && (
              <>
                <Stat label="Total students" value={String(stats?.totalStudents ?? "—")} sub={`Across ${stats?.totalClasses ?? 0} classes`} />
                <Stat label="Teachers present" value={`${stats?.teachersPresent ?? 0}/${stats?.totalTeachers ?? 0}`}
                  tone={staffMarked(stats) ? "success" : "warning"} sub={staffMarked(stats) ? "Marked today" : "Not yet marked"} />
                <Stat label="Absent teachers" value={String(stats?.teachersAbsent ?? 0)}
                  tone={(stats?.teachersAbsent ?? 0) > 0 ? "danger" : "default"}
                  sub={(stats?.teachersAbsent ?? 0) > 0 ? "Cover required" : "No cover required"} />
                <Stat label="Total classes" value={String(stats?.totalClasses ?? 0)} sub="Active this year" />
              </>
            )}
            {isTeacher && (
              <>
                <Stat label="My classes" value={String(stats?.myClassCount ?? 0)} sub="Assigned to you" />
                <Stat label="Attendance marked" value={`${stats?.classesAttMarked ?? 0}/${stats?.myClassCount ?? 0}`}
                  tone={teacherDone(stats) ? "success" : "warning"} sub={teacherDone(stats) ? "All done today" : "Still outstanding"} />
              </>
            )}
            {isStudent && (
              <Stat label="My attendance"
                value={stats?.myAttendancePercentage != null ? `${stats.myAttendancePercentage}%` : "—"}
                tone={(stats?.myAttendancePercentage ?? 0) >= 75 ? "success" : "danger"} sub="Minimum required is 75%" />
            )}
          </View>
        </>
      )}

      <NoticeStrip refreshKey={tick} />

      {isStudent && upcoming.length > 0 && (
        <Card title="Coming up">
          {upcoming.map((a) => (
            <Row key={a.id} style={{ justifyContent: "space-between", paddingVertical: 4 }}>
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 13.5, color: colors.inkMuted }}>
                <Text style={{ fontWeight: "700", color: colors.ink }}>{a.subject}</Text>{` · ${a.title}`}
              </Text>
              <Text style={{ fontSize: 12, color: colors.inkSubtle }}>{dueLabel(a.dueDate)}</Text>
            </Row>
          ))}
          <Button small variant="secondary" onPress={() => go("/my-assignments")}>All assignments</Button>
        </Card>
      )}

      <Card title="Quick actions">
        <View style={{ gap: 8 }}>
          {canMarkAttendance && <Button small variant="secondary" onPress={() => go("/attendance/students")}>Mark attendance</Button>}
          {isCoordinator && <Button small variant="secondary" onPress={() => go("/attendance/teachers")}>Staff attendance</Button>}
          {isCoordinator && <Button small variant="secondary" onPress={() => go("/teacher-calendar")}>Teacher calendar</Button>}
          {(isCoordinator || isTeacher || isLeadership) && <Button small variant="secondary" onPress={() => go("/records")}>Records</Button>}
          {(role === "PRINCIPAL" || role === "SCHOOL_ADMIN") && <Button small variant="secondary" onPress={() => go("/teachers/manage")}>Teacher onboarding</Button>}
          {canApprove && <Button small variant="secondary" onPress={() => go("/approvals")}>{`Account requests${pending > 0 ? ` (${pending})` : ""}`}</Button>}
          <Button small variant="secondary" onPress={() => go("/timetable")}>View timetable</Button>
        </View>
      </Card>
    </Screen>
  );
}

function FocusPanel({ focus, onGo }: { focus: Focus; onGo: (to: string) => void }) {
  const calm = focus.tone === "calm";
  return (
    <Card style={{ borderColor: calm ? colors.line : colors.navy, borderWidth: calm ? 1 : 2 }}>
      <Chip tone={calm ? "green" : "amber"}>{focus.kicker}</Chip>
      <Text style={{ fontSize: 17, fontWeight: "700", color: colors.ink }}>{focus.title}</Text>
      <Text style={{ fontSize: 13, color: colors.inkMuted, lineHeight: 19 }}>{focus.body}</Text>
      {focus.figure != null && (
        <Row>
          <Text style={{ fontSize: 28, fontWeight: "700", color: colors.navy }}>{String(focus.figure)}</Text>
          {!!focus.figureCaption && <Text style={{ fontSize: 12, color: colors.inkSubtle }}>{focus.figureCaption}</Text>}
        </Row>
      )}
      {focus.primary && <Button onPress={() => onGo(focus.primary!.to)}>{focus.primary.label}</Button>}
      {focus.secondary && <Button variant="secondary" onPress={() => onGo(focus.secondary!.to)}>{focus.secondary.label}</Button>}
    </Card>
  );
}

function Stat({ label, value, sub, tone = "default" }: { label: string; value: string; sub: string; tone?: "default" | "success" | "warning" | "danger" }) {
  const c = tone === "success" ? "#1E8E5A" : tone === "warning" ? "#B7791F" : tone === "danger" ? colors.danger : colors.ink;
  return (
    <View style={{ width: "48%", flexGrow: 1, backgroundColor: colors.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.line }}>
      <Text style={{ fontSize: 11, fontWeight: "600", color: colors.inkMuted, textTransform: "uppercase" }}>{label}</Text>
      <Text style={{ fontSize: 26, fontWeight: "700", color: c, marginTop: 4 }}>{value}</Text>
      <Text style={{ fontSize: 11.5, color: colors.inkSubtle, marginTop: 2 }}>{sub}</Text>
    </View>
  );
}

function dueLabel(iso: string): string {
  const today = new Date(new Date().toDateString()).getTime();
  const due = new Date(new Date(iso).toDateString()).getTime();
  const days = Math.round((due - today) / 86400000);
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  return `in ${days} days`;
}

const staffMarked = (s: DashboardStats | null) => (s?.totalTeachers ?? 0) > 0 && (s?.teachersPresent ?? 0) > 0;
const teacherDone = (s: DashboardStats | null) => (s?.myClassCount ?? 0) > 0 && (s?.classesAttMarked ?? 0) >= (s?.myClassCount ?? 0);

/**
 * Picks the single most important thing on screen. Unmarked staff attendance outranks everything
 * (it blocks substitution cover), then absent teachers, then the approval queue.
 */
function deriveFocus({ stats, isAdmin, isTeacher, isStudent, pending }: {
  stats: DashboardStats | null; isAdmin: boolean; isTeacher: boolean; isStudent: boolean; pending: number;
}): Focus | null {
  if (!stats) return null;

  if (isAdmin) {
    if ((stats.totalTeachers ?? 0) > 0 && (stats.teachersPresent ?? 0) === 0) {
      return {
        kicker: "Needs attention",
        title: "Staff attendance isn't marked yet",
        body: `Substitution cover can't be arranged until the coordinator records who is present. ${stats.totalTeachers} teachers are expected today.`,
        figure: `0/${stats.totalTeachers}`,
        figureCaption: "marked present",
        primary: { to: "/attendance/teachers", label: "Mark staff attendance" },
        secondary: pending > 0 ? { to: "/approvals", label: `Review ${pending} requests` } : null,
      };
    }
    if ((stats.teachersAbsent ?? 0) > 0) {
      const n = stats.teachersAbsent ?? 0;
      return {
        kicker: "Cover required",
        title: `${n} ${n === 1 ? "teacher is" : "teachers are"} absent today`,
        body: "Assign substitutes so no class is left without a teacher.",
        figure: n,
        figureCaption: "awaiting cover",
        primary: { to: "/substitution", label: "Assign substitutes" },
      };
    }
    if (pending > 0) {
      return {
        kicker: "Awaiting review",
        title: `${pending} ${pending === 1 ? "person is" : "people are"} waiting to join`,
        body: "Approving creates their account immediately — they can sign in with the password they chose.",
        figure: pending,
        figureCaption: "pending requests",
        primary: { to: "/approvals", label: "Review requests" },
      };
    }
    return {
      tone: "calm",
      kicker: "All clear",
      title: "Everything is up to date",
      body: "Staff attendance is marked, every class has a teacher, and there are no requests waiting.",
      primary: { to: "/timetable", label: "View today's timetable" },
    };
  }

  if (isTeacher) {
    const marked = stats.classesAttMarked ?? 0;
    const total = stats.myClassCount ?? 0;
    const outstanding = total - marked;
    if (outstanding > 0) {
      return {
        kicker: "Needs attention",
        title: `Attendance pending for ${outstanding} of your ${total} classes`,
        body: "Parents are notified automatically once you mark a class, so it is worth doing early.",
        figure: `${marked}/${total}`,
        figureCaption: "classes marked",
        primary: { to: "/attendance/students", label: "Mark attendance" },
      };
    }
    return {
      tone: "calm",
      kicker: "All done",
      title: "Every class is marked for today",
      body: "Nothing else needs your attention right now.",
      primary: { to: "/timetable", label: "View your timetable" },
    };
  }

  if (isStudent && stats.myAttendancePercentage != null && stats.myAttendancePercentage < 75) {
    return {
      kicker: "Below requirement",
      title: "Your attendance is under 75%",
      body: "Most boards require at least 75% attendance to sit examinations. Speak to your class teacher if something needs explaining.",
      figure: `${stats.myAttendancePercentage}%`,
      figureCaption: "this year",
    };
  }

  return null;
}
