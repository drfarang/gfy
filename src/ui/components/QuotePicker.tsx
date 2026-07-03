import { selectedQuoteKey, type SelectedQuote } from "../composer";
import { truncate } from "../format";
import { quoteBody } from "../quotes";
import { theme } from "../theme";
import type { QuoteContext } from "../types";
import type { Post } from "../../vb/types";

function quotePreview(post: Post): string {
  return truncate(quoteBody(post.body).replace(/\s+/g, " ") || "(no text)", 90);
}

export interface QuotePickerProps {
  context?: QuoteContext;
  index: number;
  selectedQuotes: ReadonlyMap<string, SelectedQuote>;
  loading: boolean;
  error: string;
  focused: boolean;
  onIndexChange: (index: number) => void;
  onInsert: (fallback?: SelectedQuote) => void;
}

export function QuotePicker({
  context,
  index,
  selectedQuotes,
  loading,
  error,
  focused,
  onIndexChange,
  onInsert,
}: QuotePickerProps) {
  const options = (context?.posts ?? []).map((post, optionIndex) => {
    const page = context?.page ?? 1;
    const selected = selectedQuotes.has(selectedQuoteKey(post, page, optionIndex));
    return {
      name: `${selected ? "[x]" : "[ ]"} #${post.index ?? post.id ?? "?"} ${post.author}`,
      description: quotePreview(post),
      value: { post, page } satisfies SelectedQuote,
    };
  });

  return (
    <box
      title={`Quote posts  ·  page ${context?.page ?? "?"}/${context?.totalPages ?? "?"}`}
      style={{ border: true, height: 10, flexDirection: "column" }}
    >
      {loading ? (
        <text fg={theme.dim}>Loading posts...</text>
      ) : error && options.length === 0 ? (
        <text fg={theme.red}>{error}</text>
      ) : options.length === 0 ? (
        <text fg={theme.dim}>No posts found on this page.</text>
      ) : (
        <select
          options={options}
          selectedIndex={Math.min(index, options.length - 1)}
          showDescription={true}
          showScrollIndicator={true}
          wrapSelection={true}
          focused={focused}
          onChange={onIndexChange}
          onSelect={(_, option) => onInsert(option?.value as SelectedQuote | undefined)}
          style={{ flexGrow: 1 }}
        />
      )}
      <text fg={error ? theme.red : theme.dim}>
        {error || `${selectedQuotes.size} selected  ·  Space toggle  ·  Enter insert  ·  n/p page  ·  Esc close`}
      </text>
    </box>
  );
}
