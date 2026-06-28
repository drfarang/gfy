import { useCallback, useRef, useState } from "react";
import type { Screen } from "./types";

export type Stack = Screen[];

/**
 * Browser-style tabs over the screen-stack navigation: each tab is its own
 * stack, and the active tab's stack behaves exactly like the old single nav
 * (push/pop/reset/replace). New tabs are opened from a list row (Shift+Enter)
 * in the background. The active-tab operations read `activeRef` so they stay
 * stable (usable as effect deps) without going stale.
 */
export function useTabs(initial: Stack) {
  const [tabs, setTabs] = useState<Stack[]>([initial]);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  activeRef.current = Math.min(active, tabs.length - 1);

  const editActive = useCallback((fn: (st: Stack) => Stack) => {
    setTabs((ts) => ts.map((st, i) => (i === activeRef.current ? fn(st) : st)));
  }, []);

  const push = useCallback((s: Screen) => editActive((st) => [...st, s]), [editActive]);
  const pop = useCallback(() => editActive((st) => (st.length > 1 ? st.slice(0, -1) : st)), [editActive]);
  const reset = useCallback(
    (s: Screen | Stack) => editActive(() => (Array.isArray(s) ? s : [s])),
    [editActive],
  );
  const replace = useCallback(
    (s: Screen) => editActive((st) => [...st.slice(0, -1), s]),
    [editActive],
  );

  /** Open a screen in a new background tab, seeded with the active stack so
   *  "back" inside the new tab still reaches the list it came from. */
  const openInTab = useCallback((s: Screen) => {
    setTabs((ts) => [...ts, [...(ts[activeRef.current] ?? []), s]]);
  }, []);

  const closeTab = useCallback((index?: number) => {
    setTabs((ts) => {
      if (ts.length <= 1) return ts; // never close the last tab
      const i = index ?? activeRef.current;
      const next = ts.filter((_, j) => j !== i);
      setActive((a) => (i < a ? a - 1 : Math.min(a, next.length - 1)));
      return next;
    });
  }, []);

  const switchTo = useCallback((index: number) => {
    setActive(() => index);
  }, []);

  const idx = Math.min(active, tabs.length - 1);
  const stack = tabs[idx] ?? [{ kind: "forums" } as Screen];
  return {
    tabs,
    active: idx,
    count: tabs.length,
    stack,
    current: stack[stack.length - 1] as Screen,
    push,
    pop,
    reset,
    replace,
    openInTab,
    closeTab,
    switchTo,
  };
}
