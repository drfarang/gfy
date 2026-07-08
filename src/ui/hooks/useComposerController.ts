import { useCallback, useReducer, useRef } from "react";
import { useKeyboard, useRenderer } from "@opentui/react";
import type { InputRenderable, TextareaRenderable } from "@opentui/core";
import {
  composerReducer,
  createComposerState,
  createQuoteInsertion,
  selectedQuoteKey,
  type ComposeScreenProps,
  type SelectedQuote,
} from "../composer";
import { errMsg } from "../hooks";
import { useComposerUploads } from "./useComposerUploads";

export function useComposerController(props: ComposeScreenProps) {
  const renderer = useRenderer();
  const initialQuoteContext = props.mode === "reply" ? props.quoteContext : undefined;
  const [state, dispatch] = useReducer(
    composerReducer,
    createComposerState(props.mode, initialQuoteContext),
  );
  const bodyRef = useRef<TextareaRenderable>(null);
  const subjectRef = useRef<InputRenderable>(null);
  const quoteCursorRef = useRef(0);
  const quoteRequestRef = useRef(0);

  const setStatus = useCallback((status: string) => dispatch({ type: "statusChanged", status }), []);
  const { pasteClipboardImage } = useComposerUploads({ bodyRef, upload: props.upload, onStatus: setStatus });

  function closeEmojiPicker() {
    dispatch({ type: "closeEmoji" });
  }

  function insertEmoji(value: unknown) {
    if (typeof value !== "string") return;
    bodyRef.current?.insertText(value);
    closeEmojiPicker();
  }

  function closeQuotePicker() {
    dispatch({ type: "closeQuotes" });
  }

  async function loadQuotePage(page: number | "last") {
    if (props.mode !== "reply" || state.quoteLoading) return;
    const request = ++quoteRequestRef.current;
    dispatch({ type: "quoteLoadStarted" });
    try {
      const result = await props.client.thread(props.threadId, page, props.threadPath);
      if (request !== quoteRequestRef.current) return;
      dispatch({
        type: "quoteLoadSucceeded",
        context: { posts: result.items, page: result.page, totalPages: result.totalPages },
      });
    } catch (error) {
      if (request === quoteRequestRef.current) {
        dispatch({ type: "quoteLoadFailed", error: errMsg(error) });
      }
    }
  }

  function openQuotePicker() {
    if (props.mode !== "reply") return;
    quoteCursorRef.current = bodyRef.current?.cursorOffset ?? 0;
    dispatch({ type: "openQuotes" });
    if (!state.quoteContext || state.quoteContext.posts.length === 0) {
      void loadQuotePage(state.quoteContext?.page ?? "last");
    }
  }

  function changeQuotePage(direction: number) {
    const context = state.quoteContext;
    if (!context || state.quoteLoading) return;
    const page = Math.max(1, Math.min(context.totalPages, context.page + direction));
    if (page !== context.page) void loadQuotePage(page);
  }

  function toggleCurrentQuote() {
    const post = state.quoteContext?.posts[state.quoteIndex];
    if (!post || !state.quoteContext) return;
    const page = state.quoteContext.page;
    dispatch({
      type: "toggleQuote",
      key: selectedQuoteKey(post, page, state.quoteIndex),
      quote: { post, page },
    });
  }

  function insertSelectedQuotes(fallback?: SelectedQuote) {
    const textarea = bodyRef.current;
    if (!textarea) return;
    const insertion = createQuoteInsertion(
      textarea.plainText,
      quoteCursorRef.current,
      state.selectedQuotes.values(),
      fallback,
    );
    if (!insertion) {
      dispatch({ type: "quoteInsertFailed" });
      return;
    }

    textarea.cursorOffset = insertion.cursor;
    textarea.insertText(insertion.text);
    dispatch({ type: "quotesInserted", count: insertion.count });
  }

  async function submit() {
    if (state.busy) return;
    const body = bodyRef.current?.plainText ?? "";
    if (!body.trim()) {
      setStatus("Message is empty.");
      return;
    }
    dispatch({ type: "submitStarted" });
    try {
      const result =
        props.mode === "reply"
          ? await props.client.reply(props.threadId, body, props.threadPath)
          : await props.client.newThread(props.forumId, state.subject.trim() || "(no subject)", body, props.forumPath);
      if (result.ok) {
        props.onDone();
        return;
      }
      dispatch({ type: "submitFailed", error: result.error ?? "Post failed." });
    } catch (error) {
      dispatch({ type: "submitFailed", error: errMsg(error) });
    }
  }

  // Ctrl+C is reserved app-wide to quit (App.tsx), so selection-copy lives on
  // Ctrl+Y instead. Cmd+C can't be bound here at all - terminals intercept it
  // for their own native (mouse-drag) selection and never forward it as a key.
  function copySelection() {
    const activeRef = state.focus === "subject" ? subjectRef : bodyRef;
    const text = activeRef.current?.getSelectedText();
    if (!text) {
      setStatus("No text selected (Shift+arrows to select).");
      return;
    }
    const copied = renderer.copyToClipboardOSC52(text);
    setStatus(copied ? "Copied selection to clipboard." : "Terminal doesn't support clipboard copy (OSC 52).");
  }

  useKeyboard((key) => {
    if (state.busy) return;
    const name = String(key.name);
    const ctrl = Boolean((key as { ctrl?: boolean }).ctrl);
    if (state.quoteOpen) {
      if ((ctrl && name === "q") || name === "escape") closeQuotePicker();
      else if (!ctrl && name === "space") toggleCurrentQuote();
      else if (!ctrl && name === "n") changeQuotePage(1);
      else if (!ctrl && name === "p") changeQuotePage(-1);
      return;
    }
    if (ctrl && name === "q" && props.mode === "reply") openQuotePicker();
    else if (ctrl && name === "e") {
      if (state.emojiOpen) closeEmojiPicker();
      else dispatch({ type: "openEmoji" });
    } else if (name === "escape" && state.emojiOpen) closeEmojiPicker();
    else if (name === "escape") props.onCancel();
    else if (ctrl && (name === "s" || name === "return" || name === "enter")) void submit();
    else if (ctrl && name === "v") void pasteClipboardImage();
    else if (ctrl && name === "y") copySelection();
    else if (name === "tab" && props.mode === "thread" && !state.emojiOpen) {
      dispatch({ type: "toggleFormFocus" });
    }
  });

  return {
    bodyRef,
    subjectRef,
    state,
    setSubject: (subject: string) => dispatch({ type: "subjectChanged", subject }),
    setQuoteIndex: (index: number) => dispatch({ type: "quoteIndexChanged", index }),
    insertEmoji,
    insertSelectedQuotes,
  };
}
