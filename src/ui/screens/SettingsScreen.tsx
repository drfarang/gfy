import { useState } from "react";
import { useKeyboard } from "@opentui/react";
import type { AppConfig } from "../../config";
import { Header, StatusBar } from "../components/chrome";
import { theme, themeNames } from "../theme";

// Editable text fields, in tab order after the theme picker (index 0).
const TEXT_FIELDS = [
  { key: "defaultForumId", label: "Default forum id", hint: "blank = open the forum list" },
  { key: "uploadHost", label: "Upload host", hint: "ssh/scp host or alias; blank disables image upload" },
  { key: "uploadDir", label: "Upload dir", hint: "directory on the host, e.g. /var/www/uploads" },
  { key: "uploadBaseUrl", label: "Upload URL base", hint: "public URL that serves it, e.g. https://uploads.example.com/" },
] as const;

type TextKey = (typeof TEXT_FIELDS)[number]["key"];

export function SettingsScreen({
  config,
  onSave,
  onCancel,
}: {
  config: AppConfig;
  onSave: (next: AppConfig) => void;
  onCancel: () => void;
}) {
  const [themeName, setThemeName] = useState(config.theme);
  const [vals, setVals] = useState<Record<TextKey, string>>({
    defaultForumId: config.defaultForumId == null ? "" : String(config.defaultForumId),
    uploadHost: config.uploadHost,
    uploadDir: config.uploadDir,
    uploadBaseUrl: config.uploadBaseUrl,
  });
  // 0 = theme picker, 1..N = the text fields above.
  const [focus, setFocus] = useState(0);
  const fieldCount = 1 + TEXT_FIELDS.length;

  const cycleTheme = (dir: number) =>
    setThemeName((t) => {
      const i = themeNames.indexOf(t);
      return themeNames[(i + dir + themeNames.length) % themeNames.length]!;
    });

  function save() {
    const did = vals.defaultForumId.trim();
    const forumId = did === "" ? null : Number.isFinite(Number(did)) ? Number(did) : config.defaultForumId;
    onSave({
      ...config,
      theme: themeName,
      defaultForumId: forumId,
      uploadHost: vals.uploadHost.trim(),
      uploadDir: vals.uploadDir.trim(),
      uploadBaseUrl: vals.uploadBaseUrl.trim(),
    });
  }

  useKeyboard((key) => {
    const n = String(key.name);
    const ctrl = Boolean((key as { ctrl?: boolean }).ctrl);
    const shift = Boolean((key as { shift?: boolean }).shift);
    if (ctrl && n === "s") return save();
    if (n === "escape") return onCancel();
    if (n === "tab" || n === "down" || n === "up") {
      const dir = n === "up" || shift ? -1 : 1;
      return setFocus((i) => (i + dir + fieldCount) % fieldCount);
    }
    if (focus === 0) {
      if (n === "right" || n === "return" || n === "enter" || n === "l") cycleTheme(1);
      else if (n === "left" || n === "h") cycleTheme(-1);
    }
  });

  return (
    <box style={{ flexDirection: "column", flexGrow: 1 }}>
      <Header title="GFY  ·  Settings" right="config.json" />
      <box style={{ flexGrow: 1, alignItems: "center", justifyContent: "center" }}>
        <box style={{ border: true, borderColor: theme.border, padding: 1, flexDirection: "column", gap: 1, width: 66 }}>
          {/* Theme picker */}
          <box
            title="Theme"
            style={{ border: true, height: 3, borderColor: focus === 0 ? theme.accent : theme.border }}
          >
            <text fg={theme.fg}>{`  ‹ ${themeName} ›`}</text>
          </box>

          {TEXT_FIELDS.map((f, i) => (
            <box
              key={f.key}
              title={f.label}
              style={{ border: true, height: 3, borderColor: focus === i + 1 ? theme.accent : theme.border }}
            >
              <input
                value={vals[f.key]}
                placeholder={f.hint}
                focused={focus === i + 1}
                onInput={(v: string) => setVals((s) => ({ ...s, [f.key]: v }))}
                onSubmit={save}
              />
            </box>
          ))}
          <text fg={theme.dim}>{TEXT_FIELDS[Math.max(0, focus - 1)]!.hint}</text>
        </box>
      </box>
      <StatusBar hints="Tab/↑↓ move · ←/→ change theme · Ctrl+S save · Esc cancel" />
    </box>
  );
}
