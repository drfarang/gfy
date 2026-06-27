import { useState } from "react";
import { useKeyboard } from "@opentui/react";
import type { VbClient } from "../../vb/client";
import type { ThreadSummary } from "../../vb/types";
import { useAsync, useDimensions } from "../hooks";
import { List } from "../components/List";
import { Header, StatusBar, Loading, ErrorView } from "../components/chrome";
import { truncate, oneLine, fmtCount } from "../format";
import { theme } from "../theme";

export function ThreadListScreen({
  client,
  forumId,
  title,
  username,
  onOpen,
  onBack,
  onNewThread,
}: {
  client: VbClient;
  forumId: number;
  title: string;
  username?: string;
  onOpen: (t: ThreadSummary) => void;
  onBack: () => void;
  onNewThread: () => void;
}) {
  const { cols } = useDimensions();
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(() => client.threads(forumId, page), [forumId, page]);
  const totalPages = data?.totalPages ?? 1;

  useKeyboard((key) => {
    const n = String(key.name);
    if (n === "r") reload();
    else if (n === "n") setPage((p) => Math.min(totalPages, p + 1));
    else if (n === "p") setPage((p) => Math.max(1, p - 1));
    else if (n === "c") {
      if (username) onNewThread();
    }
  });

  return (
    <box style={{ flexDirection: "column", flexGrow: 1 }}>
      <Header title={"GFY  ·  " + truncate(data?.title || title || "Forum", Math.max(10, cols - 16))} right={`page ${page}/${totalPages}`} />
      {loading ? (
        <Loading label="Loading threads..." />
      ) : error ? (
        <ErrorView message={error} />
      ) : (
        <List<ThreadSummary>
          items={data?.items ?? []}
          chromeRows={5}
          onEnter={onOpen}
          onBack={onBack}
          emptyText="No threads on this page."
          renderRow={(t, sel) => {
            const meta = `${truncate(t.author ?? "?", 14)}  ${fmtCount(t.replies)}r  ${truncate(t.lastPost ?? "", 17)}`;
            const titleBudget = Math.max(10, cols - meta.length - 8);
            return (
              <box style={{ flexDirection: "row", paddingLeft: 1, paddingRight: 1 }}>
                <text fg={t.sticky ? theme.yellow : theme.dim}>{t.sticky ? "* " : "  "}</text>
                <text fg={sel ? theme.selFg : theme.fg}>{truncate(oneLine(t.title), titleBudget)}</text>
                <box style={{ flexGrow: 1 }} />
                <text fg={theme.dim}>{meta}</text>
              </box>
            );
          }}
        />
      )}
      <StatusBar
        hints={`enter open · j/k move · J/K or shift+↑/↓ jump10 · n/p page · ${username ? "c new · " : ""}r refresh · ^t theme · ←/h back`}
        status={username ? undefined : "log in to post"}
      />
    </box>
  );
}
