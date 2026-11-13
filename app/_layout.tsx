import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../src/auth/AuthContext";
import { queryClient } from "../src/queryClient";
import { colors } from "../src/theme";

const PUBLIC_ROUTES = new Set(["contact", "login", "register"]);

/** Signed-out users see contact/login only; signed-in users land in the app. */
function Gate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [routed, setRouted] = useState(false);

  useEffect(() => {
    if (loading) {
      setRouted(false);
      return;
    }
    const route = segments[0] ?? "";
    const isPublic = PUBLIC_ROUTES.has(String(route));
    if (!user && !isPublic && route !== "index") {
      router.replace("/contact");
      return;
    }
    if (user && (route === "login" || route === "register" || route === "contact")) {
      router.replace("/(tabs)");
      return;
    }
    setRouted(true);
  }, [user, loading, segments, router]);

  if (loading || !routed) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas }}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: colors.white },
      headerTitleStyle: { color: colors.ink },
      headerTintColor: colors.navy,
      headerBackTitle: "Back",
      headerShadowVisible: true,
      contentStyle: { backgroundColor: colors.canvas },
      animation: "slide_from_right",
    }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="contact" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" translucent={false} backgroundColor={colors.canvas} />
          <Gate />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
