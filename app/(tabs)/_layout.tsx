import { Tabs } from "expo-router";
import { colors } from "../../src/theme";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: colors.white },
      headerTitleStyle: { color: colors.ink },
      tabBarActiveTintColor: colors.navy,
    }}>
      <Tabs.Screen name="index" options={{ title: "Assignments" }} />
      <Tabs.Screen name="notices" options={{ title: "Notices" }} />
      <Tabs.Screen name="notifications" options={{ title: "Notifications" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
    </Tabs>
  );
}
