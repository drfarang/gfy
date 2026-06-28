import { useState, useRef, useCallback, useEffect, Fragment, type ReactNode } from "react";
import { useKeyboard } from "@opentui/react";
import type { ScrollBoxRenderable } from "@opentui/core";
import type { VbClient } from "../../vb/client";
import { useAsync, useDimensions } from "../hooks";
import { Header, StatusBar, Loading, ErrorView } from "../components/chrome";
import { truncate } from "../format";
import { theme } from "../theme";
import { ImageBlock } from "../components/ImageBlock";
import { ClipContext, type Rect } from "../clip";

function renderBody(body: string) {
  if (!body) return <text fg={theme.fg}>(no text)</text>;
  const parts = body.split(/(\n?\[IMG:[^\]\n]+\]\n?)/);
  return parts.map((part, i) => {
    const m = part.match(/^\n?\[IMG:([^\]\n]+)\]\n?$/);
    if (m && m[1]) {
      return <ImageBlock key={i} src={m[1]} />;
    }
    if (!part) return null;
    return <Fragment key={i}>{renderTextLines(part, i)}</Fragment>;
  });
}

const QUOTE_RE = /^((?:>\s?)+)(.*)$/;
const BAR = "▎";

/**
 * Render a text chunk. The parser emits quotes as "> " prefixed lines, with
 * "> NAME wrote:" as the attribution and repeated ">" for nesting depth. We
 * turn each quoted line into an accent gutter bar with the author highlighted
 * (same blue as post authors) and the body dimmed; normal lines render plainly.
 */
function renderTextLines(part: string, keyBase: number): ReactNode[] {
  const lines = part.split("\n");
  const out: ReactNode[] = [];
  let normal: string[] = [];
  let prevAttribution = false;

  const flushNormal = (k: number) => {
    if (normal.length === 0) return;
    out.push(
      <text key={`${keyBase}-n${k}`} fg={theme.fg}>
        {normal.join("\n")}
      </text>,
    );
    normal = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const q = lines[i]!.match(QUOTE_RE);
    if (!q) {
      normal.push(lines[i]!);
      prevAttribution = false;
      continue;
    }
    flushNormal(i);

    const depth = (q[1]!.match(/>/g) ?? []).length;
    const content = q[2]!.trim();

    if (!content) {
      // Collapse the blank line the quote markup inserts right after "X wrote:";
      // keep paragraph breaks elsewhere as a bar-only gutter line.
      if (!prevAttribution) {
        out.push(
          <text key={`${keyBase}-q${i}`}>
            <span fg={theme.accent}>{BAR.repeat(depth)}</span>
          </text>,
        );
      }
      continue;
    }

    const attr = content.match(/^(.+) wrote:$/);
    out.push(
      <text key={`${keyBase}-q${i}`}>
        <span fg={theme.accent}>{BAR.repeat(depth) + " "}</span>
        <span fg={attr ? theme.accent : theme.dim}>{attr ? attr[1] : content}</span>
      </text>,
    );
    prevAttribution = Boolean(attr);
  }
  flushNormal(lines.length);
  return out;
}

export function ThreadViewScreen({
  client,
  threadId,
  title,
  username,
  onReply,
  onBack,
}: {
  client: VbClient;
  threadId: number;
  title: string;
  username?: string;
  onReply: () => void;
  onBack: () => void;
}) {
  const { cols } = useDimensions();
  // Open on the last page ("last" lets vBulletin resolve which page that is);
  // once loaded we track the real page number for n/p navigation.
  const [page, setPage] = useState<number | "last">("last");
  const { data, loading, error } = useAsync(() => client.thread(threadId, page), [threadId, page]);
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ?? (typeof page === "number" ? page : 1);

  // Live viewport rect so inline Kitty images crop to the scroll area.
  const scrollRef = useRef<ScrollBoxRenderable>(null);
  const getClip = useCallback((): Rect | null => {
    const v = scrollRef.current?.viewport;
    if (!v) return null;
    return { x: v.screenX, y: v.screenY, width: v.width, height: v.height };
  }, []);

  // Hide the scrollbar entirely (keyboard/mouse scrolling still works). Setting
  // `visible` flips the bar to manual mode, so auto-recalc won't bring it back.
  useEffect(() => {
    const sb = scrollRef.current;
    if (sb) {
      sb.verticalScrollBar.visible = false;
      sb.horizontalScrollBar.visible = false;
    }
  });

  useKeyboard((key) => {
    // Ctrl/Meta combos are global (handled in App); don't also fire plain-key actions.
    if ((key as { ctrl?: boolean }).ctrl || (key as { meta?: boolean }).meta) return;
    const n = String(key.name);
    if (n === "r") {
      if (username) onReply();
    } else if (n === "n") setPage(Math.min(totalPages, currentPage + 1));
    else if (n === "p") setPage(Math.max(1, currentPage - 1));
    else if (n === "q" || n === "escape" || n === "backspace" || n === "left" || n === "h") onBack();
  });

  return (
    <box style={{ flexDirection: "column", flexGrow: 1 }}>
      <Header title={truncate(title, Math.max(10, cols - 14))} right={`page ${currentPage}/${totalPages}`} />
      {loading ? (
        <Loading label="Loading thread..." />
      ) : error ? (
        <ErrorView message={error} />
      ) : (
        <ClipContext.Provider value={getClip}>
          <scrollbox ref={scrollRef} focused viewportCulling={false} style={{ flexGrow: 1 }}>
            {(data?.items ?? []).map((post) => (
              <box
                key={post.id ?? post.index}
                style={{ flexDirection: "column", paddingLeft: 1, paddingRight: 1, marginBottom: 1 }}
              >
                <text>
                  <span fg={theme.accent}>{post.author}</span>
                  <span fg={theme.dim}>{`   ${post.date ?? ""}${post.index ? "   #" + post.index : ""}`}</span>
                </text>
                {renderBody(post.body)}
              </box>
            ))}
          </scrollbox>
        </ClipContext.Provider>
      )}
      <StatusBar
        hints={`↑/↓ scroll · n/p page · ${username ? "r reply · " : ""}^t theme · ←/q back`}
        status={username ? undefined : "log in to reply"}
      />
    </box>
  );
}
