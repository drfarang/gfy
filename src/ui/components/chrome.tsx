import { createContext, useContext, type ReactNode } from "react";
import "opentui-spinner/react"; // registers the <spinner> element via extend()
import { theme } from "../theme";

/**
 * Whether the bottom footer (StatusBar) is shown. Toggled globally with Ctrl+F
 * in App; the provider lives at the app root so every screen's footer responds.
 */
export const FooterContext = createContext(true);

/** Key that toggles the footer, appended to every screen's hint string. */
export const FOOTER_HINT = "^f footer";

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

/**
 * Bottom status / key-hint bar, glued to the bottom of each screen's column.
 * Lists the screen's shortcuts plus the global footer toggle. Hidden entirely
 * when the footer is toggled off (Ctrl+F) so content gets the full height.
 */
export function StatusBar({ hints, status }: { hints: string; status?: string }) {
  const visible = useContext(FooterContext);
  if (!visible) return null;
  const full = hints ? `${hints} · ${FOOTER_HINT}` : FOOTER_HINT;
  return (
    <box
      style={{
        flexDirection: "row",
        backgroundColor: theme.panel,
        paddingLeft: 1,
        paddingRight: 1,
      }}
    >
      <text fg={theme.fg}>{full}</text>
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
