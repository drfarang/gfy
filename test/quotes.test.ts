import { describe, expect, test } from "bun:test";
import { formatPostQuote, formatPostQuotes, quoteBody } from "../src/ui/quotes";

describe("quote formatting", () => {
  test("removes nested quotes and restores image BBCode", () => {
    expect(
      quoteBody("> Alice wrote:\n> old text\n\nNew reply\n[IMG:https://img.example/a.jpg]"),
    ).toBe("New reply\n[IMG]https://img.example/a.jpg[/IMG]");
  });

  test("includes author and post id in vBulletin markup", () => {
    expect(formatPostQuote({ id: 42, author: "Alice", body: "Hello" })).toBe(
      "[QUOTE=Alice;42]\nHello\n[/QUOTE]",
    );
  });

  test("joins multiple posts in their supplied order", () => {
    const text = formatPostQuotes([
      { id: 1, author: "Alice", body: "First" },
      { id: 2, author: "Bob", body: "Second" },
    ]);
    expect(text.indexOf("Alice;1")).toBeLessThan(text.indexOf("Bob;2"));
    expect(text).toContain("[/QUOTE]\n\n[QUOTE=");
  });
});
