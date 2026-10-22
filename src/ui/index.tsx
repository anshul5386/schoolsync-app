/**
 * Small shared UI kit so every screen looks and behaves the same (Easool Light).
 * Screens import from "../src/ui" and never hand-roll inputs, pickers or buttons.
 */
import { ReactNode, useState } from "react";
import {
  ActivityIndicator, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text,
  TextInput, TextInputProps, View, ViewStyle,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { colors } from "../theme";

/** Scrollable page with pull-to-refresh and standard padding. */
export function Screen({ children, onRefresh, style }: { children: ReactNode; onRefresh?: () => Promise<void> | void; style?: ViewStyle }) {
  const [refreshing, setRefreshing] = useState(false);
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvas }} contentContainerStyle={[{ padding: 16, gap: 12 }, style]}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={async () => {
        setRefreshing(true); try { await onRefresh(); } finally { setRefreshing(false); }
      }} /> : undefined}>
      {children}
    </ScrollView>
  );
}

export function Title({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", color: colors.ink }}>{children}</Text>
      {!!sub && <Text style={{ fontSize: 13, color: colors.inkMuted, marginTop: 2 }}>{sub}</Text>}
    </View>
  );
}

export function Card({ children, title, style, onPress }: { children?: ReactNode; title?: string; style?: ViewStyle; onPress?: () => void }) {
  const body = (
    <View style={[s.card, style]}>
      {!!title && <Text style={s.cardTitle}>{title}</Text>}
      {children}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{body}</Pressable> : body;
}

export function Chip({ children, tone = "navy" }: { children: ReactNode; tone?: "navy" | "danger" | "green" | "amber" | "grey" }) {
  const map = {
    navy: [colors.navy50, colors.navy], danger: [colors.dangerSoft, colors.danger],
    green: ["#E6F4EC", "#1E8E5A"], amber: ["#FDF3E1", "#B7791F"], grey: ["#EEF0F4", colors.inkMuted],
  } as const;
  const [bg, fg] = map[tone];
  return <Text style={{ alignSelf: "flex-start", backgroundColor: bg, color: fg, fontSize: 10, fontWeight: "700",
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99, overflow: "hidden", textTransform: "uppercase" }}>{children}</Text>;
}

export function Button({ children, onPress, busy, disabled, variant = "primary", small }: {
  children: ReactNode; onPress: () => void; busy?: boolean; disabled?: boolean;
  variant?: "primary" | "secondary" | "danger"; small?: boolean;
}) {
  const off = busy || disabled;
  const bg = variant === "primary" ? colors.navy : colors.white;
  const fg = variant === "primary" ? colors.white : variant === "danger" ? colors.danger : colors.inkMuted;
  return (
    <Pressable onPress={onPress} disabled={off}
      style={[{ backgroundColor: bg, borderRadius: 10, alignItems: "center", opacity: off ? 0.5 : 1,
        paddingVertical: small ? 8 : 13, paddingHorizontal: small ? 12 : 16,
        borderWidth: variant === "primary" ? 0 : 1, borderColor: colors.line }]}>
      <Text style={{ color: fg, fontWeight: "600", fontSize: small ? 12 : 15 }}>{busy ? "Please wait…" : children}</Text>
    </Pressable>
  );
}

export function Field({ label, hint, ...rest }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.inkSubtle} {...rest}
        style={[s.input, rest.multiline && { minHeight: 90, textAlignVertical: "top" }, rest.style]} />
      {!!hint && <Text style={s.hint}>{hint}</Text>}
    </View>
  );
}

export type Option = { value: string; label: string };

/** A tap-to-choose list in a bottom sheet. React Native has no <select>. */
export function Select({ label, value, onChange, options, placeholder = "Choose…", hint }: {
  label: string; value: string; onChange: (v: string) => void; options: Option[]; placeholder?: string; hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <Pressable style={[s.input, { flexDirection: "row", justifyContent: "space-between" }]} onPress={() => setOpen(true)}>
        <Text style={{ color: current ? colors.ink : colors.inkSubtle, fontSize: 15 }}>{current?.label ?? placeholder}</Text>
        <Text style={{ color: colors.inkSubtle }}>▾</Text>
      </Pressable>
      {!!hint && <Text style={s.hint}>{hint}</Text>}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }} onPress={() => setOpen(false)}>
          <Pressable style={{ backgroundColor: colors.white, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "70%", paddingBottom: 24 }} onPress={() => {}}>
            <Text style={{ padding: 16, fontWeight: "700", color: colors.ink }}>{label}</Text>
            <ScrollView>
              {options.length === 0 && <Text style={{ padding: 16, color: colors.inkMuted }}>Nothing to choose from.</Text>}
              {options.map((o) => (
                <Pressable key={o.value} onPress={() => { onChange(o.value); setOpen(false); }}
                  style={{ paddingVertical: 14, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: colors.line,
                    backgroundColor: o.value === value ? colors.navy50 : colors.white }}>
                  <Text style={{ fontSize: 15, color: o.value === value ? colors.navy : colors.ink }}>{o.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Date as "YYYY-MM-DD" (what the API takes). */
export function DateField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const [open, setOpen] = useState(false);
  const d = value ? new Date(value + "T00:00:00") : new Date();
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <Pressable style={[s.input, { flexDirection: "row", justifyContent: "space-between" }]} onPress={() => setOpen(true)}>
        <Text style={{ color: value ? colors.ink : colors.inkSubtle, fontSize: 15 }}>{value ? prettyDate(value) : "Choose date"}</Text>
        {!!value && <Pressable onPress={() => onChange("")} hitSlop={10}><Text style={{ color: colors.inkSubtle }}>✕</Text></Pressable>}
      </Pressable>
      {!!hint && <Text style={s.hint}>{hint}</Text>}
      {open && (
        <DateTimePicker value={d} mode="date" onChange={(e, picked) => {
          if (Platform.OS !== "ios") setOpen(false);
          if (e.type === "set" && picked) onChange(toISODate(picked));
          if (Platform.OS === "ios" && e.type === "dismissed") setOpen(false);
        }} />
      )}
      {open && Platform.OS === "ios" && <Button small variant="secondary" onPress={() => setOpen(false)}>Done</Button>}
    </View>
  );
}

export function Message({ m }: { m: { type: "success" | "error"; text: string } | null }) {
  if (!m) return null;
  const ok = m.type === "success";
  return <Text style={{ padding: 10, borderRadius: 8, fontSize: 13, backgroundColor: ok ? "#E6F4EC" : colors.dangerSoft,
    color: ok ? "#1E8E5A" : colors.danger }}>{m.text}</Text>;
}

export function Loading() {
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}><ActivityIndicator color={colors.navy} /></View>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <Text style={{ textAlign: "center", color: colors.inkMuted, fontSize: 13, marginVertical: 24 }}>{children}</Text>;
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, style]}>{children}</View>;
}

export function Tabs2({ tabs, value, onChange }: { tabs: Option[]; value: string; onChange: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {tabs.map((t) => (
        <Pressable key={t.value} onPress={() => onChange(t.value)}
          style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1,
            borderColor: value === t.value ? colors.navy : colors.line, backgroundColor: value === t.value ? colors.navy : colors.white }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: value === t.value ? colors.white : colors.inkMuted }}>{t.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/** window.confirm replacement. Resolves true if the user confirms. */
import { Alert } from "react-native";
export function confirm(title: string, message: string, okLabel = "Confirm", destructive = false): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: okLabel, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) }));
}

export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const prettyDate = (iso?: string | null) =>
  iso ? new Date(iso.length === 10 ? iso + "T00:00:00" : iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
export const pretty = (v?: string | null) => (v ? v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ") : "");

const s = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.line, gap: 6 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.ink, marginBottom: 2 },
  label: { fontSize: 11, fontWeight: "600", color: colors.inkMuted, marginBottom: 5, textTransform: "uppercase" },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 15, color: colors.ink, backgroundColor: colors.canvas },
  hint: { fontSize: 11, color: colors.inkSubtle, marginTop: 4 },
});
