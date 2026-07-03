/**
 * Throwaway validation harness for the vb/ layer. Hits live gfy.com.
 *
 *   bun run scripts/probe.ts http      # exercise HTTP + cookie jar, save fixtures
 *   bun run scripts/probe.ts parse     # run parsers against saved fixtures
 *
 * Fixtures are written to $GFYTUI_FIXTURES (default ./scratch).
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadConfig } from "../src/config";
import { CookieJar } from "../src/vb/cookies";
import { HttpClient } from "../src/vb/http";
import {
  parseForums,
  parseThreadList,
  parseThread,
  parseSecurityToken,
  parsePostFormTokens,
  isLoggedIn,
} from "../src/vb/parse";
import { VbClient } from "../src/vb/client";

const cmd = process.argv[2] ?? "http";
const fixturesDir = process.env.GFYTUI_FIXTURES ?? "./scratch";

function titleOf(html: string): string {
  return html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? "(no title)";
}

async function save(name: string, html: string): Promise<void> {
  await mkdir(fixturesDir, { recursive: true });
  await writeFile(join(fixturesDir, name), html, "utf8");
}

async function cmdHttp(): Promise<void> {
  const config = await loadConfig();
  const jar = new CookieJar();
  const http = new HttpClient({
    baseUrl: config.baseUrl,
    userAgent: config.userAgent,
    jar,
    requestDelayMs: 600,
  });

  const home = await http.get("/");
  console.log(`GET /            -> ${home.status} | "${titleOf(home.html)}" | ${home.html.length} bytes`);
  console.log("cookies captured:", JSON.stringify(jar.toObject()));
  console.log("has bbsessionhash:", jar.has("bbsessionhash"));
  await save("home.html", home.html);

  // Forum ids come from the `id="fNN"` cells in the index; vBSEO hides them from hrefs.
  const forumIds = [...new Set([...home.html.matchAll(/id="f(\d+)"/g)].map((m) => Number(m[1])))];
  console.log(`\nforum cells on index: ${forumIds.length} -> ${forumIds.join(", ")}`);

  // Count threads on each forum (vBSEO thread URL = /<slug>/<TID>-<slug>.html) and keep the busiest.
  const threadIdsIn = (html: string): number[] =>
    [...new Set([...html.matchAll(/gfy\.com\/[a-z0-9-]+\/(\d+)-[a-z0-9-]/g)].map((m) => Number(m[1])))];

  let best: { id: number; html: string; threads: number[] } | null = null;
  for (const fid of forumIds) {
    const forum = await http.get(`/forumdisplay.php?f=${fid}`);
    const threads = threadIdsIn(forum.html);
    const titleIds = [...forum.html.matchAll(/thread_title_(\d+)/g)].length;
    console.log(`GET forumdisplay f=${fid} -> ${forum.status} | "${titleOf(forum.html).slice(0, 40)}" | vBSEO threads: ${threads.length}, thread_title_ ids: ${titleIds}`);
    if (!best || threads.length > best.threads.length) best = { id: fid, html: forum.html, threads };
  }

  if (best && best.threads.length > 0) {
    await save("forum.html", best.html);
    console.log(`\nsaved busiest forum f=${best.id} (${best.threads.length} threads) as forum.html`);
    const tid = best.threads[0]!;
    const thread = await http.get(`/showthread.php?t=${tid}`);
    console.log(`GET showthread t=${tid} -> ${thread.status} | "${titleOf(thread.html).slice(0, 50)}" | ${thread.html.length} bytes | final: ${thread.finalUrl}`);
    await save("thread.html", thread.html);
  } else {
    console.log("\nno forum yielded threads - check parsing");
  }
  console.log(`\nfixtures saved to ${fixturesDir}`);
}

async function cmdParse(): Promise<void> {
  const read = (name: string) => readFile(join(fixturesDir, name), "utf8");
  const home = await read("home.html");
  const forum = await read("forum.html");
  const thread = await read("thread.html");

  console.log("######## parseForums(home) ########");
  const forums = parseForums(home);
  console.log(`forums: ${forums.length}`);
  for (const f of forums.slice(0, 12)) {
    console.log(`  f${f.id} [${f.category ?? "-"}] ${f.title} :: ${(f.description ?? "").slice(0, 45)}`);
  }
  console.log("logged in (home):", isLoggedIn(home), "| token:", parseSecurityToken(home));

  console.log("\n######## parseThreadList(forum) ########");
  const list = parseThreadList(forum);
  console.log(`forum "${list.title}" f=${list.forumId} | page ${list.page}/${list.totalPages} | threads: ${list.items.length}`);
  for (const t of list.items.slice(0, 6)) {
    console.log(`  t${t.id}${t.sticky ? " [pin]" : ""} "${t.title.slice(0, 42)}" by ${t.author} | r=${t.replies} v=${t.views} | ${t.lastPost}`);
  }

  console.log("\n######## parseThread(thread) ########");
  const posts = parseThread(thread);
  console.log(`thread "${posts.title}" t=${posts.threadId} | page ${posts.page}/${posts.totalPages} | posts: ${posts.items.length}`);
  for (const p of posts.items.slice(0, 3)) {
    console.log(`  #${p.index} p${p.id} by ${p.author} @ ${p.date}`);
    console.log(`     ${p.body.replace(/\n/g, " ").slice(0, 110)}`);
  }
}

/**
 * Live client test. Auth via env (optional):
 *   GFY_COOKIES="bbuserid=..; bbpassword=.."  bun run scripts/probe.ts client
 *   GFY_USER=.. GFY_PASS=..                   bun run scripts/probe.ts client
 * With no env it browses as a guest.
 */
async function makeClient(): Promise<VbClient> {
  const config = await loadConfig();
  const client = new VbClient({ ...config, requestDelayMs: 600 });
  const cookies = process.env.GFY_COOKIES;
  const user = process.env.GFY_USER;
  const pass = process.env.GFY_PASS;
  if (cookies) {
    const r = await client.loginWithCookies(cookies);
    console.log("cookie login:", r.ok ? `ok as ${r.session?.username}` : `FAILED - ${r.error}`);
  } else if (user && pass) {
    const r = await client.login(user, pass);
    console.log("login:", r.ok ? `ok as ${r.session?.username}` : `FAILED - ${r.error}`);
  } else {
    console.log("(no creds in env - browsing as guest)");
  }
  return client;
}

async function cmdClient(): Promise<void> {
  const client = await makeClient();
  console.log("authenticated:", client.isAuthenticated, "| user:", client.username ?? "-");

  const forums = await client.forums();
  console.log(`\nforums: ${forums.length}`);
  const firstForum = forums[0];
  if (!firstForum) return;

  const list = await client.threads(firstForum.id, 1);
  console.log(`\nthreads in f${firstForum.id} "${list.title}" (page ${list.page}/${list.totalPages}): ${list.items.length}`);
  const firstThread = list.items.find((t) => !t.sticky) ?? list.items[0];
  if (!firstThread) return;

  const thread = await client.thread(firstThread.id, 1, firstThread.path);
  console.log(`\nthread t${firstThread.id} "${thread.title}" (page ${thread.page}/${thread.totalPages}): ${thread.items.length} posts`);
  const first = thread.items[0];
  if (first) console.log(`  #${first.index} by ${first.author}: ${first.body.replace(/\n/g, " ").slice(0, 90)}`);
}

/** Dry-run: scrape the reply-form tokens for a thread WITHOUT posting. Needs auth. */
async function cmdTokens(): Promise<void> {
  const threadId = Number(process.argv[3] ?? "0");
  if (!threadId) return console.log("usage: probe.ts tokens <threadId>  (with GFY_* env)");
  const client = await makeClient();
  if (!client.isAuthenticated) return console.log("not authenticated - set GFY_COOKIES or GFY_USER/GFY_PASS");
  const form = await client.http.get(`/newreply.php?do=newreply&t=${threadId}`);
  const tokens = parsePostFormTokens(form.html);
  console.log("reply-form tokens:", tokens ? JSON.stringify({ ...tokens, extra: Object.keys(tokens.extra) }, null, 2) : "NONE (login or thread issue)");
}

if (cmd === "http") await cmdHttp();
else if (cmd === "parse") await cmdParse();
else if (cmd === "client") await cmdClient();
else if (cmd === "tokens") await cmdTokens();
else console.log(`unknown command: ${cmd}`);
