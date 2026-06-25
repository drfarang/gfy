import type { CookieJar } from "./cookies";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class CloudflareChallengeError extends Error {
  constructor(message = "Cloudflare challenge encountered - switch to cookie import") {
    super(message);
    this.name = "CloudflareChallengeError";
  }
}

export interface HttpResponse {
  html: string;
  status: number;
  finalUrl: string;
}

export interface HttpClientOptions {
  baseUrl: string;
  userAgent: string;
  jar: CookieJar;
  requestDelayMs?: number;
}

type FormEncoding = "latin1" | "utf8";

const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);

// gfy.com serves ISO-8859-1; decode bytes as latin1 rather than UTF-8.
function decodeLatin1(buffer: ArrayBuffer): string {
  return Buffer.from(buffer).toString("latin1");
}

export class HttpClient {
  private lastRequestAt = 0;

  constructor(private readonly opts: HttpClientOptions) {}

  get jar(): CookieJar {
    return this.opts.jar;
  }

  absolute(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    const base = this.opts.baseUrl.replace(/\/+$/, "");
    return path.startsWith("/") ? base + path : `${base}/${path}`;
  }

  async get(path: string): Promise<HttpResponse> {
    return this.request("GET", path);
  }

  async postForm(
    path: string,
    fields: Record<string, string>,
    encoding: FormEncoding = "latin1",
  ): Promise<HttpResponse> {
    return this.request("POST", path, encodeForm(fields, encoding));
  }

  private baseHeaders(): Record<string, string> {
    const origin = this.opts.baseUrl.replace(/\/+$/, "");
    return {
      "User-Agent": this.opts.userAgent,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Upgrade-Insecure-Requests": "1",
      Referer: origin + "/",
    };
  }

  private async throttle(): Promise<void> {
    const delay = this.opts.requestDelayMs ?? 0;
    if (delay > 0) {
      const wait = this.lastRequestAt + delay - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    }
    this.lastRequestAt = Date.now();
  }

  /**
   * Performs the request, following redirects manually so Set-Cookie headers on
   * intermediate 30x responses (how vBulletin delivers the auth cookies after a
   * login POST) are captured by the jar.
   */
  private async request(method: string, path: string, body?: string): Promise<HttpResponse> {
    await this.throttle();
    let url = this.absolute(path);
    let currentMethod = method;
    let currentBody = body;
    let res: Response | undefined;

    for (let hop = 0; hop < 6; hop++) {
      const headers: Record<string, string> = { ...this.baseHeaders() };
      const cookie = this.opts.jar.header();
      if (cookie) headers.Cookie = cookie;
      if (currentBody != null) headers["Content-Type"] = "application/x-www-form-urlencoded";

      res = await fetch(url, {
        method: currentMethod,
        headers,
        body: currentBody,
        redirect: "manual",
      });
      this.opts.jar.setFromResponse(res);

      if (REDIRECT_STATUS.has(res.status)) {
        const location = res.headers.get("location");
        if (!location) break;
        await res.arrayBuffer().catch(() => {}); // drain socket
        url = new URL(location, url).toString();
        // 303 always GETs; browsers (and vB's flow) downgrade POST->GET on 301/302 too.
        if (res.status === 303 || (currentMethod === "POST" && (res.status === 301 || res.status === 302))) {
          currentMethod = "GET";
          currentBody = undefined;
        }
        continue;
      }
      break;
    }

    if (!res) throw new HttpError(0, `No response for ${url}`);

    const html = decodeLatin1(await res.arrayBuffer());

    if (isCloudflareChallenge(res.status, html)) throw new CloudflareChallengeError();
    if (res.status >= 400) throw new HttpError(res.status, `HTTP ${res.status} for ${url}`);

    return { html, status: res.status, finalUrl: url };
  }
}

function encodeForm(fields: Record<string, string>, encoding: FormEncoding): string {
  return Object.entries(fields)
    .map(([k, v]) => `${percentEncode(k, encoding)}=${percentEncode(v, encoding)}`)
    .join("&");
}

/**
 * x-www-form-urlencoded encoder. For latin1 (gfy.com), bytes <= 0xFF are encoded
 * directly; characters outside latin1 are first converted to HTML numeric entities
 * (which vBulletin stores faithfully) and then byte-encoded.
 */
export function percentEncode(input: string, encoding: FormEncoding): string {
  let out = "";
  for (const ch of input) {
    if (ch === " ") {
      out += "+";
      continue;
    }
    if (/[A-Za-z0-9*\-._]/.test(ch)) {
      out += ch;
      continue;
    }
    const code = ch.codePointAt(0) ?? 0;
    if (encoding === "latin1" && code <= 0xff) {
      out += pctByte(code);
    } else if (encoding === "latin1") {
      for (const e of `&#${code};`) out += pctByte(e.charCodeAt(0));
    } else {
      for (const b of new TextEncoder().encode(ch)) out += pctByte(b);
    }
  }
  return out;
}

function pctByte(byte: number): string {
  return "%" + byte.toString(16).toUpperCase().padStart(2, "0");
}

function isCloudflareChallenge(status: number, html: string): boolean {
  if (status !== 403 && status !== 503 && status !== 429) return false;
  return /just a moment|cdn-cgi\/challenge-platform|cf-browser-verification|_cf_chl_opt/i.test(html);
}
