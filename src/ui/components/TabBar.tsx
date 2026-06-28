import { theme } from "../theme";
import { truncate } from "../format";
import type { Stack } from "../tabs";
import type { Screen } from "../types";

/** Short label for a tab, taken from its top screen. */
function tabLabel(stack: Stack): string {
  const s = stack[stack.length - 1] as Screen | undefined;
  switch (s?.kind) {
    case "login":
      return "Sign in";
    case "forums":
      return "Forums";
    case "threads":
      return s.title || "Forum";
    case "thread":
      return s.title || "Thread";
    case "composeReply":
    case "composeThread":
      return "Compose";
    default:
      return "Tab";
  }
}

/** Horizontal tab strip. Renders nothing for a single tab (no clutter). */
export function TabBar({ tabs, active }: { tabs: Stack[]; active: number }) {
  if (tabs.length <= 1) return null;
  return (
    <box style={{ flexDirection: "row", backgroundColor: theme.panel }}>
      {tabs.map((st, i) => {
        const on = i === active;
        return (
          <text key={i} bg={on ? theme.selBg : theme.panel}>
            <span fg={on ? theme.accent : theme.panel}>{"▎"}</span>
            <span fg={on ? theme.accent : theme.fg}>{`${i + 1}`}</span>
            <span fg={on ? theme.selFg : theme.dim}>{` ${truncate(tabLabel(st), 18)} `}</span>
          </text>
        );
      })}
      <box style={{ flexGrow: 1 }} />
      <text fg={theme.dim}>{" ^1-9 / [ ] switch · ^w close "}</text>
    </box>
  );
}
