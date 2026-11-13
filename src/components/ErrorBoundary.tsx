import { Component, ErrorInfo, ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "../theme";

type Props = {
  children: ReactNode;
  /** Clears session and restarts on a safe screen (avoids tabs crash loop). */
  onSignOut?: () => void | Promise<void>;
};
type State = { error: Error | null };

/** Catches render crashes (e.g. after login) so the app shows a message instead of closing. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary", error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: colors.canvas }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.ink, marginBottom: 8 }}>Something went wrong</Text>
          <Text style={{ fontSize: 13, color: colors.inkMuted, marginBottom: 16 }}>
            {this.state.error.message || "The app hit an unexpected error."}
          </Text>
          {this.state.error.stack ? (
            <Text style={{ fontSize: 10, color: colors.inkSubtle, marginBottom: 12 }} numberOfLines={10}>
              {this.state.error.stack.split("\n").slice(0, 8).join("\n")}
            </Text>
          ) : null}
          <Pressable
            onPress={() => this.setState({ error: null })}
            style={{ backgroundColor: colors.navy, paddingVertical: 12, borderRadius: 10, alignItems: "center", marginBottom: 10 }}
          >
            <Text style={{ color: colors.white, fontWeight: "600" }}>Try again</Text>
          </Pressable>
          {this.props.onSignOut ? (
            <Pressable
              onPress={async () => {
                await this.props.onSignOut?.();
                this.setState({ error: null });
              }}
              style={{ paddingVertical: 12, borderRadius: 10, alignItems: "center", borderWidth: 1, borderColor: colors.line }}
            >
              <Text style={{ color: colors.inkMuted, fontWeight: "600" }}>Sign out and start over</Text>
            </Pressable>
          ) : null}
        </View>
      );
    }
    return this.props.children;
  }
}
