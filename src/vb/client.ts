import type { AppConfig } from "../config";
import { CookieJar } from "./cookies";
import { HttpClient, type HttpResponse } from "./http";
import * as auth from "./auth";
import type { LoginResult } from "./auth";
import {
  parseForums,
  parseThreadList,
  parseThread,
  parsePostFormTokens,
  parseSecurityToken,
  parseErrors,
} from "./parse";
import type { Forum, ThreadSummary, Post, Paged, Session } from "./types";

export interface PostResult {
  ok: boolean;
  error?: string;
  /** URL we landed on after posting (the thread, on success). */
  url?: string;
}

/**
 * High-level vBulletin client for gfy.com. Holds the cookie jar + session and
 * exposes browse/read/post operations on top of the HTTP + parse layers.
 */
export class VbClient {
  readonly http: HttpClient;
  private readonly jar: CookieJar;
  private session: Session | null;

  constructor(config: AppConfig, session?: Session | null) {
    this.jar = new CookieJar(session?.cookies);
    this.http = new HttpClient({
      baseUrl: config.baseUrl,
      userAgent: config.userAgent,
      jar: this.jar,
      requestDelayMs: config.requestDelayMs,
    });
    this.session = session ?? null;
  }

  get isAuthenticated(): boolean {
    return Boolean(this.session?.username) || this.jar.has("bbuserid");
  }

  get username(): string | undefined {
    if (this.session?.username) return this.session.username;
    // Fallback display when we know we're logged in via cookies but name parse failed
    if (this.isAuthenticated && this.session?.userId) {
      return `user${this.session.userId}`;
    }
    return undefined;
  }

  /** Current session snapshot (with up-to-date cookies) for persistence. */
  sessionData(): Session | null {
    if (!this.session && !this.jar.has("bbuserid")) return null;
    return { ...this.session, cookies: this.jar.toObject() };
  }

  // --- auth ---------------------------------------------------------------

  async login(username: string, password: string): Promise<LoginResult> {
    const result = await auth.login(this.http, username, password);
    if (result.ok && result.session) {
      // Fallback to the username the user just typed if the page parser couldn't find it
      if (!result.session.username) {
        result.session.username = username;
      }
      this.session = result.session;
    }
    return result;
  }

  async loginWithCookies(cookieString: string): Promise<LoginResult> {
    for (const [name, value] of Object.entries(CookieJar.fromCookieString(cookieString).toObject())) {
      this.jar.set(name, value);
    }
    const result = await auth.loginWithCookies(this.http);
    if (result.ok && result.session) this.session = result.session;
    return result;
  }

  async verify(): Promise<boolean> {
    const session = await auth.verifySession(this.http);
    if (session) {
      this.session = session;
      return true;
    }
    return false;
  }

  async logout(): Promise<void> {
    const token = this.session?.securityToken;
    if (token && token !== "guest") {
      await this.http.get(`/login.php?do=logout&logouthash=${encodeURIComponent(token)}`).catch(() => {});
    }
    this.jar.clear();
    this.session = null;
  }

  // --- browse / read ------------------------------------------------------

  async forums(): Promise<Forum[]> {
    const { html } = await this.http.get("/");
    this.absorb(html);
    return parseForums(html);
  }

  async threads(forumId: number, page = 1): Promise<Paged<ThreadSummary>> {
    const { html } = await this.http.get(`/forumdisplay.php?f=${forumId}&page=${page}`);
    this.absorb(html);
    const result = parseThreadList(html);
    result.forumId ??= forumId;
    for (const t of result.items) t.forumId ??= forumId;
    return result;
  }

  async thread(threadId: number, page: number | "last" = 1): Promise<Paged<Post>> {
    // For "last" we request an absurdly high page; vBulletin clamps to the final
    // page and its "Page X of Y" then reports the real number. (goto=lastpost is
    // not used: vBSEO rewrites it to a "-last-post" URL whose pagenav still reads
    // "Page 1 of N", so we'd wrongly think we were on page 1.)
    const query = page === "last" ? "page=100000" : `page=${page}`;
    const { html } = await this.http.get(`/showthread.php?t=${threadId}&${query}`);
    this.absorb(html);
    const result = parseThread(html);
    result.threadId ??= threadId;
    return result;
  }

  // --- post ---------------------------------------------------------------

  async reply(threadId: number, message: string): Promise<PostResult> {
    const form = await this.http.get(`/newreply.php?do=newreply&t=${threadId}`);
    this.absorb(form.html);
    const tokens = parsePostFormTokens(form.html);
    if (!tokens) return { ok: false, error: "Could not load the reply form - are you still logged in?" };

    const res = await this.http.postForm(`/newreply.php?do=postreply&t=${threadId}`, {
      message,
      wysiwyg: "0",
      securitytoken: tokens.securitytoken,
      do: "postreply",
      t: String(threadId),
      p: "",
      specifiedpost: "0",
      parseurl: "1",
      loggedinuser: tokens.loggedinuser ?? this.session?.userId ?? "",
      s: "",
      posthash: tokens.posthash ?? "",
      poststarttime: tokens.poststarttime ?? "",
      sbutton: "Submit Reply",
      signature: "1",
    });
    return interpretPost(res);
  }

  async newThread(forumId: number, subject: string, message: string): Promise<PostResult> {
    const form = await this.http.get(`/newthread.php?do=newthread&f=${forumId}`);
    this.absorb(form.html);
    const tokens = parsePostFormTokens(form.html);
    if (!tokens) return { ok: false, error: "Could not load the new-thread form - are you still logged in?" };

    const res = await this.http.postForm(`/newthread.php?do=postthread&f=${forumId}`, {
      subject,
      message,
      wysiwyg: "0",
      securitytoken: tokens.securitytoken,
      do: "postthread",
      f: String(forumId),
      posthash: tokens.posthash ?? "",
      poststarttime: tokens.poststarttime ?? "",
      loggedinuser: tokens.loggedinuser ?? this.session?.userId ?? "",
      s: "",
      parseurl: "1",
      sbutton: "Submit New Thread",
      signature: "1",
    });
    return interpretPost(res);
  }

  /** Capture a fresh security token from any authenticated page. */
  private absorb(html: string): void {
    const token = parseSecurityToken(html);
    if (token && token !== "guest" && this.session) this.session.securityToken = token;
  }
}

export function interpretPost(res: HttpResponse): PostResult {
  const html = res.html;
  // vBulletin confirms a successful post with a "redirect" page that meta-refreshes
  // to the thread (or it 302s straight there, which our HTTP layer follows). That
  // page wraps its "Thank you for posting" message in <div class="panel">, which
  // parseErrors would read as an error - so we MUST check for success FIRST.
  const refreshUrl = (html.match(/http-equiv=["']?refresh["']?[^>]*?url=([^"'\s>]+)/i)?.[1] ?? "").replace(/&amp;/g, "&");
  const threadRe = /showthread|\/\d+-[a-z0-9-]*\.html|[?&]p=\d+/i;
  const wentToThread = threadRe.test(res.finalUrl) || threadRe.test(refreshUrl);
  if (wentToThread || /thank you for posting|your (?:reply|message|post) (?:has been|was)/i.test(html)) {
    return { ok: true, url: refreshUrl || res.finalUrl };
  }
  // Not a recognizable success page - now a real error panel is meaningful.
  const errors = parseErrors(html);
  if (errors.length > 0) return { ok: false, error: errors.join(" ").slice(0, 300), url: res.finalUrl };
  // No explicit error but we can't confirm success either.
  return { ok: true, url: res.finalUrl };
}
