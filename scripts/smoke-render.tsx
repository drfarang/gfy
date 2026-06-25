// Renders one screen (with real guest data where needed) for a few seconds then
// exits, to verify OpenTUI renders each screen type on this machine.
//   bun run scripts/smoke-render.tsx [login|forums|threads|thread|compose]
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import type { ReactNode } from "react";
import { loadConfig } from "../src/config";
import { VbClient } from "../src/vb/client";
import { LoginScreen } from "../src/ui/screens/LoginScreen";
import { ForumListScreen } from "../src/ui/screens/ForumListScreen";
import { ThreadListScreen } from "../src/ui/screens/ThreadListScreen";
import { ThreadViewScreen } from "../src/ui/screens/ThreadViewScreen";
import { ComposeScreen } from "../src/ui/screens/ComposeScreen";

const which = process.argv[2] ?? "login";
const config = await loadConfig();
const client = new VbClient({ ...config, requestDelayMs: 300 });
const noop = () => {};

let element: ReactNode;
if (which === "forums") {
  element = <ForumListScreen client={client} onOpen={noop} onQuit={noop} onLogout={noop} />;
} else if (which === "threads") {
  element = <ThreadListScreen client={client} forumId={26} title="Fucking Around" onOpen={noop} onBack={noop} onNewThread={noop} />;
} else if (which === "thread") {
  const list = await client.threads(26, 1);
  const t = list.items.find((x) => !x.sticky) ?? list.items[0];
  element = <ThreadViewScreen client={client} threadId={t?.id ?? 1} title={t?.title ?? "Test"} onReply={noop} onBack={noop} />;
} else if (which === "compose") {
  element = <ComposeScreen client={client} mode="reply" threadId={1} title="Test thread" onDone={noop} onCancel={noop} />;
} else {
  element = <LoginScreen client={client} onAuthed={noop} />;
}

const renderer = await createCliRenderer();
createRoot(renderer).render(element);
setTimeout(() => {
  try {
    renderer.destroy();
  } catch {}
  process.exit(0);
}, 5000);
