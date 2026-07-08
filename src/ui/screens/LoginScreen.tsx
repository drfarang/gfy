import { useState } from "react";
import { useKeyboard } from "@opentui/react";
import type { VbClient } from "../../vb/client";
import { errMsg } from "../hooks";
import { Header, StatusBar } from "../components/chrome";
import { theme, fieldThemeProps } from "../theme";

type Mode = "password" | "cookie";
type Focus = "user" | "pass" | "cookie";

export function LoginScreen({ client, onAuthed, onBrowseAsGuest }: { client: VbClient; onAuthed: () => void; onBrowseAsGuest?: () => void }) {
  const [mode, setMode] = useState<Mode>("password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [cookie, setCookie] = useState("");
  const [focus, setFocus] = useState<Focus>("user");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const fieldColors = fieldThemeProps();

  async function submit() {
    if (busy) return;
    setBusy(true);
    setStatus("Signing in...");
    try {
      const res =
        mode === "password"
          ? await client.login(username.trim(), password)
          : await client.loginWithCookies(cookie.trim());
      if (res.ok) {
        onAuthed();
        return;
      }
      setStatus(res.error ?? "Login failed");
    } catch (e) {
      setStatus(errMsg(e));
    }
    setBusy(false);
  }

  useKeyboard((key) => {
    if (busy) return;
    const n = String(key.name);
    const ctrl = Boolean((key as { ctrl?: boolean }).ctrl);
    if (ctrl && n === "k") {
      setMode((m) => (m === "password" ? "cookie" : "password"));
      setFocus(mode === "password" ? "cookie" : "user");
      setStatus("");
    } else if (n === "tab" && mode === "password") {
      setFocus((f) => (f === "user" ? "pass" : "user"));
    } else if (((ctrl && n === "g") || n === "escape") && onBrowseAsGuest) {
      onBrowseAsGuest();
    }
  });

  return (
    <box style={{ flexDirection: "column", flexGrow: 1 }}>
      <Header title="GFY  ·  Sign in" right={mode === "password" ? "password mode" : "cookie mode"} />
      <box style={{ flexGrow: 1, alignItems: "center", justifyContent: "center" }}>
        <box style={{ border: true, borderColor: theme.border, padding: 1, flexDirection: "column", gap: 1, width: 60 }}>
          {mode === "password" ? (
            <>
              <box title="Username" style={{ border: true, height: 3 }}>
                <input
                  {...fieldColors}
                  placeholder="your GFY username"
                  focused={focus === "user"}
                  onInput={setUsername}
                  onSubmit={submit}
                />
              </box>
              <box title="Password (typed in clear)" style={{ border: true, height: 3 }}>
                <input
                  {...fieldColors}
                  placeholder="your password"
                  focused={focus === "pass"}
                  onInput={setPassword}
                  onSubmit={submit}
                />
              </box>
              <text fg={theme.dim}>Tab switches fields · Enter signs in · Ctrl+K cookies · Ctrl+G/esc browse as guest</text>
            </>
          ) : (
            <>
              <box title="Cookie string" style={{ border: true, height: 3 }}>
                <input
                  {...fieldColors}
                  placeholder="bbuserid=..; bbpassword=..; bbsessionhash=.."
                  focused={focus === "cookie"}
                  onInput={setCookie}
                  onSubmit={submit}
                />
              </box>
              <text fg={theme.dim}>Paste cookies from logged-in browser · Enter signs in · Ctrl+K password · Ctrl+G/esc browse as guest</text>
            </>
          )}
        </box>
      </box>
      <StatusBar hints="Ctrl+C quit" status={busy ? "..." : status || undefined} />
    </box>
  );
}
