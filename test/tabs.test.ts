import { describe, expect, test } from "bun:test";
import {
  createTabState,
  tabsReducer,
  type Stack,
  type TabState,
} from "../src/ui/tabs";
import type { Screen } from "../src/ui/types";

const forums = (): Screen => ({ kind: "forums" });
const settings = (): Screen => ({ kind: "settings" });
const threads = (forumId: number): Screen => ({ kind: "threads", forumId, title: `Forum ${forumId}` });
const thread = (threadId: number): Screen => ({ kind: "thread", threadId, title: `Thread ${threadId}` });
const stack = (...screens: Screen[]): Stack => screens as unknown as Stack;

describe("tabsReducer", () => {
  test("initializes one active tab with a defensive stack copy", () => {
    const initial = stack(forums(), threads(26));
    const state = createTabState(initial);

    expect(state).toEqual({ tabs: [[{ kind: "forums" }, threads(26)]], active: 0 });
    expect(state.tabs[0]).not.toBe(initial);
  });

  test("push and pop edit only the active stack and never empty it", () => {
    let state = createTabState(stack(forums()));
    state = tabsReducer(state, { type: "push", screen: threads(26) });
    expect(state.tabs[0]).toEqual([forums(), threads(26)]);

    state = tabsReducer(state, { type: "pop" });
    expect(state.tabs[0]).toEqual([forums()]);
    expect(tabsReducer(state, { type: "pop" })).toBe(state);
  });

  test("reset accepts a single screen or a non-empty stack", () => {
    let state = createTabState(stack(forums(), threads(26)));
    state = tabsReducer(state, { type: "reset", target: settings() });
    expect(state.tabs[0]).toEqual([settings()]);

    const next = stack(forums(), threads(7), thread(99));
    state = tabsReducer(state, { type: "reset", target: next });
    expect(state.tabs[0]).toEqual(next);
    expect(state.tabs[0]).not.toBe(next);
  });

  test("opens a background tab seeded from the active stack", () => {
    const state = createTabState(stack(forums(), threads(26)));
    const next = tabsReducer(state, { type: "open", screen: thread(1002) });

    expect(next.active).toBe(0);
    expect(next.tabs).toEqual([
      [forums(), threads(26)],
      [forums(), threads(26), thread(1002)],
    ]);
    expect(next.tabs[1]).not.toBe(next.tabs[0]);
  });

  test("switches only to a valid tab index", () => {
    let state = tabsReducer(createTabState(stack(forums())), { type: "open", screen: threads(26) });
    state = tabsReducer(state, { type: "switch", index: 1 });
    expect(state.active).toBe(1);

    expect(tabsReducer(state, { type: "switch", index: -1 })).toBe(state);
    expect(tabsReducer(state, { type: "switch", index: 2 })).toBe(state);
    expect(tabsReducer(state, { type: "switch", index: 1.5 })).toBe(state);
  });

  test("refuses to close the final tab or an invalid index", () => {
    const state = createTabState(stack(forums()));
    expect(tabsReducer(state, { type: "close" })).toBe(state);

    const twoTabs = tabsReducer(state, { type: "open", screen: threads(26) });
    expect(tabsReducer(twoTabs, { type: "close", index: -1 })).toBe(twoTabs);
    expect(tabsReducer(twoTabs, { type: "close", index: 2 })).toBe(twoTabs);
  });

  test("closing before the active tab preserves the same logical tab", () => {
    let state = tabsReducer(createTabState(stack(forums())), { type: "open", screen: threads(1) });
    state = tabsReducer(state, { type: "open", screen: threads(2) });
    state = tabsReducer(state, { type: "switch", index: 2 });

    const activeStack = state.tabs[2];
    const next = tabsReducer(state, { type: "close", index: 0 });
    expect(next.active).toBe(1);
    expect(next.tabs[1]).toBe(activeStack);
  });

  test("closing the active tab selects its successor or the previous final tab", () => {
    const base: TabState = {
      tabs: [stack(forums()), stack(settings()), stack(threads(26))],
      active: 1,
    };
    const middleClosed = tabsReducer(base, { type: "close" });
    expect(middleClosed.active).toBe(1);
    expect(middleClosed.tabs[1]).toEqual([threads(26)]);

    const lastActive: TabState = { ...base, active: 2 };
    const lastClosed = tabsReducer(lastActive, { type: "close" });
    expect(lastClosed.active).toBe(1);
    expect(lastClosed.tabs).toHaveLength(2);
  });

  test("closing a background tab after the active tab leaves active unchanged", () => {
    const state: TabState = {
      tabs: [stack(forums()), stack(settings()), stack(threads(26))],
      active: 0,
    };
    const next = tabsReducer(state, { type: "close", index: 2 });
    expect(next.active).toBe(0);
    expect(next.tabs).toEqual([[forums()], [settings()]]);
  });
});
