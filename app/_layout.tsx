import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../src/auth/AuthContext";
import { queryClient } from "../src/queryClient";
import { colors } from "../src/theme";

/** Signed-out users may only see /login and /register; signed-in users are kept off them. */
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
    const open = segments[0] === "login" || segments[0] === "register";
    if (!user && !open) {
      router.replace("/login");
      return;
    }
    if (user && open) {
      router.replace("/");
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
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
