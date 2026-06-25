import type { HttpClient } from "./http";
import type { Session } from "./types";
import { isLoggedIn, parseLoggedInUsername, parseSecurityToken } from "./parse";

export interface LoginResult {
  ok: boolean;
  session?: Session;
  error?: string;
}

/**
 * Username/password login. vBulletin accepts the plaintext password in
 * `vb_login_password` when the md5 fields are blank, so no client-side hashing
 * is needed. The auth cookies (bbuserid/bbpassword) are set on the response to
 * the POST (or its redirect), which the HttpClient's cookie jar captures.
 */
export async function login(
  http: HttpClient,
  username: string,
  password: string,
): Promise<LoginResult> {
  // Establish a guest session (bbsessionhash) first.
  await http.get("/");

  const res = await http.postForm("/login.php?do=login", {
    vb_login_username: username,
    vb_login_password: password,
    vb_login_md5password: "",
    vb_login_md5password_utf: "",
    cookieuser: "1",
    s: "",
    securitytoken: "guest",
    do: "login",
  });

  // The post-login confirmation page usually already reflects the session, but
  // re-check against the index to be sure.
  let html = res.html;
  if (!isLoggedIn(html)) {
    html = (await http.get("/")).html;
  }

  if (!isLoggedIn(html)) {
    return { ok: false, error: loginError(res.html) };
  }
  return { ok: true, session: sessionFrom(http, html) };
}

/** Verify a session built from imported browser cookies (already in the jar). */
export async function loginWithCookies(http: HttpClient): Promise<LoginResult> {
  const { html } = await http.get("/");
  if (!isLoggedIn(html)) {
    return {
      ok: false,
      error: "Imported cookies are not a logged-in session. Copy bbuserid and bbpassword from your browser while signed in.",
    };
  }
  return { ok: true, session: sessionFrom(http, html) };
}

/** Returns a refreshed Session if the current cookies are still authenticated. */
export async function verifySession(http: HttpClient): Promise<Session | null> {
  const { html } = await http.get("/");
  return isLoggedIn(html) ? sessionFrom(http, html) : null;
}

function sessionFrom(http: HttpClient, html: string): Session {
  return {
    cookies: http.jar.toObject(),
    userId: http.jar.get("bbuserid"),
    username: parseLoggedInUsername(html),
    securityToken: parseSecurityToken(html),
    savedAt: Date.now(),
  };
}

function loginError(html: string): string {
  if (/password you have entered is incorrect|username or password|invalid username/i.test(html)) {
    return "Incorrect username or password.";
  }
  if (/exceeded the number of login attempts|too many|strikes/i.test(html)) {
    return "Too many failed login attempts - the forum has temporarily locked logins for this account/IP.";
  }
  if (/verify|captcha|human verification/i.test(html)) {
    return "The login form requires a CAPTCHA. Use the cookie-import login instead.";
  }
  return "Login failed (no session cookie was set). Double-check the credentials, or try cookie import.";
}
