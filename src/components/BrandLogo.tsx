import { Image, StyleSheet, View, ViewStyle, useWindowDimensions } from "react-native";

type Props = {
  /** Wordmark width in dp (height scales with image aspect). */
  width?: number;
  style?: ViewStyle;
};

/** Official Easool geometric wordmark — use on auth and marketing screens. */
export default function BrandLogo({ width, style }: Props) {
  const { width: screenW } = useWindowDimensions();
  const w = width ?? Math.min(screenW - 80, 220);
  return (
    <View style={[s.wrap, style]}>
      <Image
        source={require("../../assets/logo.png")}
        accessibilityLabel="Easool"
        style={{ width: w, height: w * 0.28 }}
        resizeMode="contain"
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
});
