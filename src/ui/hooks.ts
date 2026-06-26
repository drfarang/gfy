import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Screen } from "./types";

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Screen-stack navigation. `initial`/`reset` accept a single screen or a
 *  pre-seeded stack (e.g. land on a forum but keep the forum list underneath
 *  so "back" still reaches it). */
export function useNav(initial: Screen | Screen[]) {
  const [stack, setStack] = useState<Screen[]>(Array.isArray(initial) ? initial : [initial]);
  const push = useCallback((s: Screen) => setStack((st) => [...st, s]), []);
  const pop = useCallback(() => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st)), []);
  const reset = useCallback((s: Screen | Screen[]) => setStack(Array.isArray(s) ? s : [s]), []);
  const replace = useCallback((s: Screen) => setStack((st) => [...st.slice(0, -1), s]), []);
  // Stable identity per stack-state: the setters are already stable, so the
  // returned object only changes when the stack does. Prevents effects that
  // depend on `nav` from re-firing on unrelated re-renders.
  return useMemo(() => {
    const current = stack[stack.length - 1] as Screen;
    return { stack, current, push, pop, reset, replace, depth: stack.length };
  }, [stack, push, pop, reset, replace]);
}

export interface AsyncState<T> {
  data?: T;
  loading: boolean;
  error?: string;
  reload: () => void;
}

/** Run an async function, tracking loading/error/data, re-running when deps change. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<{ data?: T; loading: boolean; error?: string }>({ loading: true });
  const [nonce, setNonce] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ data: s.data, loading: true }));
    fnRef.current()
      .then((d) => !cancelled && setState({ data: d, loading: false }))
      .catch((e: unknown) => !cancelled && setState({ loading: false, error: errMsg(e) }));
    return () => {
      cancelled = true;
    };
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}

/** Terminal size, kept in sync on resize. Uses Node stdio (reliable under Bun). */
export function useDimensions() {
  const read = () => ({ cols: process.stdout.columns ?? 80, rows: process.stdout.rows ?? 24 });
  const [dims, setDims] = useState(read);
  useEffect(() => {
    const onResize = () => setDims(read());
    process.stdout.on("resize", onResize);
    return () => {
      process.stdout.off("resize", onResize);
    };
  }, []);
  return dims;
}
