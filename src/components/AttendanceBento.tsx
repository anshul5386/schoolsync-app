import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "../theme";
import { getMyAttendanceDays, type AttendanceDay, type DayStatus } from "../api/attendance";
import { fromISODate, monthEnd, monthStart, monthTitle, toISODate, todayISO } from "../lib/dates";

/* Functional colours, matching the website's success / danger / warning tokens. */
export const DAY: Record<DayStatus | "OFF", { bg: string; fg: string; short: string; label: string }> = {
  PRESENT: { bg: "#E3F3ED", fg: "#12775A", short: "P", label: "Present" },
  ABSENT: { bg: "#FBEAE8", fg: "#B8352C", short: "A", label: "Absent" },
  LEAVE: { bg: "#FCF1DE", fg: "#A66A08", short: "L", label: "Leave" },
  PARTIAL: { bg: colors.navy50, fg: colors.navy, short: "½", label: "Part day" },
  OFF: { bg: "#F0F2F7", fg: colors.inkMuted, short: "Off", label: "Sunday" },
};

/**
 * The signed-in user's month, one status per day. `available` turns false when the server
 * doesn't serve /attendance/me/days yet — the calendar still renders, just uncoloured.
 */
export function useMyMonthDays(enabled: boolean, refreshKey = 0) {
  const [month, setMonth] = useState(monthStart(todayISO()));
  const [days, setDays] = useState<Record<string, DayStatus>>({});
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    setLoading(true);
    getMyAttendanceDays(month, monthEnd(month))
      .then((res) => {
        if (!live) return;
        const map: Record<string, DayStatus> = {};
        ((res.data?.data ?? []) as AttendanceDay[]).forEach((d) => { map[d.date] = d.status; });
        setDays(map);
        setAvailable(true);
      })
      .catch(() => { if (live) { setDays({}); setAvailable(false); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [month, enabled, refreshKey]);

  const counts = useMemo(() => {
    const c = { PRESENT: 0, ABSENT: 0, LEAVE: 0, PARTIAL: 0 };
    Object.values(days).forEach((s) => { c[s] += 1; });
    const marked = c.PRESENT + c.ABSENT + c.LEAVE + c.PARTIAL;
    return { ...c, marked, pct: marked ? Math.round(((c.PRESENT + c.PARTIAL * 0.5) / marked) * 100) : null };
  }, [days]);

  return { month, setMonth, days, counts, loading, available };
}
export type MonthDays = ReturnType<typeof useMyMonthDays>;

const shadow = { shadowColor: "#141A2E", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 };

function Ring({ pct, size = 104, label }: { pct: number | null; size?: number; label: string }) {
  const stroke = 11;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const val = pct ?? 0;
  const good = val >= 75;
  const col = pct == null ? colors.line : good ? DAY.PRESENT.fg : DAY.ABSENT.fg;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#F0F2F7" strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={col} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${C} ${C}`} strokeDashoffset={C * (1 - val / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: pct == null ? colors.inkSubtle : col }}>{pct == null ? "—" : `${pct}%`}</Text>
        <Text style={{ fontSize: 10.5, color: colors.inkMuted }}>{label}</Text>
      </View>
    </View>
  );
}

/** Tall card: attendance ring and this month's present / absent / leave counts. */
export function AttendanceRingCard({ title, pct, ringLabel, month }: {
  title: string; pct: number | null; ringLabel: string; month: MonthDays;
}) {
  const row = (k: "PRESENT" | "ABSENT" | "LEAVE", n: number) => (
    <View key={k} style={[s.countRow, { backgroundColor: DAY[k].bg }]}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.inkMuted }}>{DAY[k].label}</Text>
      <Text style={{ fontSize: 15, fontWeight: "800", color: DAY[k].fg }}>{n}</Text>
    </View>
  );
  return (
    <View style={[s.card, { flex: 1, alignItems: "center", gap: 10 }]}>
      <Text style={[s.kicker, { alignSelf: "flex-start" }]}>{title}</Text>
      <Ring pct={pct} label={ringLabel} />
      <View style={{ alignSelf: "stretch", gap: 6 }}>
        {row("PRESENT", month.counts.PRESENT)}
        {row("ABSENT", month.counts.ABSENT)}
        {row("LEAVE", month.counts.LEAVE)}
      </View>
    </View>
  );
}

/** Small stat tile for the right column of the Bento row. */
export function BentoTile({ label, value, sub, tone = "navy" }: {
  label: string; value: string; sub: string; tone?: "navy" | "good" | "warn" | "bad" | "muted";
}) {
  const col = { navy: colors.navy, good: DAY.PRESENT.fg, warn: DAY.LEAVE.fg, bad: DAY.ABSENT.fg, muted: colors.inkSubtle }[tone];
  const border = { navy: colors.line, good: "#BFE3D5", warn: "#F1D9AE", bad: "#F0C6C2", muted: colors.line }[tone];
  return (
    <View style={[s.card, { flex: 1, borderColor: border, justifyContent: "center" }]}>
      <Text style={s.kicker}>{label}</Text>
      <Text style={{ fontSize: 28, fontWeight: "800", color: col, marginTop: 2 }}>{value}</Text>
      <Text style={{ fontSize: 12, color: colors.inkMuted }}>{sub}</Text>
    </View>
  );
}

const WD = ["M", "T", "W", "T", "F", "S", "S"];

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path d={dir === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} stroke={colors.inkMuted} strokeWidth={2.2}
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/** ZingHR-style month: every day filled with its status colour and a P / A / L tag. */
export function MonthStatusCalendar({ month, setMonth, days, loading, available }: MonthDays) {
  const today = todayISO();
  const weeks = useMemo(() => {
    const first = fromISODate(month);
    const lead = (first.getDay() + 6) % 7;
    const n = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const cells: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= n; d++) cells.push(toISODate(new Date(first.getFullYear(), first.getMonth(), d)));
    while (cells.length % 7) cells.push(null);
    const rows: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [month]);
  const shift = (k: number) => {
    const d = fromISODate(month);
    setMonth(toISODate(new Date(d.getFullYear(), d.getMonth() + k, 1)));
  };
  const atCurrent = month >= monthStart(today);

  return (
    <View style={[s.card, { gap: 8 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 16, fontWeight: "800", color: colors.ink }}>{monthTitle(month)}</Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Pressable onPress={() => shift(-1)} accessibilityLabel="Previous month" style={s.navBtn}><Chevron dir="left" /></Pressable>
          <Pressable onPress={() => shift(1)} disabled={atCurrent} accessibilityLabel="Next month"
            style={[s.navBtn, atCurrent && { opacity: 0.3 }]}><Chevron dir="right" /></Pressable>
        </View>
      </View>

      <View style={{ flexDirection: "row" }}>
        {WD.map((w, i) => <Text key={i} style={s.wd}>{w}</Text>)}
      </View>
      <View style={{ gap: 5, opacity: loading ? 0.6 : 1 }}>
        {weeks.map((row, r) => (
          <View key={r} style={{ flexDirection: "row", gap: 5 }}>
            {row.map((iso, c) => {
              if (!iso) return <View key={c} style={{ flex: 1 }} />;
              const future = iso > today;
              const sunday = c === 6;
              const status = days[iso] ?? (sunday && !future ? "OFF" : null);
              const d = status ? DAY[status] : null;
              const isToday = iso === today;
              return (
                <View key={iso} accessibilityLabel={`${Number(iso.slice(8))}${d ? `, ${d.label}` : ""}`}
                  style={[s.cell, d ? { backgroundColor: d.bg } : future ? s.cellFuture : { backgroundColor: colors.canvas },
                    isToday && { borderWidth: 2, borderColor: colors.navy }]}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: future ? "#B4BACA" : colors.ink }}>{Number(iso.slice(8))}</Text>
                  {!!d && <Text style={{ fontSize: 9, fontWeight: "800", color: d.fg }}>{d.short}</Text>}
                </View>
              );
            })}
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 2 }}>
        {(["PRESENT", "ABSENT", "LEAVE", "OFF"] as const).map((k) => (
          <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: k === "OFF" ? "#D7DBE4" : DAY[k].fg }} />
            <Text style={{ fontSize: 11.5, color: colors.inkMuted }}>{DAY[k].label}</Text>
          </View>
        ))}
      </View>
      {!available && !loading && (
        <Text style={{ fontSize: 11.5, color: colors.inkSubtle }}>Day colours appear once the server update is live.</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 14, ...shadow },
  kicker: { fontSize: 12.5, fontWeight: "600", color: colors.inkMuted },
  countRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6 },
  navBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  wd: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "700", color: colors.inkMuted },
  cell: { flex: 1, height: 44, borderRadius: 9, alignItems: "center", justifyContent: "center", gap: 1 },
  cellFuture: { borderWidth: 1, borderColor: "#F0F2F7" },
});
