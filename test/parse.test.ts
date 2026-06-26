import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseForums,
  parseThreadList,
  parseThread,
  parsePagination,
  parseHiddenInputs,
  parseSecurityToken,
  parseLoggedInUsername,
  isLoggedIn,
} from "../src/vb/parse";

const fixture = (name: string): string =>
  readFileSync(join(import.meta.dir, "fixtures", name), "utf8");

const FORUMS = fixture("forums.html");
const THREADLIST = fixture("threadlist.html");
const THREAD = fixture("thread.html");

describe("parseForums", () => {
  const forums = parseForums(FORUMS);

  test("extracts each forum's id, title and description", () => {
    expect(forums).toHaveLength(2);
    const general = forums.find((f) => f.id === 26);
    expect(general?.title).toBe("General Chat");
    expect(general?.description).toContain("Talk about whatever");
    expect(forums.find((f) => f.id === 7)?.title).toBe("Buy & Sell");
  });

  test("decodes HTML entities in titles", () => {
    expect(forums.find((f) => f.id === 7)?.title).toBe("Buy & Sell");
  });

  test("attaches the category heading, skipping column labels", () => {
    expect(forums.every((f) => f.category === "General Categories")).toBe(true);
  });
});

describe("parseThreadList", () => {
  const list = parseThreadList(THREADLIST);

  test("parses rows with author / replies / views / last post", () => {
    expect(list.items).toHaveLength(2);
    const hello = list.items.find((t) => t.id === 1002);
    expect(hello?.title).toBe("Hello World & Friends");
    expect(hello?.author).toBe("RegularJoe");
    expect(hello?.replies).toBe(5);
    expect(hello?.views).toBe(1234); // strips the thousands comma
    expect(hello?.lastPost).toContain("LastPoster");
  });

  test("detects sticky / pinned threads", () => {
    expect(list.items.find((t) => t.id === 1001)?.sticky).toBe(true);
    expect(list.items.find((t) => t.id === 1002)?.sticky).toBe(false);
  });

  test("reads pagination and forum id", () => {
    expect(list.page).toBe(1);
    expect(list.totalPages).toBe(3);
    expect(list.forumId).toBe(26);
  });
});

describe("parseThread", () => {
  const thread = parseThread(THREAD);

  test("parses each post's author, date and index", () => {
    expect(thread.items).toHaveLength(2);
    const first = thread.items[0]!;
    expect(first.id).toBe(23383510);
    expect(first.author).toBe("RegularJoe");
    expect(first.date).toBe("07-09-2025, 07:06 AM");
    // Regression: vBSEO renders "#&nbsp;1", so the index regex must allow a space.
    expect(first.index).toBe(1);
    expect(thread.items[1]!.index).toBe(2);
  });

  test("keeps links (session param stripped) and inline image markers", () => {
    const body = thread.items[0]!.body;
    expect(body).toContain("this link <http://example.test/cool-page>");
    expect(body).not.toContain("s=ffff"); // session param removed
    expect(body).toContain("[IMG:http://img.example.test/photo.jpg]");
  });

  test("renders quotes as '> NAME wrote:' and drops vB quote chrome", () => {
    const body = thread.items[1]!.body;
    expect(body).toContain("RegularJoe wrote:");
    expect(body).toContain("> Hello everyone");
    expect(body).toContain("Welcome aboard!");
    expect(body).not.toContain("Quote:"); // the bare label is dropped
    expect(body).not.toContain("View Post"); // the viewpost button alt is dropped
  });

  test("reads pagination and resolves the thread id from hidden inputs", () => {
    expect(thread.page).toBe(2);
    expect(thread.totalPages).toBe(5);
    expect(thread.threadId).toBe(1002);
  });
});

describe("auth / session helpers", () => {
  test("parseSecurityToken reads the JS global", () => {
    expect(parseSecurityToken(FORUMS)).toBe("1700000000-abc123def456");
    expect(parseSecurityToken("<html></html>")).toBeUndefined();
  });

  test("isLoggedIn is true with a real token, false for a guest page", () => {
    expect(isLoggedIn(FORUMS)).toBe(true);
    expect(isLoggedIn('<a href="login.php?do=login">Log in</a>')).toBe(false);
  });

  test("parseLoggedInUsername reads the Welcome banner", () => {
    expect(parseLoggedInUsername(FORUMS)).toBe("TestUser");
  });

  test("parseHiddenInputs collects hidden form fields", () => {
    const hidden = parseHiddenInputs(THREAD);
    expect(hidden.t).toBe("1002");
  });
});

describe("parsePagination", () => {
  test("reads 'Page X of Y'", () => {
    expect(parsePagination("...Page 4 of 9...")).toEqual({ page: 4, totalPages: 9 });
  });

  test("defaults to a single page when absent", () => {
    expect(parsePagination("<html>no pages here</html>")).toEqual({ page: 1, totalPages: 1 });
  });
});
