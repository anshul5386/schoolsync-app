import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import BrandLogo from "../src/components/BrandLogo";
import { colors } from "../src/theme";

const CONTACT_URL = "https://easool.com/contact";

export default function ContactScreen() {
  const router = useRouter();

  const openContactWeb = () => {
    WebBrowser.openBrowserAsync(CONTACT_URL).catch(() => Linking.openURL(CONTACT_URL));
  };

  const emailUs = () => {
    Linking.openURL("mailto:hello@easool.com?subject=Easool%20school%20demo");
  };

  return (
    <SafeAreaView style={s.page} edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.card}>
          <BrandLogo width={200} style={{ marginBottom: 12 }} />
          <Text style={s.tagline}>School operations, without the paperwork</Text>
          <Text style={s.title}>Get in touch</Text>
          <Text style={s.body}>
            Tell us about your school and we will schedule a demo. Easool helps Indian CBSE/ICSE schools run attendance,
            substitution, timetables, and parent alerts from one place.
          </Text>

          <Pressable onPress={openContactWeb} style={s.button}>
            <Text style={s.buttonText}>Contact us on easool.com</Text>
          </Pressable>
          <Pressable onPress={emailUs} style={s.buttonSecondary}>
            <Text style={s.buttonSecondaryText}>Email hello@easool.com</Text>
          </Pressable>

          <Pressable onPress={() => router.push("/login")} style={{ marginTop: 20, alignItems: "center" }}>
            <Text style={s.signIn}>Already have access? <Text style={s.signInBold}>Sign in</Text></Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 24, paddingVertical: 32 },
  card: {
    backgroundColor: colors.white, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: colors.line,
  },
  tagline: { fontSize: 13, color: colors.inkMuted, textAlign: "center", marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink, textAlign: "center", marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 21, color: colors.inkMuted, textAlign: "center", marginBottom: 20 },
  button: {
    backgroundColor: colors.navy, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginBottom: 10,
  },
  buttonText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  buttonSecondary: {
    backgroundColor: colors.canvas, borderRadius: 10, paddingVertical: 14, alignItems: "center",
    borderWidth: 1, borderColor: colors.line,
  },
  buttonSecondaryText: { color: colors.navy, fontWeight: "600", fontSize: 15 },
  signIn: { color: colors.inkMuted, fontSize: 13 },
  signInBold: { color: colors.navy, fontWeight: "700" },
});
