import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "../../src/theme";

const icon = (g: string) => ({ color }: { color: string }) => <Text style={{ color, fontSize: 18 }}>{g}</Text>;

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: colors.white },
      headerTitleStyle: { color: colors.ink },
      tabBarActiveTintColor: colors.navy,
    }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("⌂") }} />
      <Tabs.Screen name="notices" options={{ title: "Notices", tabBarIcon: icon("▤") }} />
      <Tabs.Screen name="notifications" options={{ title: "Alerts", tabBarIcon: icon("🔔") }} />
      <Tabs.Screen name="menu" options={{ title: "Menu", tabBarIcon: icon("☰") }} />
    </Tabs>
  );
}
