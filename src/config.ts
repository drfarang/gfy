import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir, readFile, writeFile, chmod, unlink } from "node:fs/promises";
import type { Session } from "./vb/types";

export interface AppConfig {
  baseUrl: string;
  userAgent: string;
  /** Minimum gap between HTTP requests, ms. Keeps us a good citizen. */
  requestDelayMs: number;
  /** Editor used for composing posts. */
  editor: string;
  /** Active color theme name (see ui/theme.ts). */
  theme: string;
  /** Forum to open on launch instead of the forum list. null = forum list. */
  defaultForumId: number | null;
  /** Image upload target for replies. uploadHost "" disables the feature. */
  uploadHost: string;
  uploadDir: string;
  uploadBaseUrl: string;
}

const DEFAULTS: AppConfig = {
  baseUrl: "https://www.gfy.com",
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  requestDelayMs: 800,
  editor: process.env.EDITOR || process.env.VISUAL || "vi",
  theme: "tokyo-night",
  // "Fucking Around & Business Discussion" (f=26). Set to null to land on the
  // forum list instead.
  defaultForumId: 26,
  // Image upload is opt-in and disabled by default so no personal server details
  // ship in the repo. Configure it in your local config.json (see configDir()):
  //   "uploadHost": "<your ssh host/alias>",
  //   "uploadDir": "/var/www/your-pics-dir",
  //   "uploadBaseUrl": "https://your-pics-host/"
  uploadHost: "",
  uploadDir: "",
  uploadBaseUrl: "",
};

export function configDir(): string {
  return process.env.GFYTUI_DIR ?? join(homedir(), ".config", "gfytui");
}

function sessionPath(): string {
  return join(configDir(), "session.json");
}

function configPath(): string {
  return join(configDir(), "config.json");
}

export async function loadConfig(): Promise<AppConfig> {
  try {
    const raw = await readFile(configPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    return {
      baseUrl: parsed.baseUrl ?? DEFAULTS.baseUrl,
      userAgent: parsed.userAgent ?? DEFAULTS.userAgent,
      requestDelayMs: parsed.requestDelayMs ?? DEFAULTS.requestDelayMs,
      editor: parsed.editor ?? DEFAULTS.editor,
      theme: parsed.theme ?? DEFAULTS.theme,
      defaultForumId: parsed.defaultForumId === undefined ? DEFAULTS.defaultForumId : parsed.defaultForumId,
      uploadHost: parsed.uploadHost ?? DEFAULTS.uploadHost,
      uploadDir: parsed.uploadDir ?? DEFAULTS.uploadDir,
      uploadBaseUrl: parsed.uploadBaseUrl ?? DEFAULTS.uploadBaseUrl,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

/** Persist config.json (used e.g. to remember the chosen theme). Best-effort. */
export async function saveConfig(config: AppConfig): Promise<void> {
  try {
    await mkdir(configDir(), { recursive: true, mode: 0o700 });
    await writeFile(configPath(), JSON.stringify(config, null, 2), "utf8");
  } catch {
    /* ignore - a missing pref file just falls back to defaults next run */
  }
}

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = await readFile(sessionPath(), "utf8");
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export async function saveSession(session: Session): Promise<void> {
  await mkdir(configDir(), { recursive: true, mode: 0o700 });
  const path = sessionPath();
  await writeFile(path, JSON.stringify({ ...session, savedAt: Date.now() }, null, 2), {
    mode: 0o600,
  });
  // writeFile honours `mode` only on create; chmod guarantees perms on overwrite too.
  await chmod(path, 0o600).catch(() => {});
}

export async function clearSession(): Promise<void> {
  await unlink(sessionPath()).catch(() => {});
}
