import { useCallback, useEffect, useRef, useState } from "react";

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
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
