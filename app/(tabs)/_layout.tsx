import { Text, View } from "react-native";
import { Tabs } from "expo-router";
import { colors } from "../../src/theme";

/** Tab bar icon — text glyph with optional badge dot. */
function TabIcon({ glyph, focused, badge }: { glyph: string; focused: boolean; badge?: boolean }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 20, color: focused ? colors.navy : colors.inkSubtle }}>{glyph}</Text>
      {badge && (
        <View style={{
          position: "absolute", top: -2, right: -4,
          width: 7, height: 7, borderRadius: 99,
          backgroundColor: colors.danger, borderWidth: 1.5, borderColor: colors.white,
        }} />
      )}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle:           { backgroundColor: colors.white },
        headerTitleStyle:      { color: colors.ink, fontWeight: "700", fontSize: 17 },
        headerShadowVisible:   false,
        tabBarActiveTintColor:   colors.navy,
        tabBarInactiveTintColor: colors.inkSubtle,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.line,
          paddingBottom: 6,
          paddingTop: 4,
          height: 58,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => <TabIcon glyph="⌂" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="notices"
        options={{
          title: "Notices",
          tabBarIcon: ({ focused }) => <TabIcon glyph="📢" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ focused }) => <TabIcon glyph="🔔" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: "More",
          tabBarIcon: ({ focused }) => <TabIcon glyph="☰" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
