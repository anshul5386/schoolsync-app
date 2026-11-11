import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useAuth } from "../../src/auth/AuthContext";
import { colors } from "../../src/theme";

const icon = (g: string) => ({ color }: { color: string }) => <Text style={{ color, fontSize: 18 }}>{g}</Text>;

/** Role-aware tab visibility (mirrors schoolsync-web mobile nav). */
export default function TabsLayout() {
  const { user } = useAuth();
  const role = user?.role ?? "";
  const showAlerts = role !== "SUPER_ADMIN";

  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: colors.white },
      headerTitleStyle: { color: colors.ink },
      tabBarActiveTintColor: colors.navy,
    }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("⌂") }} />
      <Tabs.Screen name="notices" options={{ title: "Notices", tabBarIcon: icon("▤") }} />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: icon("🔔"),
          href: showAlerts ? undefined : null,
        }}
      />
      <Tabs.Screen name="menu" options={{ title: "Menu", tabBarIcon: icon("☰") }} />
    </Tabs>
  );
}
