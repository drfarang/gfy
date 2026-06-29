import { useCallback, useMemo, useReducer } from "react";
import type { Screen } from "./types";

export type Stack = readonly [Screen, ...Screen[]];

export interface TabState {
  readonly tabs: readonly Stack[];
  readonly active: number;
}

export type TabAction =
  | { type: "push"; screen: Screen }
  | { type: "pop" }
  | { type: "reset"; target: Screen | Stack }
  | { type: "open"; screen: Screen }
  | { type: "close"; index?: number }
  | { type: "switch"; index: number };

function copyStack(stack: readonly Screen[]): Stack {
  const [first, ...rest] = stack;
  return first ? [first, ...rest] : [{ kind: "forums" }];
}

function isStack(target: Screen | Stack): target is Stack {
  return Array.isArray(target);
}

export function createTabState(initial: Stack): TabState {
  return { tabs: [copyStack(initial)], active: 0 };
}

function editActive(state: TabState, edit: (stack: Stack) => Stack): TabState {
  const current = state.tabs[state.active];
  if (!current) return state;
  const next = edit(current);
  if (next === current) return state;
  return {
    ...state,
    tabs: state.tabs.map((stack, index) => (index === state.active ? next : stack)),
  };
}

/** Pure browser-style navigation over a non-empty list of non-empty stacks. */
export function tabsReducer(state: TabState, action: TabAction): TabState {
  switch (action.type) {
    case "push":
      return editActive(state, (stack) => [...stack, action.screen]);
    case "pop":
      return editActive(state, (stack) => (stack.length > 1 ? copyStack(stack.slice(0, -1)) : stack));
    case "reset": {
      const next = isStack(action.target) ? copyStack(action.target) : copyStack([action.target]);
      return editActive(state, () => next);
    }
    case "open": {
      const current = state.tabs[state.active];
      if (!current) return state;
      return { ...state, tabs: [...state.tabs, [...current, action.screen]] };
    }
    case "close": {
      if (state.tabs.length <= 1) return state;
      const index = action.index ?? state.active;
      if (!Number.isInteger(index) || index < 0 || index >= state.tabs.length) return state;

      const tabs = state.tabs.filter((_, candidate) => candidate !== index);
      const active =
        index < state.active
          ? state.active - 1
          : index === state.active
            ? Math.min(state.active, tabs.length - 1)
            : state.active;
      return { tabs, active };
    }
    case "switch":
      if (
        !Number.isInteger(action.index) ||
        action.index < 0 ||
        action.index >= state.tabs.length ||
        action.index === state.active
      ) {
        return state;
      }
      return { ...state, active: action.index };
  }
}

/**
 * React wrapper around the pure tab reducer. Each tab owns a screen stack;
 * opening a tab seeds it from the current stack and leaves it in the background.
 */
export function useTabs(initial: Stack) {
  const [state, dispatch] = useReducer(tabsReducer, initial, createTabState);

  const push = useCallback((screen: Screen) => dispatch({ type: "push", screen }), []);
  const pop = useCallback(() => dispatch({ type: "pop" }), []);
  const reset = useCallback((target: Screen | Stack) => dispatch({ type: "reset", target }), []);
  const openInTab = useCallback((screen: Screen) => dispatch({ type: "open", screen }), []);
  const closeTab = useCallback((index?: number) => dispatch({ type: "close", index }), []);
  const switchTo = useCallback((index: number) => dispatch({ type: "switch", index }), []);

  const stack = state.tabs[state.active]!;
  return useMemo(
    () => ({
      tabs: state.tabs,
      active: state.active,
      count: state.tabs.length,
      stack,
      current: stack[stack.length - 1]!,
      push,
      pop,
      reset,
      openInTab,
      closeTab,
      switchTo,
    }),
    [state.tabs, state.active, stack, push, pop, reset, openInTab, closeTab, switchTo],
  );
}
