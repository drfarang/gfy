import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { Forum, ThreadSummary, Post, Paged, PostFormTokens } from "./types";
import { htmlToText } from "../util/bbcode";

const clean = (s: any): string => (s == null ? "" : String(s)).replace(/\s+/g, " ").trim();

function intLoose(s: any): number | undefined {
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
  return (
    html.match(/SECURITYTOKEN\s*=\s*"([^"]+)"/)?.[1] ||
    html.match(/data-securitytoken=["']([^"']+)["']/i)?.[1] ||
    html.match(/["']securitytoken["']\s*[:=]\s*["']([^"']+)["']/i)?.[1]
  );
}

export function isLoggedIn(html: string): boolean {
  const token = parseSecurityToken(html);
  if (token && token !== "guest") return true;
  if (/do=logout|log\s*out/i.test(html)) return true;
  // vB6: when logged in the login dropdown is replaced by user menu / username
  if (/js-user-menu|logout|usercp|pmchat/i.test(html) && !/Login or Sign Up/i.test(html)) return true;
  return false;
}

export function parseLoggedInUsername(html: string): string | undefined {
  // pagedata often has it for logged in users
  const paged = html.match(/data-username=["']([^"']{2,30})["']/i)?.[1];
  if (paged && !/guest/i.test(paged)) return clean(paged);

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

  // vB6 user menu / username container
  name = clean($(".username-container, .js-user-menu, [class*=\"user-menu\"]").first().text());
  if (name && name.length > 1 && name.length < 30 && !/login|sign|guest/i.test(name)) return clean(name);

  // Look for member profile links that are likely the current user (skip register, newest, etc.)
  const userLink = $('a[href*="member.php?u="], a[href*="/members/"], a[href*="/member/"]')
    .filter((_, el) => {
      const h = $(el).attr("href") || "";
      const t = $(el).text().trim().toLowerCase();
      return !h.includes("register") && !t.includes("newest") && !t.includes("join") && t.length > 1 && t.length < 30;
    })
    .first();
  name = userLink.text().trim();
  if (name) return clean(name);

  // Look in common navbar/usercp areas for "Username" near logout or usercp
  const navbarText = $("#usercptoolbar, .navbar, #header, #topbar, .b-top-menu--user").text();
  const navbarMatch = navbarText.match(/([A-Za-z0-9_.-]{2,25})\s*(?:\|.*?(?:user cp|cp|logout|pm)|logout)/i);
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

export function parseForums(html: string): Forum[] {
  const $ = cheerio.load(html);
  const forums: Forum[] = [];

  // vB6 new style: id="forumNN"
  $("[id^=\"forum\"]").each((_, el) => {
    const idAttr = $(el).attr("id") ?? "";
    const m = /^forum(\d+)$/.exec(idAttr);
    if (!m) return;
    const id = Number(m[1]);
    const link = $(el).find('a[href*="/forum/"]').first();
    let href = link.attr("href") || "";
    try { if (href.startsWith("http")) href = new URL(href).pathname; } catch {}
    const title = clean(link.text() || $(el).text());
    if (!title || !id) return;
    const description = clean($(el).find(".smallfont, [class*=\"desc\"], p").first().text()) || undefined;
    let category: string | undefined;
    const prevHead = $(el).closest(".section, .widget, .b-module").find("h2, .header, .module-title").first().text();
    if (prevHead) category = clean(prevHead);
    const path = href || undefined;
    forums.push({ id, title, description, category, path });
  });

  if (forums.length > 0) return forums;

  // legacy vB3.8 td[id^="fNN"]
  const COLUMN_LABEL = /^(status|forum|last post|threads?|posts?|replies|views|rating|moderators?)$/i;
  $("td[id]").each((_, el) => {
    const idAttr = $(el).attr("id") ?? "";
    if (!/^f\d+$/.test(idAttr)) return;
    const id = Number(idAttr.slice(1));
    const title = clean($(el).find("a").first().text());
    if (!title) return;
    const description = clean($(el).find(".smallfont").first().text()) || undefined;
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

  // vB6 new
  const seen = new Set<number>();
  $(".topic-title, .js-topic-title, a[href*=\"/forum/\"]").each((_, el) => {
    const a = $(el).is("a") ? $(el) : $(el).find("a[href*=\"/forum/\"]").first();
    if (!a.length) return;
    const href = a.attr("href") || "";
    const m = href.match(/\/(\d+)-[a-z0-9-]/i);
    if (!m) return;
    const id = Number(m[1]);
    if (!Number.isFinite(id) || seen.has(id)) return;
    const title = clean(a.text() || $(el).text());
    if (!title || title.length < 4) return;
    seen.add(id);

    // Climb from the title link until the ancestor text contains the count keywords ("responses", "views") or sufficient content.
    // This keeps author clean while capturing "18 responses 540 views".
    let container = a;
    for (let i = 0; i < 6; i++) {
      const p = container.parent();
      if (!p.length) break;
      container = p;
      const t = clean(container.text());
      if (t.includes("responses") || t.includes("views") || t.includes("Last Post") || t.length > 120) break;
    }
    const rowText = clean(container.text());

    let author: string | undefined;
    let byMatch = rowText.match(/by\s+([A-Za-z0-9_.-]{2,20})/i);
    if (byMatch) author = byMatch[1];

    if (!author) {
      // first member link after (or near) the title
      const authorLink = container.find('a[href*="/member/"]').first();
      const at = clean(authorLink.text());
      if (at && at.toLowerCase() !== title.toLowerCase()) author = at;
    }
    if (!author) {
      byMatch = rowText.match(/by\s+([A-Za-z0-9_.-]{2,20})/i);
      if (byMatch) author = byMatch[1];
    }

    // replies: strongly prefer "18 responses" style; avoid date digits
    let replies = undefined as number | undefined;
    const repM = rowText.match(/(\d+)\s*(?:responses?|replies?|posts?|comments?)/i);
    if (repM) replies = Number(repM[1]);
    if (replies == null) {
      // fallback: look inside explicit stat containers
      const statTxt = container.find("[class*=\"stat\"], [class*=\"count\"], [class*=\"reply\"], [class*=\"response\"]").text();
      const sm = statTxt.match(/(\d+)/);
      if (sm) replies = Number(sm[1]);
    }
    const lastPost = clean(container.find("[class*=\"last\"], time, [class*=\"date\"]").first().text()) || rowText.match(/\d{1,2}[-/]\d{1,2}[-/]\d{2,4}[^,]*|\d{1,2}:\d{2}\s*(?:AM|PM)?/i)?.[0] || undefined;
    const sticky = /sticky|pin|announce/i.test(rowText) || /pinned/i.test(a.closest("[class]").attr("class") || "");

    let path: string | undefined;
    try {
      path = new URL(href, "https://gfy.com").pathname.replace(/\/+$/, "") || "/";
    } catch {
      path = href.split(/[?#]/, 1)[0]?.replace(/\/+$/, "") || undefined;
    }

    items.push({ id, title, path, author, replies, lastPost, sticky });
  });

  if (items.length > 0) {
    const { page, totalPages } = parsePagination(html);
    const forumId = numOr(html.match(/data-channelid=["']?(\d+)/i)?.[1]) ?? numOr(html.match(/nodeid=(\d+)/)?.[1]);
    return { items, page, totalPages, forumId, title: docTitle($) };
  }

  // legacy vB3
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

  // vB6 new - stricter: only containers that have a visible post number link or substantial post content
  $("[data-node-id], .b-post, .js-post").each((_, el) => {
    const hasPostMarker = $(el).find('.js-show-post-link, .b-post__count, a[href*="#post"]').length > 0;
    const bodyText = $(el).find(".js-post__content-text, .b-post__content").text().trim();
    if (!hasPostMarker && bodyText.length < 15) return; // skip chrome / empty

    const nodeIdAttr = $(el).attr("data-node-id") || $(el).attr("data-nodeid");
    const pid = nodeIdAttr ? Number(nodeIdAttr) : undefined;

    const authorLinks = $(el).find('a[href*="/member/"]').map((_, e) => clean($(e).text())).get().filter(Boolean);
    let author = authorLinks[authorLinks.length - 1] || clean($(el).find(".username, .author, .b-username").first().text());
    if (!author) author = "(unknown)";

    const info = clean($(el).find(".js-post-info, [class*=\"postinfo\"], .b-post__footer, .b-post__title").first().text());
    const date = info.match(/\d{2}-\d{2}-\d{4}[^,]*|\d{1,2}:\d{2}\s*(AM|PM)?/i)?.[0] || clean(info).slice(0, 30) || undefined;

    let index: number | undefined;
    const idxMatch = info.match(/#?\s*(\d+)/);
    if (idxMatch) index = Number(idxMatch[1]);
    if (index == null) {
      const countEl = $(el).find('.js-show-post-link, .b-post__count, [class*="show-post"], a[href*="#post"]').first();
      const cm = clean(countEl.text() || countEl.attr("href") || "").match(/#?\s*(\d+)(?:$|[^\d])/);
      if (cm) index = Number(cm[1]);
    }

    let bodyEl = $(el).find(".js-post__content-text, .b-post__content .js-post__content-text, .js-post__content").last();
    if (!bodyEl.length || bodyEl.text().trim().length < 5) {
      bodyEl = $(el).find(".b-post__content, .js-post__content, .post-content, .message-content").first();
    }
    const rawBody = bodyEl.length ? bodyEl.html() : $(el).html();
    let body = htmlToText(rawBody);
    body = body.replace(/^\s*#\d+\s+[^\n]+?(?:\n|$)/, "").replace(/^(Business|Announcements|Sell and Buy Forum)[^\n]*\n?/, "").trim();

    if (body && body.length > 5 && author !== "(unknown)") {
      items.push({ id: pid, author, date, body, index });
    }
  });

  if (items.length === 0) {
    // legacy vB3 table[id^="postNN"]
    $("table[id]").each((_, el) => {
      const idAttr = $(el).attr("id") ?? "";
      if (!/^post\d+$/.test(idAttr)) return;
      const pid = Number(idAttr.slice(4));

      const table = $(el);
      const msg = table.find(`#post_message_${pid}`);
      if (msg.length === 0) return;

      const author =
        clean(table.find("a.bigusername").first().text()) ||
        clean(table.find('a[href*="member.php"], a[href*="/members/"]').first().text()) ||
        "(unknown)";

      const theads = table.find(".thead");
      const date = clean(theads.first().text()) || undefined;
      let index: number | undefined;
      theads.each((_, th) => {
        const m = clean($(th).text()).match(/#\s*(\d+)/);
        if (m?.[1]) index = Number(m[1]);
      });

      items.push({ id: pid, author, date, body: htmlToText(msg.html()), index });
    });
  }

  const { page, totalPages } = parsePagination(html);
  const hidden = parseHiddenInputs(html);
  const threadId =
    numOr(hidden.t) ??
    numOr(html.match(/data-nodeid=["']?(\d+)/i)?.[1]) ??
    numOr(html.match(/showthread\.php\?t=(\d+)/)?.[1]) ??
    numOr(html.match(/\/(\d+)-[a-z0-9-]*\/?(\?|$)/i)?.[1]);

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
  // vB6 pagedata exposes nodeid / channelid
  const nodeid = html.match(/data-nodeid=["']?(\d+)/i)?.[1];
  const channel = html.match(/data-channelid=["']?(\d+)/i)?.[1];
  return {
    securitytoken,
    posthash: hidden.posthash,
    poststarttime: hidden.poststarttime,
    loggedinuser: hidden.loggedinuser,
    forumId: numOr(hidden.f) || numOr(channel),
    extra: { ...hidden, ...(nodeid ? { nodeid } : {}), ...(channel ? { channelid: channel } : {}) },
  };
}

// --- shared ---------------------------------------------------------------

export function parsePagination(html: string): { page: number; totalPages: number } {
  const m = html.match(/Page (\d+) of (\d+)/i);
  if (m?.[1] && m[2]) return { page: Number(m[1]), totalPages: Number(m[2]) };
  // vB6 often has "page2" link or pagedata pagenum + maxpages
  const p = numOr(html.match(/data-pagenum=["']?(\d+)/i)?.[1]);
  const mp = numOr(html.match(/data-maxpages=["']?(\d+)/i)?.[1] || html.match(/maxpages=["']?(\d+)/i)?.[1]);
  if (p && mp) return { page: p, totalPages: mp };
  const relLast = numOr(
    html.match(/<[^>]+rel=["']last["'][^>]+href=["'][^"']*\/page(\d+)/i)?.[1] ||
      html.match(/<[^>]+href=["'][^"']*\/page(\d+)[^"']*["'][^>]+rel=["']last["']/i)?.[1],
  );
  if (relLast) return { page: p || 1, totalPages: Math.max(p || 1, relLast) };
  // Find the highest *plausible* page number. vB6 sometimes injects huge bogus numbers (e.g. page100011).
  const all = [...html.matchAll(/\/page(\d+)/gi)].map((m) => Number(m[1])).filter((n) => Number.isFinite(n) && n > 0);
  if (all.length > 0) {
    const sorted = [...new Set(all)].sort((a, b) => b - a);
    let maxPg: number = sorted[0]!;
    // skip extreme outliers (e.g. 100011 when the next sane one is much smaller)
    for (let i = 0; i < sorted.length; i++) {
      const candidate: number = sorted[i]!;
      const next: number = sorted[i + 1] ?? 1;
      if (candidate / next < 30) {
        maxPg = candidate;
        break;
      }
    }
    if (maxPg >= 2) return { page: p || 1, totalPages: Math.max(p || 1, maxPg) };
  }

  // fallback to next/rel only
  const nextPg = html.match(/\/page(\d+)/i)?.[1];
  if (nextPg) return { page: p || 1, totalPages: Math.max(p || 1, 2, Number(nextPg)) };
  if (p) return { page: p, totalPages: p };
  return { page: 1, totalPages: 1 };
}

/** Page title with the site suffix stripped. */
function docTitle($: CheerioAPI): string | undefined {
  const t = clean($("title").first().text());
  if (!t) return undefined;
  return t.replace(/\s*-\s*(GoFuckYourself\.com|GFY).*$/i, "").trim() || t;
}
