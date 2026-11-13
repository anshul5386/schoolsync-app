import { Tabs } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};
import { ActivityIndicator, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthContext";
import { colors } from "../../src/theme";

const tabBarIcon = (glyph: string) =>
  ({ color, size }: { color: string; size?: number }) => (
    <Text style={{ color, fontSize: size ?? 18 }}>{glyph}</Text>
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
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.line,
          paddingBottom: tabBarBottom,
          paddingTop: 8,
          height: 52 + tabBarBottom,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: tabBarIcon("⌂") }} />
      <Tabs.Screen name="notices" options={{ title: "Notices", tabBarIcon: tabBarIcon("▤") }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: tabBarIcon("🔔"),
          ...(showAlerts
            ? {}
            : {
                tabBarItemStyle: { display: "none", width: 0, height: 0 },
                tabBarButton: () => null,
              }),
        }}
      />
      <Tabs.Screen name="menu" options={{ title: "Menu", tabBarIcon: tabBarIcon("☰") }} />
    </Tabs>
  );
}
