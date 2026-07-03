// Renders one screen (with real guest data where needed) for a few seconds then
// exits, to verify OpenTUI renders each screen type on this machine.
//   bun run scripts/smoke-render.tsx [login|forums|threads|thread|settings|compose] [theme]
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import type { ReactNode } from "react";
import { loadConfig } from "../src/config";
import { VbClient } from "../src/vb/client";
import { LoginScreen } from "../src/ui/screens/LoginScreen";
import { ForumListScreen } from "../src/ui/screens/ForumListScreen";
import { ThreadListScreen } from "../src/ui/screens/ThreadListScreen";
import { ThreadViewScreen } from "../src/ui/screens/ThreadViewScreen";
import { SettingsScreen } from "../src/ui/screens/SettingsScreen";
import { ComposeScreen } from "../src/ui/screens/ComposeScreen";
import { applyTheme } from "../src/ui/theme";

const which = process.argv[2] ?? "login";
const themeName = process.argv[3];
const config = { ...(await loadConfig()), ...(themeName ? { theme: themeName } : {}) };
applyTheme(config.theme);
const client = new VbClient({ ...config, requestDelayMs: 300 });
const noop = () => {};
const homeForum = {
  id: 33,
  title: "Fucking Around & Business Discussion",
  path: "/forum/simply-business/fucking-around-business-discussion",
};

let element: ReactNode;
if (which === "forums") {
  element = <ForumListScreen client={client} onOpen={noop} onQuit={noop} onLogout={noop} />;
} else if (which === "threads") {
  element = (
    <ThreadListScreen
      client={client}
      forumId={homeForum.id}
      forumPath={homeForum.path}
      title={homeForum.title}
      onOpen={noop}
      onBack={noop}
      onNewThread={noop}
    />
  );
} else if (which === "thread") {
  const list = await client.threads(homeForum.id, 1, homeForum.path);
  const t = list.items.find((x) => !x.sticky) ?? list.items[0];
  element = (
    <ThreadViewScreen
      client={client}
      threadId={t?.id ?? 1}
      threadPath={t?.path}
      title={t?.title ?? "Test"}
      onReply={noop}
      onBack={noop}
    />
  );
} else if (which === "settings") {
  element = <SettingsScreen config={config} onThemeChange={noop} onSave={noop} onCancel={noop} />;
} else if (which === "compose") {
  element = <ComposeScreen client={client} mode="reply" threadId={1} title="Test thread" onDone={noop} onCancel={noop} />;
} else {
  element = <LoginScreen client={client} onAuthed={noop} />;
}

const renderer = await createCliRenderer();
createRoot(renderer).render(element);
const timeoutMs = which === "threads" ? 9000 : 5000;
setTimeout(() => {
  try {
    renderer.destroy();
  } catch {}
  process.exit(0);
}, timeoutMs);
