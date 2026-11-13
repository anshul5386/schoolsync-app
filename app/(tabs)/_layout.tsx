import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../src/auth/AuthContext";
import { colors } from "../../src/theme";

const icon = (g: string) => ({ color }: { color: string }) => <Text style={{ color, fontSize: 18 }}>{g}</Text>;

/** Role-aware tab visibility (mirrors schoolsync-web mobile nav). */
export default function TabsLayout() {
  const { user, loading } = useAuth();
  const role = user?.role ?? "";
  const showAlerts = role !== "SUPER_ADMIN";
  const insets = useSafeAreaInsets();
  const tabBarBottom = Math.max(insets.bottom, 8);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas }}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }
  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs screenOptions={{
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
    }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("⌂") }} />
      <Tabs.Screen name="notices" options={{ title: "Notices", tabBarIcon: icon("▤") }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: icon("🔔"),
          ...(showAlerts ? {} : { tabBarButton: () => null, href: undefined }),
        }}
      />
      <Tabs.Screen name="menu" options={{ title: "Menu", tabBarIcon: icon("☰") }} />
    </Tabs>
  );
}
