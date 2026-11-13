import { useCallback, type ReactElement } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { setStatusBarBackgroundColor, setStatusBarStyle } from "expo-status-bar";
import Svg, { Path, Rect } from "react-native-svg";
import { CONTACT_EMAIL, WHATSAPP_NUMBER } from "../src/config";
import { colors } from "../src/theme";

const WHATSAPP_TEXT = "Hi Easool, I'd like a demo for my school.";

type IconName = "attendance" | "substitution" | "timetable" | "alerts" | "notices" | "records" | "phone" | "mail" | "chevron";

/** Stroke icons (24×24 grid), drawn the same way as the design mockup. */
function Icon({ name, color = colors.navy, size = 20 }: { name: IconName; color?: string; size?: number }) {
  const p = { stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  const paths: Record<IconName, ReactElement> = {
    attendance: <><Path {...p} d="M9 11l3 3L22 4" /><Path {...p} d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
    substitution: <><Path {...p} d="M17 1l4 4-4 4" /><Path {...p} d="M3 11V9a4 4 0 0 1 4-4h14" /><Path {...p} d="M7 23l-4-4 4-4" /><Path {...p} d="M21 13v2a4 4 0 0 1-4 4H3" /></>,
    timetable: <><Rect {...p} x="3" y="4" width="18" height="18" rx="2" /><Path {...p} d="M16 2v4M8 2v4M3 10h18" /></>,
    alerts: <Path {...p} d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
    notices: <><Path {...p} d="M3 11l18-5v12L3 14v-3z" /><Path {...p} d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></>,
    records: <><Path {...p} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><Path {...p} d="M14 2v6h6M8 13h8M8 17h5" /></>,
    phone: <Path {...p} d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />,
    mail: <><Rect {...p} x="2" y="4" width="20" height="16" rx="2" /><Path {...p} d="m22 7-10 6L2 7" /></>,
    chevron: <Path {...p} d="m9 18 6-6-6-6" />,
  };
  return <Svg width={size} height={size} viewBox="0 0 24 24">{paths[name]}</Svg>;
}

const FEATURES: { icon: IconName; label: string }[] = [
  { icon: "attendance", label: "Attendance" },
  { icon: "substitution", label: "Substitution" },
  { icon: "timetable", label: "Timetables" },
  { icon: "alerts", label: "Parent alerts" },
  { icon: "notices", label: "Notices" },
  { icon: "records", label: "Records" },
];

/** The wordmark sits in the middle of a square PNG on white; crop to just the word. */
function LogoChip() {
  return (
    <View style={s.logoChip} accessible accessibilityLabel="Easool">
      <View style={{ width: 154, height: 41, overflow: "hidden" }}>
        <Image source={require("../assets/logo.png")} style={{ position: "absolute", width: 200, height: 200, left: -23, top: -80 }} />
      </View>
    </View>
  );
}

function ContactRow({ icon, title, sub, onPress }: { icon: IconName; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => [s.row, pressed && { opacity: 0.6 }]}>
      <View style={s.rowIcon}><Icon name={icon} size={18} /></View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        <Text style={s.rowSub}>{sub}</Text>
      </View>
      <Icon name="chevron" color={colors.inkSubtle} size={18} />
    </Pressable>
  );
}

export default function ContactScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // White status-bar icons over navy while this screen is showing.
  useFocusEffect(useCallback(() => {
    setStatusBarStyle("light");
    setStatusBarBackgroundColor(colors.navy, false);
    return () => {
      setStatusBarStyle("dark");
      setStatusBarBackgroundColor(colors.canvas, false);
    };
  }, []));

  const openWhatsApp = () => {
    Linking.openURL(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT)}`);
  };
  const emailUs = () => {
    Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Easool demo for my school")}`);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.navy }} contentContainerStyle={{ flexGrow: 1 }}
        bounces={false} showsVerticalScrollIndicator={false}>
        <View style={[s.hero, { paddingTop: insets.top + 28 }]}>
          <View pointerEvents="none" style={[s.ring, { width: 460, height: 460, left: -200, top: -200 }]} />
          <View pointerEvents="none" style={[s.blob, { width: 300, height: 300, right: -120, top: 60 }]} />

          <LogoChip />
          <Text style={s.title} accessibilityRole="header">School operations,{"\n"}without the paperwork.</Text>
          <Text style={s.subtitle}>For every Indian school — any board, any size.</Text>

          <View style={s.grid}>
            {FEATURES.map((f) => (
              <View key={f.label} style={s.tile}>
                <View style={s.tileIcon}><Icon name={f.icon} /></View>
                <Text style={s.tileLabel} numberOfLines={1} adjustsFontSizeToFit>{f.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          <Pressable onPress={() => router.push("/login")} accessibilityRole="button"
            style={({ pressed }) => [s.signIn, pressed && { opacity: 0.85 }]}>
            <Text style={s.signInText}>Sign in</Text>
          </Pressable>

          <Text style={s.kicker}>NEW TO EASOOL? TALK TO US</Text>
          {!!WHATSAPP_NUMBER && (
            <ContactRow icon="phone" title="WhatsApp us" sub="Fastest reply" onPress={openWhatsApp} />
          )}
          <ContactRow icon="mail" title={CONTACT_EMAIL} sub="Book a free demo for your school" onPress={emailUs} />
        </View>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  hero: { flex: 1, backgroundColor: colors.navy, paddingHorizontal: 24, paddingBottom: 28, overflow: "hidden" },
  ring: { position: "absolute", borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  blob: { position: "absolute", borderRadius: 999, backgroundColor: "rgba(255,255,255,0.04)" },
  logoChip: { alignSelf: "flex-start", backgroundColor: colors.white, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  title: { color: colors.white, fontSize: 28, lineHeight: 34, fontWeight: "900", letterSpacing: -0.4, marginTop: 26 },
  subtitle: { color: "#C9D3EC", fontSize: 14, lineHeight: 20, marginTop: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 22 },
  tile: {
    flexBasis: "30%", flexGrow: 1, alignItems: "center", gap: 9, paddingVertical: 14, paddingHorizontal: 6,
    borderRadius: 16, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)",
  },
  tileIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  tileLabel: { color: colors.white, fontSize: 12.5, fontWeight: "600", textAlign: "center" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 24, paddingTop: 22 },
  signIn: { backgroundColor: colors.navy, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  signInText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  kicker: { fontSize: 11.5, fontWeight: "700", letterSpacing: 1, color: colors.navy, marginTop: 18, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.line, minHeight: 56 },
  rowIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: colors.navy50, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
  rowSub: { fontSize: 12, color: colors.inkMuted },
});
