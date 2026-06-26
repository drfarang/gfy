import { Component, type ReactNode } from "react";
import { useKeyboard } from "@opentui/react";
import { theme } from "../theme";
import { errMsg } from "../hooks";

/**
 * Catches render-time exceptions anywhere below it (a bad post body, an
 * unexpected page shape, an image failure) so one thrown error shows a readable
 * panel instead of tearing down the whole TUI. `resetKey` lets the parent clear
 * the error when the user navigates somewhere new; `onReset` is invoked when the
 * user dismisses the panel so the parent can navigate to safety.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode; resetKey?: unknown; onReset?: () => void },
  { error: string | null }
> {
  override state: { error: string | null } = { error: null };

  static getDerivedStateFromError(error: unknown): { error: string | null } {
    return { error: errMsg(error) };
  }

  override componentDidUpdate(prev: { resetKey?: unknown }): void {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  override render(): ReactNode {
    if (this.state.error === null) return this.props.children;
    return <ErrorFallback message={this.state.error} onDismiss={this.props.onReset} />;
  }
}

function ErrorFallback({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  useKeyboard((key) => {
    const n = String(key.name);
    if (n === "escape" || n === "return" || n === "enter" || n === "backspace" || n === "q") onDismiss?.();
  });
  return (
    <box style={{ flexGrow: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.bg }}>
      <box style={{ border: true, padding: 1, borderColor: theme.red, flexDirection: "column", gap: 1 }}>
        <text fg={theme.red}>Something went wrong</text>
        <text fg={theme.fg}>{message}</text>
        <text fg={theme.dim}>Press Esc/q to go back, or Ctrl+C to quit.</text>
      </box>
    </box>
  );
}
