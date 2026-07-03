import { afterEach, describe, expect, test } from "bun:test";
import { VbClient } from "../src/vb/client";
import type { AppConfig } from "../src/config";

const THREAD_PATH = "/forum/simply-business/fucking-around-business-discussion/31462528-example-topic";
const FORUM_PATH = "/forum/simply-business/fucking-around-business-discussion";
const originalFetch = globalThis.fetch;
const asFetch = (fn: (input: string | URL | Request, init?: RequestInit) => Promise<Response>): typeof fetch =>
  fn as typeof fetch;

const config: AppConfig = {
  baseUrl: "https://beta.gfy.com",
  userAgent: "gfy-test",
  requestDelayMs: 0,
  editor: "vi",
  theme: "tokyo-night",
  uploadHost: "",
  uploadDir: "",
  uploadBaseUrl: "",
};

function threadHtml(page: number, totalPages: number): string {
  return `
    <html data-pagenum="${page}" data-maxpages="${totalPages}">
      <head><title>Example topic - GFY</title></head>
      <body>
        <article class="b-post" data-node-id="31462536">
          <a href="/member/42-example-user">ExampleUser</a>
          <a class="js-show-post-link" href="#post31462536">#1</a>
          <div class="js-post-info">#1 06-29-2026 10:15 AM</div>
          <div class="js-post__content-text">Current platform post body</div>
        </article>
      </body>
    </html>`;
}

function forumHtml(page: number, totalPages: number): string {
  return `
    <html data-channelid="33" data-pagenum="${page}">
      <head>
        <title>Fucking Around &amp; Business Discussion - GFY</title>
        <link rel="next" href="${FORUM_PATH}/page${Math.min(totalPages, page + 1)}" />
        <link rel="last" href="${FORUM_PATH}/page${totalPages}" />
      </head>
      <body>
        <article class="topic-row">
          <a class="topic-title" href="${FORUM_PATH}/3146254${page}-example-topic">Example topic ${page}</a>
          <a href="/member/42-example-user">ExampleUser</a>
          <span>${page} responses</span>
        </article>
      </body>
    </html>`;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("VbClient.threads", () => {
  test("loads current-platform forum pages with /pageN and preserves filters", async () => {
    const urls: string[] = [];
    globalThis.fetch = asFetch(async (input) => {
      urls.push(String(input));
      return new Response(forumHtml(2, 1002));
    });

    const result = await new VbClient(config).threads(33, 2, `${FORUM_PATH}?filter_time=time_all`);

    expect(urls).toEqual([`https://beta.gfy.com${FORUM_PATH}/page2?filter_time=time_all`]);
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(1002);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.path).toBe(`${FORUM_PATH}/31462542-example-topic`);
  });
});

describe("VbClient.thread", () => {
  test("loads a current-platform thread by its canonical slug path", async () => {
    const urls: string[] = [];
    globalThis.fetch = asFetch(async (input) => {
      urls.push(String(input));
      return new Response(threadHtml(1, 1));
    });

    const result = await new VbClient(config).thread(31462528, 1, `${THREAD_PATH}?p=31462536#post31462536`);

    expect(urls).toEqual([`https://beta.gfy.com${THREAD_PATH}`]);
    expect(result.items).toHaveLength(1);
    expect(result.threadId).toBe(31462528);
  });

  test("resolves the final page before loading a current-platform thread", async () => {
    const urls: string[] = [];
    globalThis.fetch = asFetch(async (input) => {
      const url = String(input);
      urls.push(url);
      return new Response(url.endsWith("/page3") ? threadHtml(3, 3) : threadHtml(1, 3));
    });

    const result = await new VbClient(config).thread(31462528, "last", THREAD_PATH);

    expect(urls).toEqual([
      `https://beta.gfy.com${THREAD_PATH}`,
      `https://beta.gfy.com${THREAD_PATH}/page3`,
    ]);
    expect(result.page).toBe(3);
    expect(result.totalPages).toBe(3);
  });
});
