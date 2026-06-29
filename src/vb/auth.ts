import type { HttpClient } from "./http";
import type { Session } from "./types";
import { isLoggedIn, parseLoggedInUsername, parseSecurityToken } from "./parse";

export interface LoginResult {
  ok: boolean;
  session?: Session;
  error?: string;
}

/**
 * Username/password login for vB6.
 * Uses the AJAX endpoint /auth/ajax-login that the site JS posts the login form to.
 * The form fields are username, password, rememberme. Returns JSON on errors.
 * Cookies (bbuserid etc) are still set by server on success.
 */
export async function login(
  http: HttpClient,
  username: string,
  password: string,
): Promise<LoginResult> {
  // Establish a guest session (bbsessionhash etc) first.
  await http.get("/");

  // Note: use postForm (form encoded) even though site JS uses ajax; server accepts it.
  const res = await http.postForm("/auth/ajax-login", {
    username,
    password,
    rememberme: "on",
  });

  // ajax-login returns JSON like {"errors":[...]} or on success may 200 + set cookies + redirect instruction.
  // Re-fetch home to confirm session and grab tokens/name.
  let html = res.html;
  if (!isLoggedIn(html)) {
    html = (await http.get("/")).html;
  }

  if (!isLoggedIn(html)) {
    // try to surface a useful message from the json error response
    const errMsg = loginErrorFromAjax(res.html) || loginError(res.html);
    return { ok: false, error: errMsg };
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

function loginErrorFromAjax(html: string): string | null {
  try {
    const j = JSON.parse(html);
    if (j && Array.isArray(j.errors) && j.errors.length) {
      const first = j.errors[0];
      if (Array.isArray(first) && first[0]) {
        const code = String(first[0]);
        if (/invalid.*pass|pass.*invalid/i.test(code)) return "Incorrect username or password.";
        if (/lock|attempt/i.test(code)) return "Too many failed login attempts.";
        return code;
      }
      return String(first);
    }
  } catch {}
  return null;
}
