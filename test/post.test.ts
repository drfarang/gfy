import { describe, expect, test } from "bun:test";
import { interpretPost } from "../src/vb/client";
import type { HttpResponse } from "../src/vb/http";

const res = (html: string, finalUrl = "https://www.gfy.com/newreply.php?do=postreply&t=1"): HttpResponse => ({
  html,
  status: 200,
  finalUrl,
});

describe("interpretPost", () => {
  test("treats vB's 'Thank you for posting' redirect panel as success, not an error", () => {
    // vBulletin's STANDARD_REDIRECT wraps the success message in class="panel",
    // which parseErrors scrapes - so this used to be misread as a failure and
    // the user was never returned to the thread.
    const html = `
      <div class="panel">
        <div style="...">Thank you for posting! You will now be taken to the thread.</div>
      </div>
      <meta http-equiv="Refresh" content="2; url=showthread.php?p=999&amp;t=1#post999" />`;
    const r = interpretPost(res(html));
    expect(r.ok).toBe(true);
    expect(r.url).toContain("showthread.php?p=999");
  });

  test("treats a 302 that landed on the thread as success", () => {
    const r = interpretPost(res("<div class='panel'>whatever</div>", "https://www.gfy.com/funny-gifs/1-funny-gifs.html"));
    expect(r.ok).toBe(true);
  });

  test("reports a real error panel (e.g. flood control) as failure", () => {
    const html = `<div class="panel">You must wait 30 seconds between posts. Please try again.</div>`;
    const r = interpretPost(res(html));
    expect(r.ok).toBe(false);
    expect(r.error).toContain("30 seconds");
  });

  test("reports the message-too-short error as failure", () => {
    const html = `<div class="standard_error">The message you have entered is too short. Please lengthen your message.</div>`;
    const r = interpretPost(res(html));
    expect(r.ok).toBe(false);
    expect(r.error).toContain("too short");
  });
});
