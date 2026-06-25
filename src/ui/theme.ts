// Color palettes. OpenTUI accepts hex strings for fg / backgroundColor.
//
// `theme` is a single live object that every component reads at render time.
// Switching themes mutates it in place (see applyTheme) and the App forces a
// re-render, so the whole UI re-colors instantly - including module-level
// helpers that read `theme.*` directly.

export interface Theme {
  fg: string;
  dim: string;
  accent: string;
  accent2: string;
  green: string;
  yellow: string;
  red: string;
  cyan: string;
  bg: string;
  panel: string;
  selBg: string;
  selFg: string;
  border: string;
}

export const themes: Record<string, Theme> = {
  "tokyo-night": {
    fg: "#c0caf5", dim: "#565f89", accent: "#7aa2f7", accent2: "#bb9af7",
    green: "#9ece6a", yellow: "#e0af68", red: "#f7768e", cyan: "#7dcfff",
    bg: "#1a1b26", panel: "#1f2335", selBg: "#283457", selFg: "#ffffff", border: "#3b4261",
  },
  catppuccin: {
    fg: "#cdd6f4", dim: "#6c7086", accent: "#89b4fa", accent2: "#cba6f7",
    green: "#a6e3a1", yellow: "#f9e2af", red: "#f38ba8", cyan: "#94e2d5",
    bg: "#1e1e2e", panel: "#181825", selBg: "#313244", selFg: "#ffffff", border: "#45475a",
  },
  gruvbox: {
    fg: "#ebdbb2", dim: "#928374", accent: "#83a598", accent2: "#d3869b",
    green: "#b8bb26", yellow: "#fabd2f", red: "#fb4934", cyan: "#8ec07c",
    bg: "#282828", panel: "#1d2021", selBg: "#3c3836", selFg: "#fbf1c7", border: "#504945",
  },
  dracula: {
    fg: "#f8f8f2", dim: "#6272a4", accent: "#bd93f9", accent2: "#ff79c6",
    green: "#50fa7b", yellow: "#f1fa8c", red: "#ff5555", cyan: "#8be9fd",
    bg: "#282a36", panel: "#21222c", selBg: "#44475a", selFg: "#ffffff", border: "#44475a",
  },
  nord: {
    fg: "#d8dee9", dim: "#4c566a", accent: "#88c0d0", accent2: "#b48ead",
    green: "#a3be8c", yellow: "#ebcb8b", red: "#bf616a", cyan: "#8fbcbb",
    bg: "#2e3440", panel: "#272c36", selBg: "#3b4252", selFg: "#eceff4", border: "#434c5e",
  },
  "rose-pine": {
    fg: "#e0def4", dim: "#6e6a86", accent: "#9ccfd8", accent2: "#c4a7e7",
    green: "#31748f", yellow: "#f6c177", red: "#eb6f92", cyan: "#ebbcba",
    bg: "#191724", panel: "#1f1d2e", selBg: "#26233a", selFg: "#e0def4", border: "#403d52",
  },
  latte: {
    fg: "#4c4f69", dim: "#8c8fa1", accent: "#1e66f5", accent2: "#8839ef",
    green: "#40a02b", yellow: "#df8e1d", red: "#d20f39", cyan: "#179299",
    bg: "#eff1f5", panel: "#e6e9ef", selBg: "#ccd0da", selFg: "#4c4f69", border: "#bcc0cc",
  },
};

export const themeNames = Object.keys(themes);

/** The live, mutable active theme. Components read this at render time. */
export const theme: Theme = { ...themes["tokyo-night"]! };

/** Swap the active palette in place. Returns true if the name was known. */
export function applyTheme(name: string): boolean {
  const t = themes[name];
  if (!t) return false;
  Object.assign(theme, t);
  return true;
}

/** Next theme name after `name`, wrapping around. */
export function nextThemeName(name: string): string {
  const i = themeNames.indexOf(name);
  return themeNames[(i + 1) % themeNames.length]!;
}
