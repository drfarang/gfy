import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { Forum, ThreadSummary, Post, Paged, PostFormTokens } from "./types";
import { htmlToText } from "../util/bbcode";

const clean = (s: string): string => s.replace(/\s+/g, " ").trim();

function intLoose(s: string): number | undefined {
  const trimmed = clean(s);
  if (!trimmed) return undefined;
  const digits = trimmed.replace(/[^\d]/g, "");
  return digits ? Number(digits) : undefined;
}

function numOr(s: string | undefined): number | undefined {
  return s != null && /^\d+$/.test(s) ? Number(s) : undefined;
}

// --- session / auth helpers ----------------------------------------------

export function parseSecurityToken(html: string): string | undefined {
  return html.match(/SECURITYTOKEN\s*=\s*"([^"]+)"/)?.[1];
}

export function isLoggedIn(html: string): boolean {
  const token = parseSecurityToken(html);
  if (token && token !== "guest") return true;
  return /do=logout/i.test(html);
}

export function parseLoggedInUsername(html: string): string | undefined {
  // Try classic vB "Welcome," patterns first
  const m =
    html.match(/Welcome,\s*<b>\s*<a[^>]*>([^<]+)<\/a>/i) ??
    html.match(/Welcome,\s*<a[^>]*>([^<]+)<\/a>/i) ??
    html.match(/Welcome,\s*<b>([^<]+)<\/b>/i) ??
    html.match(/Welcome back,?\s*([A-Za-z0-9_.-]+)/i) ??
    html.match(/Hello,?\s*([A-Za-z0-9_.-]+)/i);
  if (m?.[1]) return clean(m[1]);

  // Use cheerio for more reliable extraction on modern/custom skins
  const $ = cheerio.load(html);

  // bigusername is commonly used for the current user in nav/postbit
  let name = $(".bigusername").first().text().trim();
  if (name) return clean(name);

  // Look for member profile links that are likely the current user (skip register, newest, etc.)
  const userLink = $('a[href*="member.php?u="], a[href*="/members/"]')
    .filter((_, el) => {
      const h = $(el).attr("href") || "";
      const t = $(el).text().trim().toLowerCase();
      return !h.includes("register") && !t.includes("newest") && !t.includes("join") && t.length > 1;
    })
    .first();
  name = userLink.text().trim();
  if (name) return clean(name);

  // Look in common navbar/usercp areas for "Username" near logout or usercp
  const navbarText = $("#usercptoolbar, .navbar, #header, #topbar").text();
  const navbarMatch = navbarText.match(/([A-Za-z0-9_.-]{2,25})\s*(?:\|.*?(?:user cp|cp|logout|pm))/i);
  if (navbarMatch?.[1]) return clean(navbarMatch[1]);

  // Sometimes the logout link itself has the name like "Log out [Username]"
  const logoutName = html.match(/do=logout[^>]*>(?:Log ?out|Logout)\s*(?:\[([A-Za-z0-9_.-]{2,25})\])?/i);
  if (logoutName?.[1]) return clean(logoutName[1]);

  return undefined;
}

/** Standard vBulletin error panel(s), e.g. flood control or login failure. */
export function parseErrors(html: string): string[] {
  const $ = cheerio.load(html);
  const errors: string[] = [];
  $(".panel, .standard_error, #inner_message_text").each((_, el) => {
    const txt = clean($(el).text());
    if (txt) errors.push(txt);
  });
  return errors;
}

// --- forum index ----------------------------------------------------------

const COLUMN_LABEL = /^(status|forum|last post|threads?|posts?|replies|views|rating|moderators?)$/i;

export function parseForums(html: string): Forum[] {
  const $ = cheerio.load(html);
  const forums: Forum[] = [];
  $("td[id]").each((_, el) => {
    const idAttr = $(el).attr("id") ?? "";
    if (!/^f\d+$/.test(idAttr)) return;
    const id = Number(idAttr.slice(1));
    const title = clean($(el).find("a").first().text());
    if (!title) return;
    const description = clean($(el).find(".smallfont").first().text()) || undefined;

    // The category heading is a thead cell that isn't a column label.
    let category: string | undefined;
    $(el)
      .closest("table")
      .find("td.thead")
      .each((_, th) => {
        const txt = clean($(th).text());
        if (!category && txt.length >= 3 && !COLUMN_LABEL.test(txt)) category = txt;
      });

    forums.push({ id, title, description, category });
  });
  return forums;
}

// --- thread list (forumdisplay) ------------------------------------------

export function parseThreadList(html: string): Paged<ThreadSummary> {
  const $ = cheerio.load(html);
  const items: ThreadSummary[] = [];

  $('a[id^="thread_title_"]').each((_, el) => {
    const a = $(el);
    const id = Number((a.attr("id") ?? "").replace("thread_title_", ""));
    if (!Number.isFinite(id)) return;
    const title = clean(a.text());
    if (!title) return;

    const titleTd = a.closest("td");
    const rest = titleTd.nextAll("td");
    const sticky = /^(pinned|sticky)\b/i.test(clean(titleTd.text()));

    items.push({
      id,
      title,
      author: clean(rest.eq(0).text()) || undefined,
      replies: intLoose(rest.eq(1).text()),
      views: intLoose(rest.eq(2).text()),
      lastPost: clean(rest.eq(3).text()) || undefined,
      sticky,
    });
  });

  const { page, totalPages } = parsePagination(html);
  const forumId = numOr(html.match(/id="threadbits_forum_(\d+)"/)?.[1]);
  return { items, page, totalPages, forumId, title: docTitle($) };
}

// --- thread (showthread) --------------------------------------------------

export function parseThread(html: string): Paged<Post> {
  const $ = cheerio.load(html);
  const items: Post[] = [];

  $("table[id]").each((_, el) => {
    const idAttr = $(el).attr("id") ?? "";
    if (!/^post\d+$/.test(idAttr)) return;
    const pid = Number(idAttr.slice(4));

    const table = $(el);
    const msg = table.find(`#post_message_${pid}`);
    if (msg.length === 0) return; // skip non-post tables that happen to match

    const author =
      clean(table.find("a.bigusername").first().text()) ||
      clean(table.find('a[href*="member.php"], a[href*="/members/"]').first().text()) ||
      "(unknown)";

    const theads = table.find(".thead");
    const date = clean(theads.first().text()) || undefined;
    let index: number | undefined;
    theads.each((_, th) => {
      const m = clean($(th).text()).match(/#(\d+)/);
      if (m?.[1]) index = Number(m[1]);
    });

    items.push({ id: pid, author, date, body: htmlToText(msg.html()), index });
  });

  const { page, totalPages } = parsePagination(html);
  const hidden = parseHiddenInputs(html);
  const threadId =
    numOr(hidden.t) ??
    numOr(html.match(/showthread\.php\?t=(\d+)/)?.[1]) ??
    numOr(html.match(/\/(\d+)-[a-z0-9-]*\.html/i)?.[1]);

  return { items, page, totalPages, threadId, title: docTitle($) };
}

// --- post form tokens (newreply / newthread) ------------------------------

export function parseHiddenInputs(html: string): Record<string, string> {
  const $ = cheerio.load(html);
  const out: Record<string, string> = {};
  $('input[type="hidden"]').each((_, el) => {
    const name = $(el).attr("name");
    if (name) out[name] = $(el).attr("value") ?? "";
  });
  return out;
}

export function parsePostFormTokens(html: string): PostFormTokens | null {
  const hidden = parseHiddenInputs(html);
  const securitytoken = hidden.securitytoken ?? parseSecurityToken(html);
  if (!securitytoken) return null;
  return {
    securitytoken,
    posthash: hidden.posthash,
    poststarttime: hidden.poststarttime,
    loggedinuser: hidden.loggedinuser,
    forumId: numOr(hidden.f),
    extra: hidden,
  };
}

// --- shared ---------------------------------------------------------------

export function parsePagination(html: string): { page: number; totalPages: number } {
  const m = html.match(/Page (\d+) of (\d+)/i);
  if (m?.[1] && m[2]) return { page: Number(m[1]), totalPages: Number(m[2]) };
  return { page: 1, totalPages: 1 };
}

/** Page title with the site suffix stripped. */
function docTitle($: CheerioAPI): string | undefined {
  const t = clean($("title").first().text());
  if (!t) return undefined;
  return t.replace(/\s*-\s*(GoFuckYourself\.com|GFY).*$/i, "").trim() || t;
}
