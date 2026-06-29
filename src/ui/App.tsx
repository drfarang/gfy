import { useEffect, useMemo, useRef, useState } from "react";
import { useKeyboard, useRenderer } from "@opentui/react";
import { VbClient } from "../vb/client";
import type { AppConfig } from "../config";
import { saveSession, clearSession, saveConfig } from "../config";
import type { Session } from "../vb/types";
import { useTabs, type Stack } from "./tabs";
import type { Screen } from "./types";
import type { UploadTarget } from "../util/upload";
import { theme, applyTheme, nextThemeName, themes } from "./theme";
import { Loading, FooterContext } from "./components/chrome";
import { TabBar } from "./components/TabBar";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoginScreen } from "./screens/LoginScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ForumListScreen } from "./screens/ForumListScreen";
import { ThreadListScreen } from "./screens/ThreadListScreen";
import { ThreadViewScreen } from "./screens/ThreadViewScreen";
import { ComposeScreen } from "./screens/ComposeScreen";

// The app can open directly into a forum's thread list rather than the forum
// index (config.defaultForumId; null = forum list). The forum list is kept
// underneath on the stack, so "back" from the thread list still reaches it.
function homeStack(config: AppConfig): Stack {
  const id = config.defaultForumId;
  if (id == null) return [{ kind: "forums" }];
  // f=26 is the built-in default; its real title fills in once threads load.
  const title = id === 26 ? "Fucking Around & Business Discussion" : "";
  return [{ kind: "forums" }, { kind: "threads", forumId: id, title }];
}

export function App({ config: initialConfig, initialSession }: { config: AppConfig; initialSession: Session | null }) {
  const renderer = useRenderer();
  // Live config so the Settings screen can change things at runtime. The client
  // only depends on the network fields (not editable in-app), so editing upload
  // or theme settings never rebuilds it / drops the session.
  const [config, setConfig] = useState(initialConfig);
  const client = useMemo(
    () => new VbClient(config, initialSession),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.baseUrl, config.userAgent, config.requestDelayMs, initialSession],
  );
  const nav = useTabs(initialSession ? homeStack(initialConfig) : [{ kind: "login" }]);
  const [booting, setBooting] = useState(Boolean(initialSession));

  // Image-upload target for replies (undefined disables the feature).
  const upload = useMemo<UploadTarget | undefined>(
    () => (config.uploadHost ? { host: config.uploadHost, dir: config.uploadDir, baseUrl: config.uploadBaseUrl } : undefined),
    [config.uploadHost, config.uploadDir, config.uploadBaseUrl],
  );

  // Theme switching: `themeRef` always holds the live name (no stale closure),
  // `themeTick` just forces a re-render so the mutated `theme` re-colors the UI.
  const themeRef = useRef(themes[config.theme] ? config.theme : "tokyo-night");
  const [, setThemeTick] = useState(0);
  const applyAndPersistTheme = (next: string) => {
    themeRef.current = next;
    applyTheme(next);
    setThemeTick((n) => n + 1);
  };
  const cycleTheme = () => {
    const next = nextThemeName(themeRef.current);
    applyAndPersistTheme(next);
    setConfig((c) => {
      const updated = { ...c, theme: next };
      saveConfig(updated);
      return updated;
    });
  };

  // Persist edited settings, applying the theme immediately.
  const saveSettings = (next: AppConfig) => {
    applyAndPersistTheme(themes[next.theme] ? next.theme : themeRef.current);
    setConfig(next);
    saveConfig(next);
  };

  // Global footer (key-hint bar) visibility; toggled with Ctrl+F.
  const [footerVisible, setFooterVisible] = useState(true);

  // Bumped after a successful reply so the thread view remounts, reloading the
  // last page (where the new post is) instead of showing stale cached data.
  const [threadReload, setThreadReload] = useState(0);

  // Re-validate a restored session before trusting it. Runs exactly once on
  // mount: `nav` includes live navigation state, so it must NOT be a dep (its
  // action methods are stable) or later navigation would re-fire this effect.
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
    const modifiers = key as { ctrl?: boolean; meta?: boolean; option?: boolean; super?: boolean };
    const ctrl = Boolean(modifiers.ctrl);
    const plain = !ctrl && !modifiers.meta && !modifiers.option && !modifiers.super;
    const name = String(key.name);
    // Screens with a focused text field, where plain keys are real input.
    const kind = nav.current.kind;
    const typing = kind === "login" || kind === "settings" || kind === "composeReply" || kind === "composeThread";
    if (plain) {
      if (typing) return;
      // `,` opens Settings; digits select a tab; `[`/`]` cycle with wrapping.
      if (name === ",") nav.push({ kind: "settings" });
      else if (name === "[") nav.switchTo((nav.active - 1 + nav.count) % nav.count);
      else if (name === "]") nav.switchTo((nav.active + 1) % nav.count);
      else if (/^[1-9]$/.test(name)) nav.switchTo(Number(name) - 1);
      return;
    }
    if (!ctrl) return;
    if (name === "c") return renderer.destroy();
    if (name === "t") return cycleTheme();
    if (name === "f") return setFooterVisible((v) => !v);
    // Tab close—but not while a text field is focused, where Ctrl+W deletes a word.
    if (typing) return;
    if (name === "w") nav.closeTab();
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
      <box style={{ flexDirection: "column", flexGrow: 1, backgroundColor: theme.bg }}>
        <TabBar tabs={nav.tabs} active={nav.active} />
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
    case "settings":
      return (
        <SettingsScreen
          config={config}
          onSave={(next) => {
            saveSettings(next);
            nav.pop();
          }}
          onCancel={() => nav.pop()}
        />
      );
    case "forums":
      return (
        <ForumListScreen
          client={client}
          username={client.username}
          onOpen={(f) => nav.push({ kind: "threads", forumId: f.id, title: f.title })}
          onOpenInTab={(f) => nav.openInTab({ kind: "threads", forumId: f.id, title: f.title })}
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
          onOpenInTab={(t) => nav.openInTab({ kind: "thread", threadId: t.id, title: t.title })}
          onBack={() => nav.pop()}
          onNewThread={() => nav.push({ kind: "composeThread", forumId: screen.forumId, title: screen.title })}
        />
      );
    case "thread":
      return (
        <ThreadViewScreen
          key={`thread-${screen.threadId}-${threadReload}`}
          client={client}
          threadId={screen.threadId}
          title={screen.title}
          username={client.username}
          onReply={(quoteContext) =>
            nav.push({ kind: "composeReply", threadId: screen.threadId, title: screen.title, quoteContext })
          }
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
          quoteContext={screen.quoteContext}
          upload={upload}
          onDone={() => {
            nav.pop();
            setThreadReload((n) => n + 1); // remount the thread -> reload last page
          }}
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
          upload={upload}
          onDone={() => nav.pop()}
          onCancel={() => nav.pop()}
        />
      );
    }
  }
}
