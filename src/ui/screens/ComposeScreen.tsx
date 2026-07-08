import { Header, StatusBar } from "../components/chrome";
import { EmojiPicker } from "../components/EmojiPicker";
import { QuotePicker } from "../components/QuotePicker";
import type { ComposeScreenProps } from "../composer";
import { useComposerController } from "../hooks/useComposerController";
import { fieldThemeProps, theme } from "../theme";

export function ComposeScreen(props: ComposeScreenProps) {
  const { bodyRef, subjectRef, state, setSubject, setQuoteIndex, insertEmoji, insertSelectedQuotes } =
    useComposerController(props);
  const heading = props.mode === "reply" ? "Reply to: " + props.title : "New thread in: " + props.title;
  const uploadHint = props.upload?.host ? " · drag image / Ctrl+V paste image" : "";
  const regularHints = `Ctrl+S send${props.mode === "reply" ? " · Ctrl+Q quote" : ""} · Ctrl+E emoji · Ctrl+Y copy · Esc cancel${
    props.mode === "thread" ? " · Tab subject/body" : ""
  }${uploadHint}`;
  const fieldColors = fieldThemeProps();

  return (
    <box style={{ flexDirection: "column", flexGrow: 1 }}>
      <Header title="GFY  ·  Compose" right={props.mode === "reply" ? "reply" : "new thread"} />
      <box style={{ flexDirection: "column", flexGrow: 1, padding: 1, gap: 1 }}>
        <text fg={theme.accent2}>{heading}</text>
        {props.mode === "thread" ? (
          <box title="Subject" style={{ border: true, height: 3 }}>
            <input
              {...fieldColors}
              ref={subjectRef}
              placeholder="thread title"
              focused={state.focus === "subject"}
              onInput={setSubject}
            />
          </box>
        ) : null}
        {state.quoteOpen && props.mode === "reply" ? (
          <QuotePicker
            context={state.quoteContext}
            index={state.quoteIndex}
            selectedQuotes={state.selectedQuotes}
            loading={state.quoteLoading}
            error={state.quoteError}
            focused={state.focus === "quotes"}
            onIndexChange={setQuoteIndex}
            onInsert={insertSelectedQuotes}
          />
        ) : state.emojiOpen ? (
          <EmojiPicker focused={state.focus === "emoji"} onSelect={insertEmoji} />
        ) : null}
        <box title="Message" style={{ border: true, flexGrow: 1 }}>
          <textarea
            {...fieldColors}
            ref={bodyRef}
            placeholder="Write your post (BBCode allowed)..."
            focused={state.focus === "body"}
          />
        </box>
      </box>
      <StatusBar
        hints={state.quoteOpen ? "↑/↓ choose · Space toggle · Enter insert · n/p page · Esc close" : regularHints}
        status={state.busy ? "posting..." : state.status || undefined}
      />
    </box>
  );
}
