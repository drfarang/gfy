import { useState } from "react";
import { useKeyboard } from "@opentui/react";
import type { VbClient } from "../../vb/client";
import type { ThreadSummary } from "../../vb/types";
import { useAsync, useDimensions } from "../hooks";
import { List } from "../components/List";
import { Header, StatusBar, Loading, ErrorView } from "../components/chrome";
import { truncate, oneLine, fmtCount } from "../format";
import { theme } from "../theme";
import { loadThreadListView } from "../threadListPaging";

export function ThreadListScreen({
  client,
  forumId,
  title,
  username,
  forumPath,
  onOpen,
  onOpenInTab,
  onBack,
  onNewThread,
}: {
  client: VbClient;
  forumId: number;
  title: string;
  username?: string;
  forumPath?: string;
  onOpen: (t: ThreadSummary) => void;
  onOpenInTab?: (t: ThreadSummary) => void;
  onBack: () => void;
  onNewThread: () => void;
}) {
  const { cols } = useDimensions();
  const [viewPage, setViewPage] = useState(1);
  const { data, loading, error, reload } = useAsync(
    () => loadThreadListView(client, forumId, viewPage, forumPath),
    [forumId, viewPage, forumPath],
  );
  const totalViews = data?.totalViews ?? 1;
  const pageLabel = data
    ? data.sourcePageStart === data.sourcePageEnd
      ? `page ${data.sourcePageStart}/${data.totalSourcePages} (${data.items.length} threads)`
      : `pages ${data.sourcePageStart}-${data.sourcePageEnd}/${data.totalSourcePages} (${data.items.length} threads)`
    : `view ${viewPage}/${totalViews}`;

  useKeyboard((key) => {
    const n = String(key.name);
    if (n === "r") reload();
    else if (n === "n") setViewPage((page) => Math.min(totalViews, page + 1));
    else if (n === "p") setViewPage((page) => Math.max(1, page - 1));
    else if (n === "c") {
      if (username) onNewThread();
    }
  });

  return (
    <box style={{ flexDirection: "column", flexGrow: 1 }}>
      <Header
        title={"GFY  ·  " + truncate(data?.title || title || "Forum", Math.max(10, cols - pageLabel.length - 7))}
        right={pageLabel}
      />
      {loading ? (
        <Loading label="Loading thread pages..." />
      ) : error ? (
        <ErrorView message={error} />
      ) : (
        <List<ThreadSummary>
          items={data?.items ?? []}
          onEnter={onOpen}
          onOpenInTab={onOpenInTab}
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
        hints={`enter open · ⇧enter/t newtab · j/k move · n/p views · ${username ? "c new · " : ""}, settings · r refresh · ←/h back`}
        status={username ? undefined : "log in to post"}
      />
    </box>
  );
}
