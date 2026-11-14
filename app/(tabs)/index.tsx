import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { setStatusBarBackgroundColor, setStatusBarStyle } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Chip, Message, Row, pretty } from "../../src/ui";
import { useAuth } from "../../src/auth/AuthContext";
import { getDashboardStats, DashboardStats } from "../../src/api/dashboard";
import { getPendingCount } from "../../src/api/registrations";
import { getMyAssignments, Assignment } from "../../src/api/studentRecords";
import { errorMessage } from "../../src/api/client";
import { displayName, firstName, greeting, initials, longDate } from "../../src/lib/name";
import NoticeStrip from "../../src/components/NoticeStrip";
import SuperAdminHome from "../../src/screens/SuperAdminHome";
import { AttendanceRingCard, BentoTile, MonthStatusCalendar, useMyMonthDays } from "../../src/components/AttendanceBento";
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

  const month = useMyMonthDays(isTeacher || isStudent, tick);
  const insets = useSafeAreaInsets();
  // Light status-bar icons over the navy hero; restore the app default when leaving Home.
  useFocusEffect(useCallback(() => {
    setStatusBarStyle("light");
    setStatusBarBackgroundColor(colors.navy, false);
    return () => {
      setStatusBarStyle("dark");
      setStatusBarBackgroundColor(colors.canvas, false);
    };
  }, []));
  const [refreshing, setRefreshing] = useState(false);
  const onPullRefresh = async () => {
    setRefreshing(true);
    try { await load(); setTick((t) => t + 1); } finally { setRefreshing(false); }
  };

  const startOfToday = new Date(new Date().toDateString());
  // Only what is still due, soonest first, capped at three.
  const upcoming = assignments.filter((a) => new Date(a.dueDate) >= startOfToday).slice(0, 3);
  const overdue = assignments.filter((a) => new Date(a.dueDate) < startOfToday);

  const focus = isLeadership ? null
    : deriveFocus({ stats, isAdmin: isOperationalAdmin, isTeacher, isStudent, pending });

  const go = (to: string) => router.push(to as any);

  const actions: Action[] = [
    canMarkAttendance && { to: "/attendance/students", label: "Mark attendance", icon: "✓", tint: TINTS.green },
    isCoordinator && { to: "/attendance/teachers", label: "Staff attendance", icon: "👥", tint: TINTS.blue },
    isCoordinator && { to: "/substitution", label: "Substitution", icon: "↻", tint: TINTS.amber },
    isCoordinator && { to: "/teacher-calendar", label: "Teacher calendar", icon: "🗓", tint: TINTS.violet },
    (isCoordinator || isTeacher || isLeadership) && { to: "/records", label: "Records", icon: "▦", tint: TINTS.blue },
    (role === "PRINCIPAL" || role === "SCHOOL_ADMIN") && { to: "/teachers/manage", label: "Teachers", icon: "🎓", tint: TINTS.violet },
    canApprove && { to: "/approvals", label: "Requests", icon: "✉", tint: TINTS.rose, badge: pending },
    isStudent && { to: "/my-assignments", label: "Assignments", icon: "✎", tint: TINTS.amber },
    isStudent && { to: "/my-results", label: "Results", icon: "★", tint: TINTS.green },
    { to: "/timetable", label: "Timetable", icon: "▥", tint: TINTS.navy },
  ].filter(Boolean) as Action[];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.canvas }}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh}
          tintColor={colors.white} colors={[colors.navy]} progressViewOffset={insets.top} />}
      >
        {/* Hero */}
        <View style={[st.hero, { paddingTop: insets.top + 18 }]}>
          <View style={[st.blob, { width: 220, height: 220, top: -60, right: -70 }]} />
          <View style={[st.blob, { width: 140, height: 140, top: 90, right: 60, opacity: 0.06 }]} />
          <View style={[st.blob, { width: 90, height: 90, bottom: -30, left: -20, opacity: 0.07 }]} />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={st.heroDate}>{longDate()}</Text>
            <Pressable onPress={() => go("/profile")} hitSlop={8} accessibilityLabel="My profile" style={st.avatar}>
              <Text style={st.avatarText}>{initials(user?.name)}</Text>
            </Pressable>
          </View>

          <Text style={st.heroGreeting}>{greeting()},</Text>
          <Text style={st.heroName} numberOfLines={1}>{firstName(user?.name) || displayName(user?.name)}</Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            {!!role && <View style={st.heroPill}><Text style={st.heroPillText}>{pretty(role)}</Text></View>}
            {!!user?.schoolName && (
              <View style={[st.heroPill, { maxWidth: "75%" }]}>
                <Text style={st.heroPillText} numberOfLines={1}>{user.schoolName}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 16, marginTop: -36 }}>
          {/* KPI tiles */}
          {loading ? (
            <View style={[st.surface, { padding: 28, alignItems: "center" }]}><ActivityIndicator color={colors.navy} /></View>
          ) : isAdmin && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {(
                <>
                  <Stat icon="🎒" tint={TINTS.blue} label="Students" value={String(stats?.totalStudents ?? "—")}
                    sub={`Across ${stats?.totalClasses ?? 0} classes`} />
                  <Stat icon="✓" tint={staffMarked(stats) ? TINTS.green : TINTS.amber} label="Teachers present"
                    value={`${stats?.teachersPresent ?? 0}/${stats?.totalTeachers ?? 0}`}
                    sub={staffMarked(stats) ? "Marked today" : "Not yet marked"} />
                  <Stat icon="⚠" tint={(stats?.teachersAbsent ?? 0) > 0 ? TINTS.rose : TINTS.slate} label="Absent teachers"
                    value={String(stats?.teachersAbsent ?? 0)}
                    sub={(stats?.teachersAbsent ?? 0) > 0 ? "Cover required" : "No cover required"} />
                  <Stat icon="🏫" tint={TINTS.violet} label="Classes" value={String(stats?.totalClasses ?? 0)} sub="Active this year" />
                </>
              )}
            </View>
          )}

          {(isTeacher || isStudent) && !loading && (
            <>
              {/* Bento: ring + counts | two tiles, then the colour-coded month */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <AttendanceRingCard
                  title={isStudent ? "Attendance" : "My attendance"}
                  pct={isStudent ? stats?.myAttendancePercentage ?? null : month.counts.pct}
                  ringLabel={isStudent ? "This year" : "This month"}
                  month={month} />
                <View style={{ flex: 1, gap: 12 }}>
                  {isTeacher ? (
                    <>
                      <BentoTile label="Marked today" value={`${stats?.classesAttMarked ?? 0}/${stats?.myClassCount ?? 0}`}
                        sub={teacherDone(stats) ? "All done today" : "Still pending"} tone={teacherDone(stats) ? "good" : "warn"} />
                      <BentoTile label="My classes" value={String(stats?.myClassCount ?? 0)} sub="Assigned to you" />
                    </>
                  ) : (
                    <>
                      <BentoTile label="Due soon" value={String(upcoming.length)} sub="Next 14 days"
                        tone={upcoming.length ? "warn" : "muted"} />
                      <BentoTile label="Overdue" value={String(overdue.length)} sub="Past due date"
                        tone={overdue.length ? "bad" : "muted"} />
                    </>
                  )}
                </View>
              </View>
              <MonthStatusCalendar {...month} />
            </>
          )}

          {!!error && <Message m={{ type: "error", text: error }} />}

          {!loading && focus && <FocusPanel focus={focus} onGo={go} />}

          {/* Quick actions */}
          <View>
            <Text style={st.section}>Quick actions</Text>
            <View style={st.grid}>
              {actions.map((a) => (
                <Pressable key={a.to} onPress={() => go(a.to)}
                  style={({ pressed }) => [st.surface, st.action, pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 }]}>
                  <View style={[st.iconBubble, { backgroundColor: a.tint.bg }]}>
                    <Text style={{ fontSize: 18, color: a.tint.fg }}>{a.icon}</Text>
                    {!!a.badge && a.badge > 0 && (
                      <View style={st.badge}><Text style={st.badgeText}>{a.badge > 99 ? "99+" : a.badge}</Text></View>
                    )}
                  </View>
                  <Text style={st.actionLabel} numberOfLines={2}>{a.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {isStudent && upcoming.length > 0 && (
            <View style={[st.surface, { padding: 16, gap: 10 }]}>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={st.cardHeading}>Coming up</Text>
                <Pressable onPress={() => go("/my-assignments")}><Text style={st.link}>View all</Text></Pressable>
              </Row>
              {upcoming.map((a) => (
                <Row key={a.id} style={{ gap: 12 }}>
                  <View style={[st.dot, { backgroundColor: TINTS.amber.fg }]} />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "600", color: colors.ink }}>{a.title}</Text>
                    <Text style={{ fontSize: 12, color: colors.inkMuted }}>{a.subject}</Text>
                  </View>
                  <Text style={st.duePill}>{dueLabel(a.dueDate)}</Text>
                </Row>
              ))}
            </View>
          )}

          <NoticeStrip refreshKey={tick} />
        </View>
      </ScrollView>
    </>
  );
}

type Tint = { bg: string; fg: string };
const TINTS = {
  navy: { bg: colors.navy50, fg: colors.navy },
  blue: { bg: "#E8F1FE", fg: "#2563EB" },
  green: { bg: "#E6F4EC", fg: "#1E8E5A" },
  amber: { bg: "#FDF3E1", fg: "#B7791F" },
  rose: { bg: "#FDECEC", fg: "#C0392B" },
  violet: { bg: "#F1ECFD", fg: "#6D4AE0" },
  slate: { bg: "#EEF0F4", fg: "#4A5168" },
} satisfies Record<string, Tint>;

type Action = { to: string; label: string; icon: string; tint: Tint; badge?: number };

function FocusPanel({ focus, onGo }: { focus: Focus; onGo: (to: string) => void }) {
  const calm = focus.tone === "calm";
  const accent = calm ? TINTS.green : TINTS.amber;
  return (
    <View style={[st.surface, { overflow: "hidden" }]}>
      <View style={{ height: 4, backgroundColor: accent.fg }} />
      <View style={{ padding: 16, gap: 8 }}>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Chip tone={calm ? "green" : "amber"}>{focus.kicker}</Chip>
            <Text style={{ fontSize: 17, fontWeight: "700", color: colors.ink }}>{focus.title}</Text>
          </View>
          {focus.figure != null && (
            <View style={[st.figure, { backgroundColor: accent.bg }]}>
              <Text style={{ fontSize: 20, fontWeight: "800", color: accent.fg }}>{String(focus.figure)}</Text>
              {!!focus.figureCaption && <Text style={{ fontSize: 10, color: accent.fg, textAlign: "center" }}>{focus.figureCaption}</Text>}
            </View>
          )}
        </Row>
        <Text style={{ fontSize: 13, color: colors.inkMuted, lineHeight: 19 }}>{focus.body}</Text>
        {(focus.primary || focus.secondary) && (
          <View style={{ gap: 8, marginTop: 4 }}>
            {focus.primary && <Button onPress={() => onGo(focus.primary!.to)}>{focus.primary.label}</Button>}
            {focus.secondary && <Button variant="secondary" onPress={() => onGo(focus.secondary!.to)}>{focus.secondary.label}</Button>}
          </View>
        )}
      </View>
    </View>
  );
}

function Stat({ icon, tint, label, value, sub, wide, progress }: {
  icon: string; tint: Tint; label: string; value: string; sub: string; wide?: boolean; progress?: number;
}) {
  return (
    <View style={[st.surface, st.stat, wide && { width: "100%" }]}>
      <Row style={{ justifyContent: "space-between" }}>
        <View style={[st.iconBubble, { width: 34, height: 34, borderRadius: 10, backgroundColor: tint.bg }]}>
          <Text style={{ fontSize: 15, color: tint.fg }}>{icon}</Text>
        </View>
      </Row>
      <Text style={{ fontSize: 26, fontWeight: "800", color: colors.ink, marginTop: 10 }}>{value}</Text>
      <Text style={{ fontSize: 12.5, fontWeight: "600", color: colors.inkMuted, marginTop: 2 }}>{label}</Text>
      <Text style={{ fontSize: 11.5, color: tint.fg, marginTop: 4, fontWeight: "500" }}>{sub}</Text>
      {progress != null && (
        <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.line, marginTop: 10, overflow: "hidden" }}>
          <View style={{ width: `${Math.max(0, Math.min(100, progress))}%`, height: "100%", backgroundColor: tint.fg }} />
        </View>
      )}
    </View>
  );
}

const shadow = {
  shadowColor: "#141A2E", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
};

const st = StyleSheet.create({
  hero: {
    backgroundColor: colors.navy, paddingHorizontal: 20, paddingBottom: 56,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: "hidden",
  },
  blob: { position: "absolute", borderRadius: 999, backgroundColor: "#FFFFFF", opacity: 0.08 },
  heroDate: { color: "rgba(255,255,255,0.75)", fontSize: 12.5, fontWeight: "500" },
  heroGreeting: { color: "rgba(255,255,255,0.85)", fontSize: 16, marginTop: 18 },
  heroName: { color: colors.white, fontSize: 28, fontWeight: "800", marginTop: 2, letterSpacing: 0.2 },
  heroPill: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  heroPillText: { color: colors.white, fontSize: 11.5, fontWeight: "600" },
  avatar: {
    width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.4)",
  },
  avatarText: { color: colors.navy, fontWeight: "800", fontSize: 15 },
  surface: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.line, ...shadow },
  stat: { flexGrow: 1, flexBasis: "45%", padding: 14 },
  section: { fontSize: 15, fontWeight: "700", color: colors.ink, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  action: { flexBasis: "30%", flexGrow: 1, maxWidth: "32%", paddingVertical: 14, paddingHorizontal: 8, alignItems: "center", gap: 8 },
  actionLabel: { fontSize: 12, fontWeight: "600", color: colors.ink, textAlign: "center" },
  iconBubble: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute", top: -4, right: -6, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: colors.danger, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.white,
  },
  badgeText: { color: colors.white, fontSize: 9.5, fontWeight: "800" },
  figure: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, alignItems: "center", minWidth: 64 },
  cardHeading: { fontSize: 15, fontWeight: "700", color: colors.ink },
  link: { fontSize: 12.5, fontWeight: "600", color: colors.navy },
  dot: { width: 8, height: 8, borderRadius: 4 },
  duePill: {
    fontSize: 11, fontWeight: "600", color: "#B7791F", backgroundColor: "#FDF3E1",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, overflow: "hidden",
  },
});

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
        title: `Attendance pending for ${outstanding} of your ${total} periods`,
        body: "Parents are notified automatically once you mark attendance, so it is worth doing early.",
        figure: `${marked}/${total}`,
        figureCaption: "periods marked",
        primary: { to: "/attendance/students", label: "Mark attendance" },
      };
    }
    return {
      tone: "calm",
      kicker: "All done",
      title: "Every period is marked for today",
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
