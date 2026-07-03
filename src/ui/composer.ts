import type { VbClient } from "../vb/client";
import type { Post } from "../vb/types";
import type { UploadTarget } from "../util/upload";
import { formatPostQuotes } from "./quotes";
import type { QuoteContext } from "./types";

export type ComposeScreenProps = {
  client: VbClient;
  title: string;
  upload?: UploadTarget;
  onDone: () => void;
  onCancel: () => void;
} & (
  | { mode: "reply"; threadId: number; threadPath?: string; quoteContext?: QuoteContext }
  | { mode: "thread"; forumId: number }
);

export type ComposerFocus = "subject" | "body" | "emoji" | "quotes";

export interface SelectedQuote {
  post: Post;
  page: number;
}

export interface ComposerState {
  subject: string;
  focus: ComposerFocus;
  emojiOpen: boolean;
  quoteOpen: boolean;
  quoteContext?: QuoteContext;
  quoteIndex: number;
  selectedQuotes: ReadonlyMap<string, SelectedQuote>;
  quoteLoading: boolean;
  quoteError: string;
  status: string;
  busy: boolean;
}

export type ComposerAction =
  | { type: "subjectChanged"; subject: string }
  | { type: "toggleFormFocus" }
  | { type: "openEmoji" }
  | { type: "closeEmoji" }
  | { type: "openQuotes" }
  | { type: "closeQuotes" }
  | { type: "quoteLoadStarted" }
  | { type: "quoteLoadSucceeded"; context: QuoteContext }
  | { type: "quoteLoadFailed"; error: string }
  | { type: "quoteIndexChanged"; index: number }
  | { type: "toggleQuote"; key: string; quote: SelectedQuote }
  | { type: "quoteInsertFailed" }
  | { type: "quotesInserted"; count: number }
  | { type: "statusChanged"; status: string }
  | { type: "submitStarted" }
  | { type: "submitFailed"; error: string };

export function createComposerState(
  mode: ComposeScreenProps["mode"],
  quoteContext?: QuoteContext,
): ComposerState {
  return {
    subject: "",
    focus: mode === "thread" ? "subject" : "body",
    emojiOpen: false,
    quoteOpen: false,
    quoteContext,
    quoteIndex: 0,
    selectedQuotes: new Map(),
    quoteLoading: false,
    quoteError: "",
    status: "",
    busy: false,
  };
}

/** Pure state transitions for composer form, picker, request, and posting state. */
export function composerReducer(state: ComposerState, action: ComposerAction): ComposerState {
  switch (action.type) {
    case "subjectChanged":
      return { ...state, subject: action.subject };
    case "toggleFormFocus":
      return { ...state, focus: state.focus === "subject" ? "body" : "subject" };
    case "openEmoji":
      return { ...state, emojiOpen: true, quoteOpen: false, focus: "emoji" };
    case "closeEmoji":
      return { ...state, emojiOpen: false, focus: "body" };
    case "openQuotes":
      return { ...state, emojiOpen: false, quoteOpen: true, focus: "quotes" };
    case "closeQuotes":
      return { ...state, quoteOpen: false, focus: "body", quoteError: "" };
    case "quoteLoadStarted":
      return { ...state, quoteLoading: true, quoteError: "" };
    case "quoteLoadSucceeded":
      return {
        ...state,
        quoteContext: action.context,
        quoteIndex: 0,
        quoteLoading: false,
      };
    case "quoteLoadFailed":
      return { ...state, quoteLoading: false, quoteError: action.error };
    case "quoteIndexChanged":
      return { ...state, quoteIndex: action.index };
    case "toggleQuote": {
      const selectedQuotes = new Map(state.selectedQuotes);
      if (selectedQuotes.has(action.key)) selectedQuotes.delete(action.key);
      else selectedQuotes.set(action.key, action.quote);
      return { ...state, selectedQuotes, quoteError: "" };
    }
    case "quoteInsertFailed":
      return { ...state, quoteError: "Select at least one post with Space." };
    case "quotesInserted":
      return {
        ...state,
        quoteOpen: false,
        focus: "body",
        selectedQuotes: new Map(),
        quoteError: "",
        status: `Inserted ${action.count} quote${action.count === 1 ? "" : "s"}.`,
      };
    case "statusChanged":
      return { ...state, status: action.status };
    case "submitStarted":
      return { ...state, busy: true, status: "Posting..." };
    case "submitFailed":
      return { ...state, busy: false, status: action.error };
  }
}

export function selectedQuoteKey(post: Post, page: number, index: number): string {
  return post.id == null ? `${page}:${post.index ?? index}` : `post:${post.id}`;
}

export interface QuoteInsertion {
  cursor: number;
  text: string;
  count: number;
}

/** Build the exact text inserted into a textarea without mutating the renderable. */
export function createQuoteInsertion(
  body: string,
  cursorOffset: number,
  selectedQuotes: Iterable<SelectedQuote>,
  fallback?: SelectedQuote,
): QuoteInsertion | null {
  const selected = [...selectedQuotes];
  if (selected.length === 0 && fallback) selected.push(fallback);
  if (selected.length === 0) return null;

  selected.sort(
    (a, b) => a.page - b.page || (a.post.index ?? a.post.id ?? 0) - (b.post.index ?? b.post.id ?? 0),
  );
  const cursor = Math.max(0, Math.min(cursorOffset, body.length));
  const before = body.slice(0, cursor);
  const after = body.slice(cursor);
  const prefix = !before || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const suffix = !after ? "\n\n" : after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";

  return {
    cursor,
    text: `${prefix}${formatPostQuotes(selected.map(({ post }) => post))}${suffix}`,
    count: selected.length,
  };
}
