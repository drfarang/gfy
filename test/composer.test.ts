import { describe, expect, test } from "bun:test";
import {
  composerReducer,
  createComposerState,
  createQuoteInsertion,
  selectedQuoteKey,
  type SelectedQuote,
} from "../src/ui/composer";
import type { Post } from "../src/vb/types";

function post(id: number, author: string, body = `Post ${id}`): Post {
  return { id, author, body, index: id };
}

describe("composerReducer", () => {
  test("initializes focus for the compose mode", () => {
    expect(createComposerState("reply").focus).toBe("body");
    expect(createComposerState("thread").focus).toBe("subject");
  });

  test("keeps pickers mutually exclusive and restores body focus when they close", () => {
    let state = composerReducer(createComposerState("reply"), { type: "openEmoji" });
    expect(state).toMatchObject({ emojiOpen: true, quoteOpen: false, focus: "emoji" });

    state = composerReducer(state, { type: "openQuotes" });
    expect(state).toMatchObject({ emojiOpen: false, quoteOpen: true, focus: "quotes" });

    state = composerReducer({ ...state, quoteError: "failed" }, { type: "closeQuotes" });
    expect(state).toMatchObject({ quoteOpen: false, focus: "body", quoteError: "" });
  });

  test("tracks quote loading, pages, and errors as one transition", () => {
    const context = { posts: [post(4, "Alice")], page: 2, totalPages: 3 };
    let state = composerReducer(createComposerState("reply"), { type: "quoteLoadStarted" });
    expect(state).toMatchObject({ quoteLoading: true, quoteError: "" });

    state = composerReducer({ ...state, quoteIndex: 8 }, { type: "quoteLoadSucceeded", context });
    expect(state).toMatchObject({ quoteLoading: false, quoteContext: context, quoteIndex: 0 });

    state = composerReducer(state, { type: "quoteLoadFailed", error: "network down" });
    expect(state).toMatchObject({ quoteLoading: false, quoteError: "network down" });
  });

  test("toggles selected quotes without mutating the previous map", () => {
    const state = createComposerState("reply");
    const selected: SelectedQuote = { post: post(9, "Bob"), page: 2 };
    const key = selectedQuoteKey(selected.post, selected.page, 0);

    const added = composerReducer(state, { type: "toggleQuote", key, quote: selected });
    expect(added.selectedQuotes.get(key)).toEqual(selected);
    expect(state.selectedQuotes.size).toBe(0);

    const removed = composerReducer(added, { type: "toggleQuote", key, quote: selected });
    expect(removed.selectedQuotes.size).toBe(0);
    expect(added.selectedQuotes.size).toBe(1);
  });

  test("finishes quote insertion and failed submission consistently", () => {
    let state = composerReducer(createComposerState("reply"), { type: "openQuotes" });
    state = composerReducer(state, {
      type: "toggleQuote",
      key: "post:1",
      quote: { post: post(1, "Alice"), page: 1 },
    });
    state = composerReducer(state, { type: "quotesInserted", count: 1 });
    expect(state).toMatchObject({ quoteOpen: false, focus: "body", status: "Inserted 1 quote." });
    expect(state.selectedQuotes.size).toBe(0);

    state = composerReducer(state, { type: "submitStarted" });
    expect(state).toMatchObject({ busy: true, status: "Posting..." });
    state = composerReducer(state, { type: "submitFailed", error: "Post failed." });
    expect(state).toMatchObject({ busy: false, status: "Post failed." });
  });
});

describe("createQuoteInsertion", () => {
  test("sorts selected posts by page and post position", () => {
    const selected: SelectedQuote[] = [
      { post: post(8, "Later"), page: 2 },
      { post: post(3, "Earlier"), page: 1 },
    ];
    const insertion = createQuoteInsertion("intro\nrest", 5, selected);

    expect(insertion?.count).toBe(2);
    expect(insertion?.cursor).toBe(5);
    expect(insertion?.text.indexOf("Earlier;3")).toBeLessThan(insertion!.text.indexOf("Later;8"));
    expect(insertion?.text.startsWith("\n\n")).toBe(true);
    expect(insertion?.text.endsWith("\n")).toBe(true);
  });

  test("uses an Enter-selected fallback only when nothing is checked", () => {
    const fallback = { post: post(5, "Fallback"), page: 1 };
    expect(createQuoteInsertion("", 0, [], fallback)?.count).toBe(1);
    expect(createQuoteInsertion("", 0, [])).toBeNull();
  });
});
