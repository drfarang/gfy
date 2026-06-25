import type { ReactNode } from "react";
import "opentui-spinner/react"; // registers the <spinner> element via extend()
import { theme } from "../theme";

/** Top header bar: title on the left, optional context on the right. */
export function Header({ title, right }: { title: string; right?: string }) {
  return (
    <box
      style={{
        flexDirection: "row",
        backgroundColor: theme.panel,
        paddingLeft: 1,
        paddingRight: 1,
      }}
    >
      <text fg={theme.accent}>{title}</text>
      <box style={{ flexGrow: 1 }} />
      {right ? <text fg={theme.dim}>{right}</text> : null}
    </box>
  );
}

/** Bottom status / key-hint bar. */
export function StatusBar({ hints, status }: { hints: string; status?: string }) {
  return (
    <box
      style={{
        flexDirection: "row",
        backgroundColor: theme.panel,
        paddingLeft: 1,
        paddingRight: 1,
      }}
    >
      <text fg={theme.dim}>{hints}</text>
      <box style={{ flexGrow: 1 }} />
      {status ? <text fg={theme.yellow}>{status}</text> : null}
    </box>
  );
}

export function Centered({ children }: { children: ReactNode }) {
  return (
    <box style={{ flexGrow: 1, alignItems: "center", justifyContent: "center" }}>{children}</box>
  );
}

export function Loading({ label = "Loading..." }: { label?: string }) {
  return (
    <Centered>
      <box style={{ flexDirection: "row", alignItems: "center" }}>
        <spinner name="dots" color={theme.cyan} />
        <text fg={theme.cyan} style={{ marginLeft: 1 }}>{label}</text>
      </box>
    </Centered>
  );
}

export function ErrorView({ message }: { message: string }) {
  return (
    <Centered>
      <box style={{ border: true, padding: 1, borderColor: theme.red, flexDirection: "column" }}>
        <text fg={theme.red}>Error</text>
        <text fg={theme.fg}>{message}</text>
      </box>
    </Centered>
  );
}
