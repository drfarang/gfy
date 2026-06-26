import { describe, expect, test } from "bun:test";
import { htmlToText } from "../src/util/bbcode";

describe("htmlToText", () => {
  test("turns <br> into newlines and trims", () => {
    expect(htmlToText("line one<br />line two")).toBe("line one\nline two");
  });

  test("decodes entities in text", () => {
    expect(htmlToText("Tom &amp; Jerry &#9989;")).toBe("Tom & Jerry ✅");
  });

  test("keeps a real link with its URL but not when the text already is the URL", () => {
    expect(htmlToText('see <a href="http://x.test/page">here</a>')).toBe(
      "see here <http://x.test/page>",
    );
    expect(htmlToText('<a href="http://x.test/page">http://x.test/page</a>')).toBe(
      "http://x.test/page",
    );
  });

  test("emits [IMG:url] markers for content images", () => {
    expect(htmlToText('<img src="http://img.test/a.jpg" />')).toContain(
      "[IMG:http://img.test/a.jpg]",
    );
  });

  test("drops UI-asset images (smilies, buttons, status icons)", () => {
    expect(htmlToText('hi <img src="images/smilies/smile.gif" alt=":)" />')).toBe("hi");
    expect(htmlToText('<img class="inlineimg" src="x.gif" alt="View Post" />')).toBe("");
    expect(htmlToText('<img src="skins/gfy/images/buttons/quote.gif" />')).toBe("");
  });

  test("renders a vBulletin quote block as '> NAME wrote:' lines", () => {
    const html = `
      <div class="smallfont">Quote:</div>
      <table><tr><td class="alt2">
        <div>Originally Posted by <strong>Alice</strong>
          <a href="x"><img alt="View Post" src="skins/buttons/viewpost.gif" /></a>
        </div>
        <div>the quoted text</div>
      </td></tr></table>
      my reply`;
    const out = htmlToText(html);
    expect(out).toContain("Alice wrote:");
    expect(out).toContain("> the quoted text");
    expect(out).toContain("my reply");
    expect(out).not.toContain("Quote:");
    expect(out).not.toContain("View Post");
  });
});
