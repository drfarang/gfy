#!/usr/bin/env bun
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { loadConfig, loadSession } from "./config";
import { applyTheme } from "./ui/theme";
import { App } from "./ui/App";

const config = await loadConfig();
const session = await loadSession();

// Apply the persisted theme before the first render.
applyTheme(config.theme);

// useThread: false keeps all terminal output on the main thread so the Kitty
// graphics escapes we emit (see ui/kitty.ts) can't interleave with the native
// frame writer.
const renderer = await createCliRenderer({ useThread: false });
createRoot(renderer).render(<App config={config} initialSession={session} />);
