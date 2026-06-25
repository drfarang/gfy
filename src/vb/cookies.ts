/**
 * Minimal cookie jar. Bun's fetch does not persist cookies, so we capture
 * Set-Cookie headers ourselves (including across manual redirects) and replay
 * them as a single Cookie header.
 */
export class CookieJar {
  private store = new Map<string, string>();

  constructor(initial?: Record<string, string>) {
    if (initial) {
      for (const [name, value] of Object.entries(initial)) this.store.set(name, value);
    }
  }

  /** Parse a pasted "a=b; c=d" cookie string (browser-import flow). */
  static fromCookieString(input: string): CookieJar {
    const jar = new CookieJar();
    for (const part of input.split(/;\s*/)) {
      const eq = part.indexOf("=");
      if (eq <= 0) continue;
      const name = part.slice(0, eq).trim();
      const value = part.slice(eq + 1).trim();
      if (name) jar.store.set(name, value);
    }
    return jar;
  }

  setFromResponse(res: Response): void {
    const headers = res.headers as Headers & { getSetCookie?: () => string[] };
    const lines = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
    for (const line of lines) this.ingest(line);
  }

  /** Apply a single Set-Cookie header line. */
  ingest(setCookieLine: string): void {
    const first = setCookieLine.split(";", 1)[0] ?? "";
    const eq = first.indexOf("=");
    if (eq <= 0) return;
    const name = first.slice(0, eq).trim();
    const value = first.slice(eq + 1).trim();
    if (!name) return;
    // vBulletin clears cookies (e.g. on logout) by setting an empty / "deleted" value.
    if (value === "" || value.toLowerCase() === "deleted") {
      this.store.delete(name);
      return;
    }
    this.store.set(name, value);
  }

  clear(): void {
    this.store.clear();
  }

  get(name: string): string | undefined {
    return this.store.get(name);
  }

  set(name: string, value: string): void {
    this.store.set(name, value);
  }

  has(name: string): boolean {
    return this.store.has(name);
  }

  /** Serialize as a Cookie request header value. */
  header(): string {
    return [...this.store.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  toObject(): Record<string, string> {
    return Object.fromEntries(this.store);
  }

  get size(): number {
    return this.store.size;
  }
}
