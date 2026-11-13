import type { ComponentProps } from "react";
import { Tabs } from "expo-router";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthContext";
import { colors } from "../../src/theme";

/**
 * Explicit pressable renderer for every tab button (hidden tabs included).
 * Note: the "undefined is not a function … getPathFromState" crash after login was NOT caused by
 * this — it came from query-string v9 (ESM, default export only), which expo-router requires
 * as `queryString.stringify`. Keep query-string on v7 in package.json.
 */
function TabBarButton(props: BottomTabBarButtonProps) {
  const PressableImpl = PlatformPressable ?? Pressable;
  return <PressableImpl {...(props as ComponentProps<typeof PressableImpl>)} />;
}

const tabIcon = (glyph: string) =>
  ({ color, size }: { color: string; size: number }) => (
    <Text style={{ color, fontSize: size ?? 20 }}>{glyph}</Text>
  );

/** Role-aware tab visibility (mirrors schoolsync-web mobile nav). */
export default function TabsLayout() {
  const { user, loading } = useAuth();
  const role = user?.role ?? "";
  const showAlerts = role !== "SUPER_ADMIN";
  const insets = useSafeAreaInsets();
  const tabBarBottom = Math.max(insets.bottom, 8);

  if (loading || !user) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas }}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.white },
        headerTitleStyle: { color: colors.ink, fontWeight: "600" },
        headerShadowVisible: true,
        sceneStyle: { backgroundColor: colors.canvas },
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarButton: TabBarButton,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.line,
          paddingBottom: tabBarBottom,
          paddingTop: 8,
          height: 52 + tabBarBottom,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabIcon("⌂") }} />
      <Tabs.Screen name="notices" options={{ title: "Notices", tabBarIcon: tabIcon("▤") }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: tabIcon("🔔"),
          // Never use href: null on Android — use tabBarButton + hide via style instead.
          ...(showAlerts ? {} : { tabBarItemStyle: { display: "none" } }),
        }}
      />
      <Tabs.Screen name="menu" options={{ title: "Menu", tabBarIcon: tabIcon("☰") }} />
    </Tabs>
  );
}
