import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../src/auth/AuthContext";
import { colors } from "../src/theme";

/** Cold start: contact for guests, home for signed-in users (not login). */
export default function Index() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas }}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }
  if (user) return <Redirect href="/(tabs)" />;
  return <Redirect href="/contact" />;
}
