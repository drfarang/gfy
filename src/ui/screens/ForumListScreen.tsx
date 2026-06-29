import { useKeyboard } from "@opentui/react";
import type { VbClient } from "../../vb/client";
import type { Forum } from "../../vb/types";
import { useAsync, useDimensions } from "../hooks";
import { List } from "../components/List";
import { Header, StatusBar, Loading, ErrorView } from "../components/chrome";
import { truncate } from "../format";
import { theme } from "../theme";

export function ForumListScreen({
  client,
  username,
  onOpen,
  onOpenInTab,
  onQuit,
  onLogout,
  onLogin,
}: {
  client: VbClient;
  username?: string;
  onOpen: (f: Forum) => void;
  onOpenInTab?: (f: Forum) => void;
  onQuit: () => void;
  onLogout: () => void;
  onLogin?: () => void;
}) {
  const { cols } = useDimensions();
  const { data, loading, error, reload } = useAsync(() => client.forums(), []);

  useKeyboard((key) => {
    // Ctrl/Meta combos are global (handled in App); don't also fire plain-key actions.
    if ((key as { ctrl?: boolean }).ctrl || (key as { meta?: boolean }).meta) return;
    const n = String(key.name);
    if (n === "r") reload();
    else if (n === "q") onQuit();
    else if (n === "o") {
      if (username) {
        onLogout();
      } else {
        onLogin?.();
      }
    }
  });

  return (
    <box style={{ flexDirection: "column", flexGrow: 1 }}>
      <Header title="GFY  ·  Forums" right={username ? `@${username}` : "guest"} />
      {loading ? (
        <Loading label="Loading forums..." />
      ) : error ? (
        <ErrorView message={error} />
      ) : (
        <List<Forum>
          items={data ?? []}
          onEnter={onOpen}
          onOpenInTab={onOpenInTab}
          emptyText="No forums found."
          renderRow={(f, sel) => {
            const title = truncate(f.title, 38);
            const desc = f.description ? truncate(f.description, Math.max(0, cols - title.length - 8)) : "";
            return (
              <box style={{ paddingLeft: 1, paddingRight: 1 }}>
                <text>
                  <span fg={sel ? theme.selFg : theme.accent}>{title}</span>
                  {desc ? <span fg={theme.dim}>{"  " + desc}</span> : null}
                </text>
              </box>
            );
          }}
        />
      )}
      <StatusBar
        hints={`j/k move · enter open · ⇧enter/t newtab · , settings · r refresh · o ${username ? "sign out" : "sign in"} · q quit`}
        status={username ? undefined : "browsing as guest"}
      />
    </box>
  );
}
