import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../src/auth/AuthContext";
import { colors } from "../src/theme";

/** Signed-out users may only see /login and /register; signed-in users are kept off them. */
function Gate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const open = segments[0] === "login" || segments[0] === "register";
    if (!user && !open) router.replace("/login");
    else if (user && open) router.replace("/");
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas }}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.white }, headerTitleStyle: { color: colors.ink },
      headerTintColor: colors.navy, headerBackTitle: "Back", contentStyle: { backgroundColor: colors.canvas } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Gate />
    </AuthProvider>
  );
}
