import type { Post } from "../vb/types";

/** Remove already-quoted lines so replying does not create quote pyramids. */
export function quoteBody(body: string): string {
  return body
    .split("\n")
    .filter((line) => !/^\s*>/.test(line))
    .join("\n")
    .replace(/\[IMG:([^\]\n]+)\]/g, "[IMG]$1[/IMG]")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Build the vBulletin quote block inserted into the reply editor. */
export function formatPostQuote(post: Post): string {
  const author = post.author.replace(/[\[\];\r\n]/g, "").trim() || "unknown";
  const attribution = post.id == null ? author : `${author};${post.id}`;
  const body = quoteBody(post.body) || "(no text)";
  return `[QUOTE=${attribution}]\n${body}\n[/QUOTE]`;
}

export function formatPostQuotes(posts: Post[]): string {
  return posts.map(formatPostQuote).join("\n\n");
}
