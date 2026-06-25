export function truncate(s: string, n: number): string {
  if (n <= 0) return "";
  return s.length <= n ? s : s.slice(0, Math.max(0, n - 1)) + "…";
}

export function oneLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function fmtCount(n?: number): string {
  return n == null ? "-" : n.toLocaleString("en-US");
}
