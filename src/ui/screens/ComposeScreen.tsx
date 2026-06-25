import { useRef, useState } from "react";
import { useKeyboard } from "@opentui/react";
import type { TextareaRenderable } from "@opentui/core";
import type { VbClient } from "../../vb/client";
import { errMsg } from "../hooks";
import { Header, StatusBar } from "../components/chrome";
import { theme } from "../theme";

type Props = {
  client: VbClient;
  title: string;
  onDone: () => void;
  onCancel: () => void;
} & ({ mode: "reply"; threadId: number } | { mode: "thread"; forumId: number });

export function ComposeScreen(props: Props) {
  const { client, mode, title, onDone, onCancel } = props;
  const bodyRef = useRef<TextareaRenderable>(null);
  const [subject, setSubject] = useState("");
  const [focus, setFocus] = useState<"subject" | "body">(mode === "thread" ? "subject" : "body");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

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
    if (n === "escape") onCancel();
    else if (ctrl && (n === "s" || n === "return" || n === "enter")) submit();
    else if (n === "tab" && mode === "thread") setFocus((f) => (f === "subject" ? "body" : "subject"));
  });

  const heading = mode === "reply" ? "Reply to: " + title : "New thread in: " + title;

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
        <box title="Message" style={{ border: true, flexGrow: 1 }}>
          <textarea ref={bodyRef} placeholder="Write your post (BBCode allowed)..." focused={focus === "body"} />
        </box>
      </box>
      <StatusBar
        hints={`Ctrl+S send · Esc cancel${mode === "thread" ? " · Tab subject/body" : ""}`}
        status={busy ? "posting..." : status || undefined}
      />
    </box>
  );
}
