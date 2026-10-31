import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Button, Card, FocusPanel, FocusPanelSkeleton,
  Loading, Message, Row, Screen, StatCard, StatCardSkeleton, Title,
} from "../../src/ui";
import { useAuth } from "../../src/auth/AuthContext";
import { getDashboardStats, DashboardStats, WeeklyDay, ClassCoverageItem } from "../../src/api/dashboard";
import { getMyAssignments, getMyExamResults, Assignment, ExamResult } from "../../src/api/studentRecords";
import { errorMessage } from "../../src/api/client";
import NoticeStrip from "../../src/components/NoticeStrip";
import SuperAdminHome from "../../src/screens/SuperAdminHome";
import { displayName, greeting, longDate } from "../../src/lib/name";
import { colors } from "../../src/theme";

/* ─── Role buckets ──────────────────────────────────────────────────────────── */
const ADMIN_ROLES       = ["PRINCIPAL", "COORDINATOR", "SCHOOL_ADMIN", "SUB_COORDINATOR"];
const COORDINATOR_ROLES = ["PRINCIPAL", "COORDINATOR"];
const MARK_ATT_ROLES    = ["PRINCIPAL", "COORDINATOR", "TEACHER"];
const APPROVER_ROLES    = ["PRINCIPAL", "SCHOOL_ADMIN"];
const LEADERSHIP_ROLES  = ["DIRECTOR", "CHAIRMAN"];

/* ─── Entry ─────────────────────────────────────────────────────────────────── */
export default function Home() {
  const { user } = useAuth();
  if (user?.role === "SUPER_ADMIN") return <SuperAdminHome />;
  return <Dashboard />;
}

/* ─── Dashboard ─────────────────────────────────────────────────────────────── */
function Dashboard() {
  const { user }      = useAuth();
  const router        = useRouter();
  const role          = user?.role ?? "";
  const [stats,       setStats]       = useState<DashboardStats | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [results,     setResults]     = useState<ExamResult[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [tick,        setTick]        = useState(0);

  const isAdmin       = ADMIN_ROLES.includes(role);
  const isLeadership  = LEADERSHIP_ROLES.includes(role);
  const isAdminView   = isAdmin || isLeadership;
  const isCoordinator = COORDINATOR_ROLES.includes(role);
  const canApprove    = APPROVER_ROLES.includes(role);
  const canMarkAtt    = MARK_ATT_ROLES.includes(role);
  const isTeacher     = role === "TEACHER";
  const isStudent     = role === "STUDENT";

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await getDashboardStats();
      setStats(res.data?.data ?? null);
    } catch (e) {
      setError(errorMessage(e, "Could not load dashboard data."));
    } finally {
      setLoading(false);
    }
    if (isStudent) {
      try {
        const [a, r] = await Promise.all([getMyAssignments(), getMyExamResults()]);
        setAssignments(a.data?.data ?? []);
        setResults((r.data?.data ?? []).slice(0, 3));
      } catch { /* optional */ }
    }
  }, [isStudent]);

  useEffect(() => { load(); }, [load]);
  const refresh = async () => { setLoading(true); await load(); setTick((t) => t + 1); };
  const go = (to: string) => router.push(to as any);

  const startOfToday = new Date(new Date().toDateString());
  const upcoming = assignments
    .filter((a) => new Date(a.dueDate) >= startOfToday)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4);

  const focus = isLeadership ? null
    : deriveFocus({ stats, isAdmin, isTeacher, isStudent });

  /* ── ADMIN / LEADERSHIP ────────────────────────────────────────────────────── */
  if (isAdminView) return (
    <Screen onRefresh={refresh}>
      <Title sub={longDate()}>{`${greeting()}, ${displayName(user?.name)}`}</Title>
      {!!error && <Message m={{ type: "error", text: error }} />}

      {loading ? <FocusPanelSkeleton /> : focus && <FocusPanel {...focus} onGo={go} />}

      {/* KPI grid */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {loading ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />) : (
          <>
            <StatCard label="Students" value={String(stats?.totalStudents ?? "—")}
              sub={`${stats?.totalClasses ?? 0} classes`} icon="🎓" />
            <StatCard label="Teachers present"
              value={`${stats?.teachersPresent ?? 0}/${stats?.totalTeachers ?? 0}`}
              tone={(stats?.teachersPresent ?? 0) > 0 ? "success" : "warning"}
              sub={(stats?.teachersPresent ?? 0) > 0 ? "Marked today" : "Not yet marked"} icon="👩‍🏫" />
            <StatCard label="Classes covered"
              value={`${stats?.classesAttMarked ?? 0}/${stats?.totalClasses ?? 0}`}
              tone={stats?.classesAttMarked === stats?.totalClasses && (stats?.totalClasses ?? 0) > 0 ? "success" : "warning"}
              sub="Attendance entered" icon="📋" />
            {canApprove && (
              <StatCard label="Pending"
                value={String(stats?.pendingApprovals ?? 0)}
                tone={(stats?.pendingApprovals ?? 0) > 0 ? "warning" : "muted"}
                sub="Approvals" icon="⏳" />
            )}
          </>
        )}
      </View>

      {/* Weekly chart */}
      {!loading && (stats?.weeklyAttendance ?? []).length > 0 && (
        <Card title="This week's attendance">
          <WeeklyBarChart data={stats!.weeklyAttendance!} />
          {((stats?.studentsPresentToday ?? 0) + (stats?.studentsAbsentToday ?? 0)) > 0 && (
            <Row style={{ marginTop: 8, gap: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.navy }} />
                <Text style={{ fontSize: 12, color: colors.inkMuted }}>
                  {stats?.studentsPresentToday ?? 0} present today
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.danger }} />
                <Text style={{ fontSize: 12, color: colors.inkMuted }}>
                  {stats?.studentsAbsentToday ?? 0} absent
                </Text>
              </View>
            </Row>
          )}
        </Card>
      )}

      {/* Class coverage */}
      {!loading && (stats?.classCoverage ?? []).length > 0 && (
        <Card title="Class coverage today">
          <Row style={{ justifyContent: "flex-end", marginBottom: 2 }}>
            <Text style={{ fontSize: 11.5, color: colors.inkSubtle }}>
              {stats?.classesAttMarked ?? 0}/{stats?.totalClasses ?? 0} marked
            </Text>
          </Row>
          {(stats?.classCoverage ?? []).slice(0, 8).map((cls) => (
            <CoverageRow key={cls.classSectionId} cls={cls} onPress={() => go("/attendance/students")} />
          ))}
          {(stats?.classCoverage ?? []).length > 8 && (
            <Text style={{ fontSize: 12, color: colors.inkSubtle, textAlign: "center", marginTop: 4 }}>
              +{(stats?.classCoverage ?? []).length - 8} more classes…
            </Text>
          )}
        </Card>
      )}

      <NoticeStrip refreshKey={tick} />

      {/* Quick actions */}
      <Card title="Quick actions">
        <View style={{ gap: 8 }}>
          {canMarkAtt && (
            <Button small variant="secondary" onPress={() => go("/attendance/students")}>
              ✅ Mark student attendance
            </Button>
          )}
          {isCoordinator && (
            <Button small variant="secondary" onPress={() => go("/attendance/teachers")}>
              👩‍🏫 Staff attendance
            </Button>
          )}
          {isCoordinator && (
            <Button small variant="secondary" onPress={() => go("/substitution")}>
              🔄 Assign substitutes
            </Button>
          )}
          {canApprove && (stats?.pendingApprovals ?? 0) > 0 && (
            <Button small onPress={() => go("/approvals")}>
              ⏳ Review {stats?.pendingApprovals} request{(stats?.pendingApprovals ?? 0) !== 1 ? "s" : ""}
            </Button>
          )}
          <Button small variant="secondary" onPress={() => go("/records")}>
            📁 Records
          </Button>
          <Button small variant="secondary" onPress={() => go("/timetable")}>
            🗓 View timetable
          </Button>
        </View>
      </Card>
    </Screen>
  );

  /* ── TEACHER ───────────────────────────────────────────────────────────────── */
  if (isTeacher) return (
    <Screen onRefresh={refresh}>
      <Title sub={longDate()}>{`${greeting()}, ${displayName(user?.name)}`}</Title>
      {!!error && <Message m={{ type: "error", text: error }} />}

      {loading ? <FocusPanelSkeleton /> : focus && <FocusPanel {...focus} onGo={go} />}

      <View style={{ flexDirection: "row", gap: 10 }}>
        {loading ? <><StatCardSkeleton /><StatCardSkeleton /></> : (
          <>
            <StatCard label="My classes" value={String(stats?.myClassCount ?? 0)}
              sub="Assigned to you" icon="🏫" />
            <StatCard label="Marked today"
              value={`${stats?.classesAttMarked ?? 0}/${stats?.myClassCount ?? 0}`}
              tone={(stats?.classesAttMarked ?? 0) >= (stats?.myClassCount ?? 1) && (stats?.myClassCount ?? 0) > 0 ? "success" : "warning"}
              sub={(stats?.classesAttMarked ?? 0) >= (stats?.myClassCount ?? 1) ? "All done!" : "Still pending"}
              icon="✅" />
          </>
        )}
      </View>

      {/* My classes panel */}
      {!loading && (stats?.myClassCoverage ?? []).length > 0 && (
        <Card title="My classes today">
          {(stats?.myClassCoverage ?? []).map((cls) => (
            <CoverageRow key={cls.classSectionId} cls={cls} onPress={() => go("/attendance/students")} />
          ))}
          <Button small onPress={() => go("/attendance/students")}>Mark attendance</Button>
        </Card>
      )}

      <NoticeStrip refreshKey={tick} />

      <Card title="Quick actions">
        <View style={{ gap: 8 }}>
          <Button small variant="secondary" onPress={() => go("/records")}>📁 Records</Button>
          <Button small variant="secondary" onPress={() => go("/lesson-plans")}>📝 Lesson plans</Button>
          <Button small variant="secondary" onPress={() => go("/timetable")}>🗓 Timetable</Button>
          <Button small variant="secondary" onPress={() => go("/notices")}>📢 Post a notice</Button>
        </View>
      </Card>
    </Screen>
  );

  /* ── STUDENT ───────────────────────────────────────────────────────────────── */
  if (isStudent) {
    const pct      = stats?.myAttendancePercentage ?? 0;
    const good     = pct >= 75;
    const overdue  = assignments.filter((a) => new Date(a.dueDate) < startOfToday);

    return (
      <Screen onRefresh={refresh}>
        <Title sub={longDate()}>{`${greeting()}, ${displayName(user?.name)}`}</Title>
        {!!error && <Message m={{ type: "error", text: error }} />}
        {loading ? <FocusPanelSkeleton /> : focus && <FocusPanel {...focus} onGo={go} />}

        {/* Attendance ring */}
        {!loading && (
          <Card>
            <Row style={{ gap: 16 }}>
              <AttendanceRing pct={pct} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }}>My attendance</Text>
                <Text style={{ fontSize: 13, color: good ? colors.success : colors.danger, marginTop: 3 }}>
                  {good ? "Above required 75%" : "⚠ Below required 75%"}
                </Text>
                <Text style={{ fontSize: 12, color: colors.inkSubtle, marginTop: 6, lineHeight: 18 }}>
                  Minimum 75% needed to appear in examinations.
                </Text>
              </View>
            </Row>
          </Card>
        )}

        {/* Assignment summary */}
        {!loading && (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatCard label="Due soon" value={upcoming.length}
              sub="Next 14 days" tone={upcoming.length > 0 ? "warning" : "muted"} icon="📌" />
            <StatCard label="Overdue" value={overdue.length}
              sub="Past due date" tone={overdue.length > 0 ? "danger" : "muted"} icon="⚠" />
          </View>
        )}

        {/* Recent results */}
        {results.length > 0 && (
          <Card title="Recent results">
            {results.map((r) => (
              <View key={r.id} style={{
                flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.lineSoft,
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: colors.ink }}>{r.examName}</Text>
                  <Text style={{ fontSize: 11.5, color: colors.inkSubtle }}>{r.subject}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: colors.navy }}>
                    {r.marks}/{r.maxMarks}
                  </Text>
                  {!!r.grade && <Text style={{ fontSize: 11, color: colors.inkSubtle }}>Grade {r.grade}</Text>}
                </View>
              </View>
            ))}
            <Button small variant="secondary" onPress={() => go("/my-results")}>All results</Button>
          </Card>
        )}

        {/* Upcoming assignments */}
        {upcoming.length > 0 && (
          <Card title="Coming up">
            {upcoming.map((a) => (
              <Row key={a.id} style={{
                justifyContent: "space-between", paddingVertical: 8,
                borderTopWidth: 1, borderTopColor: colors.lineSoft,
              }}>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: "600", color: colors.ink }}>{a.title}</Text>
                  <Text style={{ fontSize: 12, color: colors.inkSubtle }}>{a.subject}</Text>
                </View>
                <DueBadge iso={a.dueDate} />
              </Row>
            ))}
            <Button small variant="secondary" onPress={() => go("/my-assignments")}>All assignments</Button>
          </Card>
        )}

        <NoticeStrip refreshKey={tick} />
      </Screen>
    );
  }

  /* ── FALLBACK ──────────────────────────────────────────────────────────────── */
  return (
    <Screen onRefresh={refresh}>
      <Title sub={longDate()}>{`${greeting()}, ${displayName(user?.name)}`}</Title>
      <Card>
        <Text style={{ fontSize: 13.5, color: colors.inkMuted, lineHeight: 20 }}>
          Use the More tab to navigate to your screens.
        </Text>
      </Card>
    </Screen>
  );
}

/* ─── WeeklyBarChart (View-based, no library) ───────────────────────────────── */
const CHART_H = 90;

function WeeklyBarChart({ data }: { data: WeeklyDay[] }) {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map((d) => Math.max(d.present, d.absent)), 1);

  return (
    <View style={{ height: CHART_H + 20 }}>
      {/* Bars */}
      <View style={{ height: CHART_H, flexDirection: "row", alignItems: "flex-end", gap: 2 }}>
        {data.map((d) => {
          const pH = Math.max(Math.round((d.present / maxVal) * CHART_H), d.present > 0 ? 4 : 0);
          const aH = Math.max(Math.round((d.absent / maxVal) * CHART_H), d.absent > 0 ? 4 : 0);
          return (
            <View key={d.day} style={{ flex: 1, flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 2 }}>
              <View style={{ width: "42%", height: pH, backgroundColor: colors.navy, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
              <View style={{ width: "42%", height: aH, backgroundColor: colors.danger, opacity: 0.8, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
            </View>
          );
        })}
      </View>
      {/* Day labels */}
      <View style={{ flexDirection: "row", marginTop: 5 }}>
        {data.map((d) => (
          <Text key={d.day} style={{ flex: 1, textAlign: "center", fontSize: 10, color: colors.inkSubtle, fontWeight: "600" }}>
            {d.day}
          </Text>
        ))}
      </View>
    </View>
  );
}

/* ─── CoverageRow ───────────────────────────────────────────────────────────── */
function CoverageRow({ cls, onPress }: { cls: ClassCoverageItem; onPress: () => void }) {
  const total   = cls.totalStudents || 0;
  const present = cls.presentCount  || 0;
  const pct     = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{
        flexDirection: "row", alignItems: "center", gap: 10,
        paddingVertical: 9, paddingHorizontal: 10, borderRadius: 10,
        backgroundColor: pressed ? colors.lineSoft : cls.covered ? colors.lineSoft + "99" : colors.warningSoft + "66",
      }]}
    >
      <View style={{
        width: 8, height: 8, borderRadius: 99,
        backgroundColor: cls.covered ? colors.success : colors.warning,
      }} />
      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.ink, width: 52 }}>
        {cls.grade}-{cls.section}
      </Text>
      <View style={{ flex: 1 }}>
        {cls.covered ? (
          <>
            <View style={{ height: 5, backgroundColor: colors.line, borderRadius: 99, overflow: "hidden" }}>
              <View style={{ width: `${pct}%`, height: "100%", backgroundColor: colors.navy, borderRadius: 99 }} />
            </View>
            <Text style={{ fontSize: 10, color: colors.inkSubtle, marginTop: 2 }}>
              {present} present · {cls.absentCount} absent
            </Text>
          </>
        ) : (
          <Text style={{ fontSize: 12, color: colors.warning, fontWeight: "600" }}>Not marked yet</Text>
        )}
      </View>
      {cls.covered && (
        <Text style={{ fontSize: 12, fontWeight: "700", color: colors.navy }}>{pct}%</Text>
      )}
    </Pressable>
  );
}

/* ─── AttendanceRing (View-based donut) ─────────────────────────────────────── */
function AttendanceRing({ pct }: { pct: number }) {
  const good  = pct >= 75;
  const color = pct === 0 ? colors.line : good ? colors.success : colors.danger;
  const SIZE  = 72;
  const R     = 28;
  // Simulate ring with concentric circles (no SVG)
  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" }}>
      <View style={{
        width: SIZE, height: SIZE, borderRadius: SIZE / 2,
        borderWidth: 7,
        borderColor: color,
        backgroundColor: good ? colors.successSoft : pct === 0 ? colors.lineSoft : colors.dangerSoft,
        alignItems: "center", justifyContent: "center",
      }}>
        <Text style={{ fontSize: 14, fontWeight: "800", color, letterSpacing: -0.5 }}>{pct}%</Text>
      </View>
    </View>
  );
}

/* ─── DueBadge ──────────────────────────────────────────────────────────────── */
function DueBadge({ iso }: { iso: string }) {
  const today = new Date(new Date().toDateString()).getTime();
  const due   = new Date(new Date(iso).toDateString()).getTime();
  const days  = Math.round((due - today) / 86400000);
  const label = days === 0 ? "Today" : days === 1 ? "Tomorrow" : days < 0 ? "Overdue" : `In ${days}d`;
  const bg    = days < 0 ? colors.danger    : days === 0 ? colors.dangerSoft : colors.navy50;
  const fg    = days < 0 ? colors.white     : days === 0 ? colors.danger     : colors.navy;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 }}>
      <Text style={{ fontSize: 11, fontWeight: "700", color: fg }}>{label}</Text>
    </View>
  );
}

/* ─── deriveFocus ───────────────────────────────────────────────────────────── */
type FocusProps = {
  kicker?: string; title: string; body?: string;
  figure?: string | number; figureCaption?: string;
  primary?: { to: string; label: string };
  secondary?: { to: string; label: string } | null;
  tone?: "calm";
};

function deriveFocus({ stats, isAdmin, isTeacher, isStudent }: {
  stats: DashboardStats | null;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
}): FocusProps | null {
  if (!stats) return null;

  if (isAdmin) {
    if ((stats.totalTeachers ?? 0) > 0 && (stats.teachersPresent ?? 0) === 0) {
      return {
        kicker: "Needs attention",
        title:  "Staff attendance isn't marked yet",
        body:   `Cover can't be arranged until attendance is recorded. ${stats.totalTeachers} teachers expected.`,
        figure: `0/${stats.totalTeachers}`, figureCaption: "marked present",
        primary: { to: "/attendance/teachers", label: "Mark staff attendance" },
        secondary: (stats.pendingApprovals ?? 0) > 0
          ? { to: "/approvals", label: `Review ${stats.pendingApprovals} requests` } : null,
      };
    }
    if ((stats.teachersAbsent ?? 0) > 0) {
      const n = stats.teachersAbsent ?? 0;
      return {
        kicker: "Cover required",
        title:  `${n} ${n === 1 ? "teacher is" : "teachers are"} absent today`,
        body:   "Assign substitutes so no class is left without a teacher.",
        figure: n, figureCaption: "awaiting cover",
        primary: { to: "/substitution", label: "Assign substitutes" },
      };
    }
    if ((stats.pendingApprovals ?? 0) > 0) {
      return {
        kicker:  "Awaiting review",
        title:   `${stats.pendingApprovals} ${stats.pendingApprovals === 1 ? "person is" : "people are"} waiting to join`,
        body:    "Approving creates their account immediately.",
        figure:  stats.pendingApprovals, figureCaption: "pending requests",
        primary: { to: "/approvals", label: "Review requests" },
      };
    }
    return {
      tone: "calm", kicker: "All clear",
      title: "Everything is up to date",
      body:  "Staff marked, every class has a teacher, no requests waiting.",
      primary: { to: "/timetable", label: "View today's timetable" },
    };
  }

  if (isTeacher) {
    const outstanding = (stats.myClassCount ?? 0) - (stats.classesAttMarked ?? 0);
    if (outstanding > 0) {
      return {
        kicker:  "Needs attention",
        title:   `Attendance pending for ${outstanding} of your ${stats.myClassCount} classes`,
        body:    "Parents are notified automatically once you mark a class.",
        figure:  `${stats.classesAttMarked ?? 0}/${stats.myClassCount}`, figureCaption: "marked",
        primary: { to: "/attendance/students", label: "Mark attendance" },
      };
    }
    return {
      tone: "calm", kicker: "All done",
      title: "Every class is marked for today",
      body:  "Nothing else needs your attention right now.",
      primary: { to: "/records", label: "Go to records" },
    };
  }

  if (isStudent && (stats.myAttendancePercentage ?? 0) < 75 && stats.myAttendancePercentage != null) {
    return {
      kicker: "Below requirement",
      title:  "Your attendance is under 75%",
      body:   "Most boards require 75% attendance to sit examinations.",
      figure: `${stats.myAttendancePercentage}%`, figureCaption: "this year",
    };
  }

  return null;
}
