import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "../src/auth/AuthContext";
import { colors } from "../src/theme";

/** Cold start: contact for guests, home for signed-in users (not login). */
export default function Index() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas }}>
          <ActivityIndicator color={colors.navy} />
        </View>
      </>
    );
  }
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      {user ? <Redirect href="/(tabs)/index" /> : <Redirect href="/contact" />}
    </>
  );
}
