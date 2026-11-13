import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../src/auth/AuthContext";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { queryClient } from "../src/queryClient";
import { colors } from "../src/theme";

const PUBLIC_ROUTES = new Set(["contact", "login", "register"]);

/** Signed-out users see contact/login only; signed-in users land in the app. */
function Gate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const route = String(segments[0] ?? "");
    if (!user && !PUBLIC_ROUTES.has(route) && route !== "index") {
      router.replace("/contact");
      return;
    }
    // One place post-login navigation (avoids racing login.tsx with tabs mount).
    if (user && (PUBLIC_ROUTES.has(route) || route === "index")) {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas }}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }
  return (
    <ErrorBoundary>
      <Stack screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTitleStyle: { color: colors.ink },
        headerTintColor: colors.navy,
        headerBackTitle: "Back",
        headerShadowVisible: true,
        contentStyle: { backgroundColor: colors.canvas },
      }} />
    </ErrorBoundary>
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
