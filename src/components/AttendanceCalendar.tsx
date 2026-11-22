import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors } from "../theme";
import { addDays, fromISODate, longDate, monthStart, monthTitle, relativeDayLabel, toISODate, todayISO } from "../lib/dates";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
export type Marker = "success" | "danger" | "warning";
const DOT: Record<Marker, string> = { success: "#1E8E5A", danger: colors.danger, warning: "#B7791F" };

function Chevron({ dir = "right", color = colors.inkMuted }: { dir?: "left" | "right"; color?: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path d={dir === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} stroke={color} strokeWidth={2.2}
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

function CalendarGlyph({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Rect x={3} y={4} width={18} height={18} rx={2} stroke={color} strokeWidth={2} fill="none" />
      <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/**
 * Month grid, Monday first. Days after `max` (today by default) can't be picked.
 * `markers` draws a coloured dot under a day ("YYYY-MM-DD" → tone).
 */
export function MonthCalendar({ value, onChange, max = todayISO(), markers = {}, onMonthChange }: {
  value: string; onChange: (iso: string) => void; max?: string;
  markers?: Record<string, Marker>; onMonthChange?: (monthIso: string) => void;
}) {
  const [cursor, setCursor] = useState(monthStart(value));
  useEffect(() => { setCursor(monthStart(value)); }, [value]);

  const weeks = useMemo(() => {
    const first = fromISODate(cursor);
    const lead = (first.getDay() + 6) % 7;
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const cells: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= days; d++) cells.push(toISODate(new Date(first.getFullYear(), first.getMonth(), d)));
    while (cells.length % 7) cells.push(null);
    const rows: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [cursor]);

  const shift = (n: number) => {
    const d = fromISODate(cursor);
    const next = toISODate(new Date(d.getFullYear(), d.getMonth() + n, 1));
    setCursor(next);
    onMonthChange?.(next);
  };
  const canNext = cursor < monthStart(max);
  const today = todayISO();

  return (
    <View>
      <View style={s.monthHead}>
        <Pressable onPress={() => shift(-1)} hitSlop={8} accessibilityLabel="Previous month" style={s.monthBtn}>
          <Chevron dir="left" />
        </Pressable>
        <Text style={s.monthTitle}>{monthTitle(cursor)}</Text>
        <Pressable onPress={() => shift(1)} disabled={!canNext} hitSlop={8} accessibilityLabel="Next month"
          style={[s.monthBtn, !canNext && { opacity: 0.3 }]}>
          <Chevron />
        </Pressable>
      </View>

      <View style={s.week}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={[s.weekday, i === 6 && { color: colors.inkSubtle }]}>{w}</Text>
        ))}
      </View>

      {weeks.map((row, r) => (
        <View key={r} style={s.week}>
          {row.map((iso, c) => {
            if (!iso) return <View key={c} style={s.cell} />;
            const future = iso > max;
            const selected = iso === value;
            const isToday = iso === today;
            const mark = markers[iso];
            return (
              <Pressable key={iso} disabled={future} onPress={() => onChange(iso)}
                accessibilityRole="button" accessibilityState={{ selected, disabled: future }}
                accessibilityLabel={longDate(iso)} style={s.cell}>
                <View style={[s.day, isToday && !selected && s.dayToday, selected && s.daySelected]}>
                  <Text style={[s.dayText,
                    c === 6 && { color: colors.inkSubtle },
                    future && { color: colors.line },
                    isToday && { color: colors.navy, fontWeight: "700" },
                    selected && { color: colors.white, fontWeight: "700" }]}>
                    {Number(iso.slice(8))}
                  </Text>
                  {!!mark && <View style={[s.dot, { backgroundColor: selected ? colors.white : DOT[mark] }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/**
 * Date bar for attendance screens: "Today / Yesterday / Monday", the full date, ‹ ›
 * to step a day, and tapping the date opens a month calendar in a bottom sheet.
 */
export function AttendanceDatePicker({ value, onChange, max = todayISO() }: {
  value: string; onChange: (iso: string) => void; max?: string;
}) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const atMax = value >= max;
  const pick = (iso: string) => { onChange(iso); setOpen(false); };

  return (
    <>
      <View style={s.bar}>
        <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Choose a date"
          style={({ pressed }) => [s.barMain, pressed && { opacity: 0.7 }]}>
          <View style={[s.barIcon, { backgroundColor: atMax ? colors.navy : colors.navy50 }]}>
            <CalendarGlyph color={atMax ? colors.white : colors.navy} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.barLabel}>{relativeDayLabel(value)}</Text>
            <Text style={s.barDate} numberOfLines={1}>{longDate(value)}</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => onChange(addDays(value, -1))} accessibilityLabel="Previous day" style={s.stepBtn}>
          <Chevron dir="left" />
        </Pressable>
        <Pressable onPress={() => onChange(addDays(value, 1))} disabled={atMax} accessibilityLabel="Next day"
          style={[s.stepBtn, atMax && { opacity: 0.3 }]}>
          <Chevron />
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]} onPress={() => {}}>
            <View style={s.grabber} />
            <Text style={s.sheetTitle}>Choose a day</Text>
            <MonthCalendar value={value} onChange={pick} max={max} />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Pressable onPress={() => pick(max)} style={[s.quick, { backgroundColor: colors.navy50, borderColor: colors.navy50 }]}>
                <Text style={[s.quickText, { color: colors.navy }]}>Today</Text>
              </Pressable>
              <Pressable onPress={() => pick(addDays(max, -1))} style={s.quick}>
                <Text style={s.quickText}>Yesterday</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/** Shown whenever a past day is on screen, so nobody thinks they are editing it. */
export function PastDayBanner({ date, onToday }: { date: string; onToday: () => void }) {
  return (
    <View style={s.banner}>
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={10} stroke={colors.navy} strokeWidth={2} fill="none" />
        <Path d="M12 6v6l4 2" stroke={colors.navy} strokeWidth={2} strokeLinecap="round" fill="none" />
      </Svg>
      <Text style={s.bannerText}>
        <Text style={{ fontWeight: "700" }}>Viewing {longDate(date)}.</Text> Past attendance is view-only.
      </Text>
      <Pressable onPress={onToday} style={s.bannerBtn} accessibilityRole="button">
        <Text style={{ color: colors.white, fontWeight: "700", fontSize: 12 }}>Today</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  monthHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  monthBtn: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas },
  monthTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  week: { flexDirection: "row" },
  weekday: { flex: 1, textAlign: "center", fontSize: 11.5, fontWeight: "700", color: colors.inkMuted, paddingVertical: 6 },
  cell: { flex: 1, alignItems: "center", paddingVertical: 3 },
  day: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dayToday: { borderWidth: 2, borderColor: colors.navy },
  daySelected: { backgroundColor: colors.navy },
  dayText: { fontSize: 14, fontWeight: "500", color: colors.ink },
  dot: { position: "absolute", bottom: 5, width: 5, height: 5, borderRadius: 3 },
  bar: {
    flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.white, borderRadius: 16,
    borderWidth: 1, borderColor: colors.line, padding: 10,
    shadowColor: "#141A2E", shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  barMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  barIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  barLabel: { fontSize: 16, fontWeight: "700", color: colors.ink },
  barDate: { fontSize: 12.5, color: colors.inkMuted, marginTop: 1 },
  stepBtn: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  backdrop: { flex: 1, backgroundColor: "rgba(20,26,46,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 10 },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 12 },
  sheetTitle: { fontSize: 13, fontWeight: "700", color: colors.inkMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, paddingHorizontal: 4 },
  quick: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  quickText: { fontSize: 14, fontWeight: "700", color: colors.inkMuted },
  banner: {
    flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.navy50, borderRadius: 12,
    borderWidth: 1, borderColor: "#D5DCEB", paddingVertical: 10, paddingHorizontal: 12,
  },
  bannerText: { flex: 1, fontSize: 12.5, color: colors.navy, lineHeight: 18 },
  bannerBtn: { backgroundColor: colors.navy, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
});
