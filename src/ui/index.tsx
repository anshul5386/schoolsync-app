/**
 * Easool Mobile UI kit — all screens import from here.
 * Zero external icon/animation deps; everything built from React Native primitives.
 */
import { ReactNode, useState } from "react";
import {
  ActivityIndicator, Alert, Modal, Platform, Pressable,
  RefreshControl, ScrollView, StyleSheet, Text, TextInput,
  TextInputProps, View, ViewStyle,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { colors, shadow } from "../theme";

// ─── Screen ───────────────────────────────────────────────────────────────────

/** Scrollable screen with pull-to-refresh and standard horizontal padding. */
export function Screen({
  children, onRefresh, style, noPad,
}: {
  children: ReactNode;
  onRefresh?: () => Promise<void> | void;
  style?: ViewStyle;
  noPad?: boolean;
}) {
  const [refreshing, setRefreshing] = useState(false);
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      contentContainerStyle={[{ padding: noPad ? 0 : 16, gap: 12 }, style]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={onRefresh
        ? <RefreshControl
            refreshing={refreshing}
            tintColor={colors.navy}
            onRefresh={async () => {
              setRefreshing(true);
              try { await onRefresh(); } finally { setRefreshing(false); }
            }}
          />
        : undefined}
    >
      {children}
    </ScrollView>
  );
}

// ─── Typography ───────────────────────────────────────────────────────────────

export function Title({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={{ fontSize: 24, fontWeight: "700", color: colors.ink, letterSpacing: -0.5 }}>{children}</Text>
      {!!sub && <Text style={{ fontSize: 13.5, color: colors.inkMuted, marginTop: 3, lineHeight: 19 }}>{sub}</Text>}
    </View>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: "700", color: colors.inkSubtle, textTransform: "uppercase", letterSpacing: 0.6, marginTop: 4 }}>
      {children}
    </Text>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({
  children, title, style, onPress, accent,
}: {
  children?: ReactNode;
  title?: string;
  style?: ViewStyle;
  onPress?: () => void;
  accent?: string;          // left border colour
}) {
  const inner = (
    <View style={[s.card, accent && { borderLeftWidth: 4, borderLeftColor: accent }, style]}>
      {!!title && <Text style={s.cardTitle}>{title}</Text>}
      {children}
    </View>
  );
  return onPress
    ? <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}>{inner}</Pressable>
    : inner;
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

type Tone = "default" | "success" | "warning" | "danger" | "muted";

const TONE_COLOR: Record<Tone, string> = {
  default: colors.navy,
  success: colors.success,
  warning: colors.warning,
  danger:  colors.danger,
  muted:   colors.inkSubtle,
};

export function StatCard({
  value, label, sub, tone = "default", icon,
}: {
  value: string | number;
  label: string;
  sub?: string;
  tone?: Tone;
  icon?: string;
}) {
  const vc = TONE_COLOR[tone];
  return (
    <View style={[s.statCard]}>
      {!!icon && <Text style={{ fontSize: 18, marginBottom: 4 }}>{icon}</Text>}
      <Text style={{ fontSize: 11, fontWeight: "600", color: colors.inkMuted, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 28, fontWeight: "700", color: vc, marginTop: 3, letterSpacing: -0.5 }}>
        {value}
      </Text>
      {!!sub && <Text style={{ fontSize: 11.5, color: colors.inkSubtle, marginTop: 2, lineHeight: 16 }}>{sub}</Text>}
    </View>
  );
}

export function StatCardSkeleton() {
  return (
    <View style={[s.statCard]}>
      <View style={{ height: 11, width: 60, borderRadius: 4, backgroundColor: colors.lineSoft }} />
      <View style={{ height: 28, width: 50, borderRadius: 6, backgroundColor: colors.lineSoft, marginTop: 5 }} />
      <View style={{ height: 11, width: 80, borderRadius: 4, backgroundColor: colors.lineSoft, marginTop: 4 }} />
    </View>
  );
}

// ─── FocusPanel ───────────────────────────────────────────────────────────────

/** The single most important thing on screen — matches the web's FocusPanel. */
export function FocusPanel({
  kicker, title, body, figure, figureCaption, primary, secondary, tone,
  onGo,
}: {
  kicker?: string;
  title: string;
  body?: string;
  figure?: string | number;
  figureCaption?: string;
  primary?: { to: string; label: string };
  secondary?: { to: string; label: string } | null;
  tone?: "calm";
  onGo: (to: string) => void;
}) {
  const calm = tone === "calm";
  return (
    <View style={[
      s.focusPanel,
      calm ? { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line } : { backgroundColor: colors.navy },
    ]}>
      {!!kicker && (
        <View style={{
          alignSelf: "flex-start",
          backgroundColor: calm ? colors.successSoft : "rgba(255,255,255,0.18)",
          borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10,
        }}>
          <Text style={{ fontSize: 11.5, fontWeight: "700", color: calm ? colors.success : colors.white }}>
            ● {kicker}
          </Text>
        </View>
      )}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: calm ? colors.ink : colors.white, lineHeight: 24, letterSpacing: -0.3 }}>
            {title}
          </Text>
          {!!body && (
            <Text style={{ fontSize: 13, color: calm ? colors.inkMuted : "rgba(255,255,255,0.75)", marginTop: 6, lineHeight: 19 }}>
              {body}
            </Text>
          )}
        </View>
        {figure != null && (
          <View style={{ alignItems: "center", flexShrink: 0 }}>
            <Text style={{ fontSize: 38, fontWeight: "700", color: calm ? colors.navy : colors.white, letterSpacing: -1 }}>
              {String(figure)}
            </Text>
            {!!figureCaption && (
              <Text style={{ fontSize: 10, color: calm ? colors.inkSubtle : "rgba(255,255,255,0.6)", textAlign: "center", marginTop: 2 }}>
                {figureCaption}
              </Text>
            )}
          </View>
        )}
      </View>
      <View style={{ gap: 8, marginTop: 14 }}>
        {primary && (
          <Pressable onPress={() => onGo(primary.to)}
            style={({ pressed }) => [{
              backgroundColor: calm ? colors.navy : colors.white,
              borderRadius: 10, paddingVertical: 11, alignItems: "center", opacity: pressed ? 0.85 : 1,
            }]}>
            <Text style={{ color: calm ? colors.white : colors.navy, fontWeight: "700", fontSize: 14 }}>
              {primary.label}
            </Text>
          </Pressable>
        )}
        {secondary && (
          <Pressable onPress={() => onGo(secondary.to)}
            style={({ pressed }) => [{
              backgroundColor: calm ? colors.lineSoft : "rgba(255,255,255,0.12)",
              borderRadius: 10, paddingVertical: 10, alignItems: "center", opacity: pressed ? 0.85 : 1,
            }]}>
            <Text style={{ color: calm ? colors.inkMuted : "rgba(255,255,255,0.85)", fontWeight: "600", fontSize: 13.5 }}>
              {secondary.label}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function FocusPanelSkeleton() {
  return (
    <View style={[s.focusPanel, { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line }]}>
      <View style={{ height: 24, width: 120, borderRadius: 99, backgroundColor: colors.lineSoft }} />
      <View style={{ height: 20, width: "80%", borderRadius: 6, backgroundColor: colors.lineSoft, marginTop: 12 }} />
      <View style={{ height: 13, width: "60%", borderRadius: 4, backgroundColor: colors.lineSoft, marginTop: 8 }} />
      <View style={{ height: 42, borderRadius: 10, backgroundColor: colors.lineSoft, marginTop: 14 }} />
    </View>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

const CHIP_PALETTE = {
  navy:   [colors.navy50,      colors.navy],
  danger: [colors.dangerSoft,  colors.danger],
  green:  [colors.successSoft, colors.success],
  amber:  [colors.warningSoft, colors.warning],
  grey:   [colors.lineSoft,    colors.inkMuted],
} as const;

export function Chip({
  children, tone = "navy",
}: {
  children: ReactNode;
  tone?: keyof typeof CHIP_PALETTE;
}) {
  const [bg, fg] = CHIP_PALETTE[tone];
  return (
    <Text style={{
      alignSelf: "flex-start",
      backgroundColor: bg, color: fg,
      fontSize: 10, fontWeight: "700",
      paddingHorizontal: 8, paddingVertical: 3,
      borderRadius: 99, overflow: "hidden",
      textTransform: "uppercase", letterSpacing: 0.3,
    }}>
      {children}
    </Text>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────

export function Button({
  children, onPress, busy, disabled, variant = "primary", small, style,
}: {
  children: ReactNode;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  small?: boolean;
  style?: ViewStyle;
}) {
  const off = busy || disabled;
  const bg  = variant === "primary" ? colors.navy : colors.white;
  const fg  = variant === "primary" ? colors.white : variant === "danger" ? colors.danger : colors.inkMuted;
  const brd = variant === "primary" ? "transparent" : variant === "danger" ? colors.danger + "60" : colors.line;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [{
        backgroundColor: bg,
        borderRadius: 10,
        alignItems: "center",
        opacity: off ? 0.5 : pressed ? 0.85 : 1,
        paddingVertical: small ? 9 : 13,
        paddingHorizontal: small ? 14 : 16,
        borderWidth: variant === "primary" ? 0 : 1,
        borderColor: brd,
      }, style]}
    >
      {busy
        ? <ActivityIndicator color={fg} size="small" />
        : <Text style={{ color: fg, fontWeight: "700", fontSize: small ? 12.5 : 15 }}>{children}</Text>
      }
    </Pressable>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

export function Field({
  label, hint, error, ...rest
}: TextInputProps & { label: string; hint?: string; error?: string }) {
  return (
    <View style={{ gap: 5 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.inkSubtle}
        {...rest}
        style={[
          s.input,
          rest.multiline && { minHeight: 90, textAlignVertical: "top" },
          error && { borderColor: colors.danger },
          rest.style,
        ]}
      />
      {!!error && <Text style={{ fontSize: 11, color: colors.danger, marginTop: 2 }}>{error}</Text>}
      {!!hint && !error && <Text style={s.hint}>{hint}</Text>}
    </View>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────

export type Option = { value: string; label: string };

export function Select({
  label, value, onChange, options, placeholder = "Choose…", hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View style={{ gap: 5 }}>
      <Text style={s.label}>{label}</Text>
      <Pressable
        style={[s.input, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}
        onPress={() => setOpen(true)}
      >
        <Text style={{ color: current ? colors.ink : colors.inkSubtle, fontSize: 15 }}>
          {current?.label ?? placeholder}
        </Text>
        <Text style={{ color: colors.inkSubtle, fontSize: 13 }}>▾</Text>
      </Pressable>
      {!!hint && <Text style={s.hint}>{hint}</Text>}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            style={{ backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "72%", paddingBottom: 28 }}
            onPress={() => {}}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 18 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.ink }}>{label}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={12}>
                <Text style={{ fontSize: 16, color: colors.inkSubtle }}>✕</Text>
              </Pressable>
            </View>
            <ScrollView>
              {options.length === 0 && (
                <Text style={{ padding: 18, color: colors.inkMuted, fontSize: 14 }}>Nothing to choose from.</Text>
              )}
              {options.map((o) => (
                <Pressable
                  key={o.value}
                  onPress={() => { onChange(o.value); setOpen(false); }}
                  style={({ pressed }) => [{
                    paddingVertical: 15, paddingHorizontal: 18,
                    borderTopWidth: 1, borderTopColor: colors.lineSoft,
                    backgroundColor: o.value === value ? colors.navy50 : pressed ? colors.lineSoft : colors.white,
                    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                  }]}
                >
                  <Text style={{ fontSize: 15, color: o.value === value ? colors.navy : colors.ink, fontWeight: o.value === value ? "600" : "400" }}>
                    {o.label}
                  </Text>
                  {o.value === value && <Text style={{ color: colors.navy, fontSize: 16 }}>✓</Text>}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── DateField ────────────────────────────────────────────────────────────────

export function DateField({
  label, value, onChange, hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const d = value ? new Date(value + "T00:00:00") : new Date();
  return (
    <View style={{ gap: 5 }}>
      <Text style={s.label}>{label}</Text>
      <Pressable
        style={[s.input, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}
        onPress={() => setOpen(true)}
      >
        <Text style={{ color: value ? colors.ink : colors.inkSubtle, fontSize: 15 }}>
          {value ? prettyDate(value) : "Choose date"}
        </Text>
        {value
          ? <Pressable onPress={() => onChange("")} hitSlop={12}>
              <Text style={{ color: colors.inkSubtle }}>✕</Text>
            </Pressable>
          : <Text style={{ color: colors.inkSubtle, fontSize: 13 }}>📅</Text>
        }
      </Pressable>
      {!!hint && <Text style={s.hint}>{hint}</Text>}
      {open && (
        <DateTimePicker
          value={d}
          mode="date"
          onChange={(e, picked) => {
            if (Platform.OS !== "ios") setOpen(false);
            if (e.type === "set" && picked) onChange(toISODate(picked));
            if (Platform.OS === "ios" && e.type === "dismissed") setOpen(false);
          }}
        />
      )}
      {open && Platform.OS === "ios" && (
        <Button small variant="secondary" onPress={() => setOpen(false)}>Done</Button>
      )}
    </View>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

export function Tabs2({
  tabs, value, onChange,
}: {
  tabs: Option[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6 }}
    >
      {tabs.map((t) => (
        <Pressable
          key={t.value}
          onPress={() => onChange(t.value)}
          style={({pressed}) => [{
            paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
            borderColor: value === t.value ? colors.navy : colors.line,
            backgroundColor: value === t.value ? colors.navy : pressed ? colors.lineSoft : colors.white,
            opacity: pressed && value !== t.value ? 0.8 : 1,
          }]}
        >
          <Text style={{
            fontSize: 13, fontWeight: "600",
            color: value === t.value ? colors.white : colors.inkMuted,
          }}>
            {t.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

export function Message({
  m,
}: {
  m: { type: "success" | "error" | "info"; text: string } | null;
}) {
  if (!m) return null;
  const cfg = {
    success: { bg: colors.successSoft, fg: colors.success },
    error:   { bg: colors.dangerSoft,  fg: colors.danger },
    info:    { bg: colors.navy50,      fg: colors.navy },
  }[m.type];
  return (
    <View style={{ padding: 12, borderRadius: 10, backgroundColor: cfg.bg }}>
      <Text style={{ color: cfg.fg, fontSize: 13, lineHeight: 19 }}>{m.text}</Text>
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", padding: 48 }}>
      <ActivityIndicator color={colors.navy} size="large" />
    </View>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <Text style={{ textAlign: "center", color: colors.inkMuted, fontSize: 13.5, marginVertical: 28, lineHeight: 20 }}>
      {children}
    </Text>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

export function Row({
  children, style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, style]}>
      {children}
    </View>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.lineSoft, marginVertical: 2 }} />;
}

// ─── Confirm helper ──────────────────────────────────────────────────────────

export function confirm(
  title: string,
  message: string,
  okLabel = "Confirm",
  destructive = false,
): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(
      title, message,
      [
        { text: "Cancel", style: "cancel",    onPress: () => resolve(false) },
        { text: okLabel,  style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ));
}

// ─── Date utilities ───────────────────────────────────────────────────────────

export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const prettyDate = (iso?: string | null) =>
  iso
    ? new Date(iso.length === 10 ? iso + "T00:00:00" : iso)
        .toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";

export const pretty = (v?: string | null) =>
  v ? v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ") : "";

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
    ...{
      shadowColor:   "#141A2A",
      shadowOffset:  { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius:  3,
      elevation:     2,
    },
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 2,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    minWidth: 130,
    ...{
      shadowColor:   "#141A2A",
      shadowOffset:  { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius:  3,
      elevation:     2,
    },
  },
  focusPanel: {
    borderRadius: 18,
    padding: 20,
    overflow: "hidden",
    ...{
      shadowColor:   "#223D82",
      shadowOffset:  { width: 0, height: 6 },
      shadowOpacity: 0.15,
      shadowRadius:  16,
      elevation:     6,
    },
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.canvas,
  },
  hint: {
    fontSize: 11,
    color: colors.inkSubtle,
    marginTop: 3,
    lineHeight: 16,
  },
});
