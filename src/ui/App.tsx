import { useEffect, useMemo, useRef, useState } from "react";
import { useKeyboard, useRenderer } from "@opentui/react";
import { VbClient } from "../vb/client";
import type { AppConfig } from "../config";
import { saveSession, clearSession, saveConfig } from "../config";
import type { Session } from "../vb/types";
import { useNav } from "./hooks";
import type { Screen } from "./types";
import { theme, applyTheme, nextThemeName, themes } from "./theme";
import { Loading, FooterContext } from "./components/chrome";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoginScreen } from "./screens/LoginScreen";
import { ForumListScreen } from "./screens/ForumListScreen";
import { ThreadListScreen } from "./screens/ThreadListScreen";
import { ThreadViewScreen } from "./screens/ThreadViewScreen";
import { ComposeScreen } from "./screens/ComposeScreen";

// The app can open directly into a forum's thread list rather than the forum
// index (config.defaultForumId; null = forum list). The forum list is kept
// underneath on the stack, so "back" from the thread list still reaches it.
function homeStack(config: AppConfig): Screen[] {
  const id = config.defaultForumId;
  if (id == null) return [{ kind: "forums" }];
  // f=26 is the built-in default; its real title fills in once threads load.
  const title = id === 26 ? "Fucking Around & Business Discussion" : "";
  return [{ kind: "forums" }, { kind: "threads", forumId: id, title }];
}

export function App({ config, initialSession }: { config: AppConfig; initialSession: Session | null }) {
  const renderer = useRenderer();
  const client = useMemo(() => new VbClient(config, initialSession), [config, initialSession]);
  const nav = useNav(initialSession ? homeStack(config) : { kind: "login" });
  const [booting, setBooting] = useState(Boolean(initialSession));

  // Theme switching: `themeRef` always holds the live name (no stale closure),
  // `themeTick` just forces a re-render so the mutated `theme` re-colors the UI.
  const themeRef = useRef(themes[config.theme] ? config.theme : "tokyo-night");
  const [, setThemeTick] = useState(0);
  const cycleTheme = () => {
    const next = nextThemeName(themeRef.current);
    themeRef.current = next;
    applyTheme(next);
    setThemeTick((n) => n + 1);
    saveConfig({ ...config, theme: next });
  };

  // Global footer (key-hint bar) visibility; toggled with Ctrl+F.
  const [footerVisible, setFooterVisible] = useState(true);

  // Re-validate a restored session before trusting it. Runs exactly once on
  // mount: `nav`'s identity changes every render, so it must NOT be a dep (and
  // its setters are stable anyway) or this would re-fire and reset navigation.
  const verifiedRef = useRef(false);
  useEffect(() => {
    if (!initialSession || verifiedRef.current) return;
    verifiedRef.current = true;
    let cancelled = false;
    client
      .verify()
      .then((ok) => {
        if (cancelled) return;
        if (ok) {
          const s = client.sessionData();
          if (s) saveSession(s).catch(() => {});
          nav.reset(homeStack(config));
        } else {
          nav.reset({ kind: "login" });
        }
      })
      .catch(() => !cancelled && nav.reset({ kind: "login" }))
      .finally(() => !cancelled && setBooting(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, initialSession]);

  useKeyboard((key) => {
    const ctrl = Boolean((key as { ctrl?: boolean }).ctrl);
    if (ctrl && String(key.name) === "c") renderer.destroy();
    else if (ctrl && String(key.name) === "t") cycleTheme();
    else if (ctrl && String(key.name) === "f") setFooterVisible((v) => !v);
  });

  if (booting) {
    return (
      <box style={{ flexGrow: 1, backgroundColor: theme.bg }}>
        <Loading label="Restoring session..." />
      </box>
    );
  }

  const persist = () => {
    const s = client.sessionData();
    if (s) saveSession(s).catch(() => {});
  };

  const screen = nav.current;
  return (
    <FooterContext.Provider value={footerVisible}>
      <box style={{ flexGrow: 1, backgroundColor: theme.bg }}>
        <ErrorBoundary resetKey={screen} onReset={() => nav.reset(homeStack(config))}>
          {renderScreen()}
        </ErrorBoundary>
      </box>
    </FooterContext.Provider>
  );

  function renderScreen() {
    switch (screen.kind) {
    case "login":
      return (
        <LoginScreen
          client={client}
          onAuthed={() => {
            persist();
            nav.reset(homeStack(config));
          }}
          onBrowseAsGuest={() => nav.reset(homeStack(config))}
        />
      );
    case "forums":
      return (
        <ForumListScreen
          client={client}
          username={client.username}
          onOpen={(f) => nav.push({ kind: "threads", forumId: f.id, title: f.title })}
          onQuit={() => renderer.destroy()}
          onLogin={() => nav.reset({ kind: "login" })}
          onLogout={async () => {
            await client.logout();
            await clearSession();
            nav.reset({ kind: "login" });
          }}
        />
      );
    case "threads":
      return (
        <ThreadListScreen
          client={client}
          forumId={screen.forumId}
          title={screen.title}
          username={client.username}
          onOpen={(t) => nav.push({ kind: "thread", threadId: t.id, title: t.title })}
          onBack={() => nav.pop()}
          onNewThread={() => nav.push({ kind: "composeThread", forumId: screen.forumId, title: screen.title })}
        />
      );
    case "thread":
      return (
        <ThreadViewScreen
          client={client}
          threadId={screen.threadId}
          title={screen.title}
          username={client.username}
          onReply={() => nav.push({ kind: "composeReply", threadId: screen.threadId, title: screen.title })}
          onBack={() => nav.pop()}
        />
      );
    case "composeReply":
      return (
        <ComposeScreen
          client={client}
          mode="reply"
          threadId={screen.threadId}
          title={screen.title}
          onDone={() => nav.pop()}
          onCancel={() => nav.pop()}
        />
      );
    case "composeThread":
      return (
        <ComposeScreen
          client={client}
          mode="thread"
          forumId={screen.forumId}
          title={screen.title}
          onDone={() => nav.pop()}
          onCancel={() => nav.pop()}
        />
      );
    }
  }
}
