import { useCallback, useEffect, useRef, useState } from "react";
import { useKeyboard } from "@opentui/react";
import type { TextareaRenderable } from "@opentui/core";
import { unlink } from "node:fs/promises";
import type { VbClient } from "../../vb/client";
import { errMsg } from "../hooks";
import { Header, StatusBar } from "../components/chrome";
import { theme } from "../theme";
import { COMPOSER_EMOJIS } from "../emojis";
import { formatPostQuotes, quoteBody } from "../quotes";
import { truncate } from "../format";
import type { QuoteContext } from "../types";
import type { Post } from "../../vb/types";
import { uploadImageFile, clipboardImageToTempFile, parseDroppedImagePath, type UploadTarget } from "../../util/upload";

type Props = {
  client: VbClient;
  title: string;
  upload?: UploadTarget;
  onDone: () => void;
  onCancel: () => void;
} & (
  | { mode: "reply"; threadId: number; quoteContext?: QuoteContext }
  | { mode: "thread"; forumId: number }
);

interface SelectedQuote {
  post: Post;
  page: number;
}

function selectedQuoteKey(post: Post, page: number, index: number): string {
  return post.id == null ? `${page}:${post.index ?? index}` : `post:${post.id}`;
}

function quotePreview(post: Post): string {
  return truncate(quoteBody(post.body).replace(/\s+/g, " ") || "(no text)", 90);
}

export function ComposeScreen(props: Props) {
  const { client, mode, title, upload, onDone, onCancel } = props;
  const bodyRef = useRef<TextareaRenderable>(null);
  const quoteCursorRef = useRef(0);
  const quoteRequestRef = useRef(0);
  const [subject, setSubject] = useState("");
  const [focus, setFocus] = useState<"subject" | "body" | "emoji" | "quotes">(
    mode === "thread" ? "subject" : "body",
  );
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteContext, setQuoteContext] = useState<QuoteContext | undefined>(
    props.mode === "reply" ? props.quoteContext : undefined,
  );
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [selectedQuotes, setSelectedQuotes] = useState<Map<string, SelectedQuote>>(() => new Map());
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  function closeEmojiPicker() {
    setEmojiOpen(false);
    setFocus("body");
  }

  function insertEmoji(value: unknown) {
    if (typeof value !== "string") return;
    bodyRef.current?.insertText(value);
    closeEmojiPicker();
  }

  function closeQuotePicker() {
    setQuoteOpen(false);
    setFocus("body");
    setQuoteError("");
  }

  async function loadQuotePage(page: number | "last") {
    if (props.mode !== "reply" || quoteLoading) return;
    const request = ++quoteRequestRef.current;
    setQuoteLoading(true);
    setQuoteError("");
    try {
      const result = await client.thread(props.threadId, page);
      if (request !== quoteRequestRef.current) return;
      setQuoteContext({ posts: result.items, page: result.page, totalPages: result.totalPages });
      setQuoteIndex(0);
    } catch (e) {
      if (request === quoteRequestRef.current) setQuoteError(errMsg(e));
    } finally {
      if (request === quoteRequestRef.current) setQuoteLoading(false);
    }
  }

  function openQuotePicker() {
    if (props.mode !== "reply") return;
    quoteCursorRef.current = bodyRef.current?.cursorOffset ?? 0;
    setEmojiOpen(false);
    setQuoteOpen(true);
    setFocus("quotes");
    if (!quoteContext || quoteContext.posts.length === 0) {
      void loadQuotePage(quoteContext?.page ?? "last");
    }
  }

  function changeQuotePage(direction: number) {
    if (!quoteContext || quoteLoading) return;
    const page = Math.max(1, Math.min(quoteContext.totalPages, quoteContext.page + direction));
    if (page !== quoteContext.page) void loadQuotePage(page);
  }

  function toggleCurrentQuote() {
    const post = quoteContext?.posts[quoteIndex];
    if (!post || !quoteContext) return;
    setQuoteError("");
    const key = selectedQuoteKey(post, quoteContext.page, quoteIndex);
    setSelectedQuotes((current) => {
      const next = new Map(current);
      if (next.has(key)) next.delete(key);
      else next.set(key, { post, page: quoteContext.page });
      return next;
    });
  }

  function insertSelectedQuotes(fallback?: SelectedQuote) {
    const textarea = bodyRef.current;
    if (!textarea) return;

    const selected = [...selectedQuotes.values()];
    if (selected.length === 0 && fallback) selected.push(fallback);
    if (selected.length === 0) {
      setQuoteError("Select at least one post with Space.");
      return;
    }

    selected.sort(
      (a, b) => a.page - b.page || (a.post.index ?? a.post.id ?? 0) - (b.post.index ?? b.post.id ?? 0),
    );
    const quoteText = formatPostQuotes(selected.map(({ post }) => post));
    const cursor = Math.min(quoteCursorRef.current, textarea.plainText.length);
    const before = textarea.plainText.slice(0, cursor);
    const after = textarea.plainText.slice(cursor);
    const prefix = !before || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
    const suffix = !after ? "\n\n" : after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
    textarea.cursorOffset = cursor;
    textarea.insertText(`${prefix}${quoteText}${suffix}`);
    setSelectedQuotes(new Map<string, SelectedQuote>());
    setStatus(`Inserted ${selected.length} quote${selected.length === 1 ? "" : "s"}.`);
    closeQuotePicker();
  }

  // Upload a local image, then drop a [IMG]url[/IMG] tag at the cursor. `cleanup`
  // removes the file afterwards (used for the temp file from a clipboard paste).
  const uploadAndInsert = useCallback(
    async (localPath: string, cleanup = false) => {
      if (!upload?.host) {
        setStatus("Image upload is not configured.");
        return;
      }
      setStatus("Uploading image...");
      try {
        const url = await uploadImageFile(localPath, upload);
        bodyRef.current?.insertText(`[IMG]${url}[/IMG]`);
        setStatus("Image uploaded.");
      } catch (e) {
        setStatus("Upload failed: " + errMsg(e));
      } finally {
        if (cleanup) unlink(localPath).catch(() => {});
      }
    },
    [upload],
  );

  // Dragging an image into the terminal arrives as a paste of its file path.
  // Intercept it (preventDefault stops the textarea inserting the raw path),
  // upload, and insert the tag instead. Non-image pastes fall through normally.
  useEffect(() => {
    const ta = bodyRef.current;
    if (!ta) return;
    ta.onPaste = (event) => {
      const path = parseDroppedImagePath(new TextDecoder().decode(event.bytes));
      if (path && upload?.host) {
        event.preventDefault();
        void uploadAndInsert(path);
      }
    };
    return () => {
      if (bodyRef.current) bodyRef.current.onPaste = undefined;
    };
  }, [upload, uploadAndInsert]);

  async function pasteClipboardImage() {
    if (!upload?.host) {
      setStatus("Image upload is not configured.");
      return;
    }
    setStatus("Reading clipboard...");
    const tmp = await clipboardImageToTempFile();
    if (!tmp) {
      setStatus("No image on the clipboard.");
      return;
    }
    await uploadAndInsert(tmp, true);
  }

  async function submit() {
    if (busy) return;
    const body = bodyRef.current?.plainText ?? "";
    if (!body.trim()) {
      setStatus("Message is empty.");
      return;
    }
    setBusy(true);
    setStatus("Posting...");
    try {
      const res =
        props.mode === "reply"
          ? await client.reply(props.threadId, body)
          : await client.newThread(props.forumId, subject.trim() || "(no subject)", body);
      if (res.ok) {
        onDone();
        return;
      }
      setStatus(res.error ?? "Post failed.");
    } catch (e) {
      setStatus(errMsg(e));
    }
    setBusy(false);
  }

  useKeyboard((key) => {
    if (busy) return;
    const n = String(key.name);
    const ctrl = Boolean((key as { ctrl?: boolean }).ctrl);
    if (quoteOpen) {
      if ((ctrl && n === "q") || n === "escape") closeQuotePicker();
      else if (!ctrl && n === "space") toggleCurrentQuote();
      else if (!ctrl && n === "n") changeQuotePage(1);
      else if (!ctrl && n === "p") changeQuotePage(-1);
      return;
    }
    if (ctrl && n === "q" && mode === "reply") openQuotePicker();
    else if (ctrl && n === "e") {
      if (emojiOpen) closeEmojiPicker();
      else {
        setEmojiOpen(true);
        setFocus("emoji");
      }
    }
    else if (n === "escape" && emojiOpen) closeEmojiPicker();
    else if (n === "escape") onCancel();
    else if (ctrl && (n === "s" || n === "return" || n === "enter")) submit();
    else if (ctrl && n === "v") void pasteClipboardImage();
    else if (n === "tab" && mode === "thread" && !emojiOpen) {
      setFocus((f) => (f === "subject" ? "body" : "subject"));
    }
  });

  const heading = mode === "reply" ? "Reply to: " + title : "New thread in: " + title;
  const uploadHint = upload?.host ? " · drag image / Ctrl+V paste image" : "";
  const quoteOptions = (quoteContext?.posts ?? []).map((post, index) => {
    const page = quoteContext?.page ?? 1;
    const selected = selectedQuotes.has(selectedQuoteKey(post, page, index));
    return {
      name: `${selected ? "[x]" : "[ ]"} #${post.index ?? post.id ?? "?"} ${post.author}`,
      description: quotePreview(post),
      value: { post, page } satisfies SelectedQuote,
    };
  });
  const regularHints = `Ctrl+S send${mode === "reply" ? " · Ctrl+Q quote" : ""} · Ctrl+E emoji · Esc cancel${
    mode === "thread" ? " · Tab subject/body" : ""
  }${uploadHint}`;

  return (
    <box style={{ flexDirection: "column", flexGrow: 1 }}>
      <Header title="GFY  ·  Compose" right={mode === "reply" ? "reply" : "new thread"} />
      <box style={{ flexDirection: "column", flexGrow: 1, padding: 1, gap: 1 }}>
        <text fg={theme.accent2}>{heading}</text>
        {mode === "thread" ? (
          <box title="Subject" style={{ border: true, height: 3 }}>
            <input placeholder="thread title" focused={focus === "subject"} onInput={setSubject} />
          </box>
        ) : null}
        {quoteOpen && mode === "reply" ? (
          <box
            title={`Quote posts  ·  page ${quoteContext?.page ?? "?"}/${quoteContext?.totalPages ?? "?"}`}
            style={{ border: true, height: 10, flexDirection: "column" }}
          >
            {quoteLoading ? (
              <text fg={theme.dim}>Loading posts...</text>
            ) : quoteError && quoteOptions.length === 0 ? (
              <text fg={theme.red}>{quoteError}</text>
            ) : quoteOptions.length === 0 ? (
              <text fg={theme.dim}>No posts found on this page.</text>
            ) : (
              <select
                options={quoteOptions}
                selectedIndex={Math.min(quoteIndex, quoteOptions.length - 1)}
                showDescription={true}
                showScrollIndicator={true}
                wrapSelection={true}
                focused={focus === "quotes"}
                onChange={(index) => setQuoteIndex(index)}
                onSelect={(_, option) => insertSelectedQuotes(option?.value as SelectedQuote | undefined)}
                style={{ flexGrow: 1 }}
              />
            )}
            <text fg={quoteError ? theme.red : theme.dim}>
              {quoteError || `${selectedQuotes.size} selected  ·  Space toggle  ·  Enter insert  ·  n/p page  ·  Esc close`}
            </text>
          </box>
        ) : emojiOpen ? (
          <box title="Emoji  ·  ←/→ choose  ·  Enter insert  ·  Esc close" style={{ border: true, height: 3 }}>
            <tab-select
              options={COMPOSER_EMOJIS}
              tabWidth={4}
              showDescription={false}
              showUnderline={false}
              showScrollArrows={true}
              wrapSelection={true}
              focused={focus === "emoji"}
              onSelect={(_, option) => insertEmoji(option?.value)}
              style={{ flexGrow: 1, height: 1 }}
            />
          </box>
        ) : null}
        <box title="Message" style={{ border: true, flexGrow: 1 }}>
          <textarea ref={bodyRef} placeholder="Write your post (BBCode allowed)..." focused={focus === "body"} />
        </box>
      </box>
      <StatusBar
        hints={quoteOpen ? "↑/↓ choose · Space toggle · Enter insert · n/p page · Esc close" : regularHints}
        status={busy ? "posting..." : status || undefined}
      />
    </box>
  );
}
