import { Component, ErrorInfo, ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "../theme";

type Props = { children: ReactNode; onRetry?: () => void };
type State = { error: Error | null };

/** Catches render crashes (e.g. after login) so the app shows a message instead of closing. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) console.error("ErrorBoundary", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.canvas }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.ink, marginBottom: 8 }}>Something went wrong</Text>
          <Text style={{ fontSize: 13, color: colors.inkMuted, marginBottom: 16 }}>
            {this.state.error.message || "The app hit an unexpected error."}
          </Text>
          <Pressable
            onPress={() => this.setState({ error: null })}
            style={{ backgroundColor: colors.navy, paddingVertical: 12, borderRadius: 10, alignItems: "center" }}
          >
            <Text style={{ color: colors.white, fontWeight: "600" }}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
