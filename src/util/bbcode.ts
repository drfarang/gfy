import * as cheerio from "cheerio";

/**
 * Converts a vBulletin post-message HTML fragment into plain text suitable for a
 * terminal: <br> and block elements become newlines, smilies/images fall back to
 * their alt text, links keep their URL, and quote blocks are prefixed with "> ".
 *
 * cheerio (htmlparser2) decodes HTML entities in text nodes for us, so the output
 * is already real characters (curly quotes, emoji, accented latin-1, etc.).
 */
interface DomNode {
  type: string;
  data?: string;
  name?: string;
  attribs?: Record<string, string>;
  children?: DomNode[];
}

const BLOCK_TAGS = new Set([
  "p", "div", "tr", "li", "ul", "ol", "table", "h1", "h2", "h3", "h4", "h5", "blockquote", "pre",
]);

export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  const $ = cheerio.load(`<div id="__root">${html}</div>`);
  const root = $("#__root").get(0) as unknown as DomNode | undefined;
  const raw = root?.children?.map(renderNode).join("") ?? "";
  return raw
    .replace(/ /g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function renderNode(node: DomNode): string {
  if (node.type === "text") return node.data ?? "";
  if (node.type !== "tag") return "";

  const tag = node.name ?? "";
  if (tag === "br") return "\n";
  if (tag === "script" || tag === "style") return "";
  if (tag === "img") {
    const src = node.attribs?.src;
    const cls = node.attribs?.class ?? "";

    const isUiAsset =
      /\/skins\/|\/buttons\/|statusicon|\/smilies\/|navbits|\/misc\//i.test(src || "") ||
      cls.includes("inlineimg");
    if (src && !isUiAsset) {
      return `\n[IMG:${src}]\n`;
    }
    // UI chrome - smilies, buttons, status icons, the quote "View Post" arrow:
    // drop it (its alt text, e.g. "View Post", is noise in a terminal).
    return "";
  }

  const inner = node.children?.map(renderNode).join("") ?? "";

  if (tag === "a") {
    const href = node.attribs?.href ?? "";
    const text = inner.trim();
    if (href && text && /^https?:/i.test(href) && !href.includes(text)) {
      return `${inner} <${stripSession(href)}>`;
    }
    return inner;
  }

  const cls = node.attribs?.class ?? "";

  // vBulletin quote blocks render as:
  //   <div class="smallfont">Quote:</div>
  //   <table>…<td class="alt2">
  //     <div>Originally Posted by <strong>NAME</strong> <a>[View Post]</a></div>
  //     <div style="italic">…quoted text…</div>
  //   </td>…
  // Drop the bare "Quote:" label, turn the attribution into "NAME wrote:", and
  // prefix the quoted body with "> ".
  const flatInner = inner.replace(/\s+/g, " ").trim();
  if (tag === "div" && /\bsmallfont\b/.test(cls) && /^quote:?$/i.test(flatInner)) {
    return "";
  }
  if (tag === "div" && /^Originally Posted by\b/i.test(flatInner)) {
    const name = flatInner.replace(/^Originally Posted by\s+/i, "").trim();
    return "\n" + (name ? `${name} wrote:` : "Quote:") + "\n";
  }
  if ((tag === "td" || tag === "div") && /\balt2\b/.test(cls)) {
    return quoteBlock(inner);
  }

  if (tag === "blockquote" || /quote/i.test(cls)) {
    return quoteBlock(inner);
  }

  if (BLOCK_TAGS.has(tag)) return "\n" + inner + "\n";
  return inner;
}

/** Prefix every non-empty line with "> "; collapse runs of blank lines. */
function quoteBlock(inner: string): string {
  const body = inner.trim().replace(/\n[ \t]*\n[ \t]*\n+/g, "\n\n");
  if (!body) return "";
  const quoted = body
    .split("\n")
    .map((line) => (line.trim() ? "> " + line.trim() : ">"))
    .join("\n");
  return "\n" + quoted + "\n";
}

/** Drop vBulletin/vBSEO session params so displayed URLs stay clean. */
function stripSession(url: string): string {
  return url.replace(/([?&])s=[0-9a-f]{32}&?/i, "$1").replace(/[?&]$/, "");
}
