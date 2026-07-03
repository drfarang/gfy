// Omarchy-style theme palettes. OpenTUI accepts hex strings for fg /
// backgroundColor, so each Omarchy `colors.toml` palette is mapped into the
// smaller set of semantic roles this app already uses.
//
// Palette values mirror Basecamp Omarchy theme files:
// https://github.com/basecamp/omarchy/tree/dev/themes
// Omarchy is MIT licensed, copyright David Heinemeier Hansson.
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
  quoteFg: string;
  quoteMeta: string;
  quoteBar: string;
}

export interface FieldThemeProps {
  backgroundColor: string;
  focusedBackgroundColor: string;
  textColor: string;
  focusedTextColor: string;
  placeholderColor: string;
  cursorColor: string;
}

interface OmarchyPalette {
  accent: string;
  active_border_color?: string;
  active_tab_background?: string;
  cursor: string;
  foreground: string;
  background: string;
  selection_foreground: string;
  selection_background: string;
  color0: string;
  color1: string;
  color2: string;
  color3: string;
  color4: string;
  color5: string;
  color6: string;
  color7: string;
  color8: string;
  color9: string;
  color10: string;
  color11: string;
  color12: string;
  color13: string;
  color14: string;
  color15: string;
}

export const omarchyPalettes = {
  "catppuccin-latte": {
    accent: "#1e66f5", cursor: "#dc8a78", foreground: "#4c4f69", background: "#eff1f5",
    selection_foreground: "#eff1f5", selection_background: "#dc8a78",
    color0: "#bcc0cc", color1: "#d20f39", color2: "#40a02b", color3: "#df8e1d",
    color4: "#1e66f5", color5: "#ea76cb", color6: "#179299", color7: "#5c5f77",
    color8: "#acb0be", color9: "#d20f39", color10: "#40a02b", color11: "#df8e1d",
    color12: "#1e66f5", color13: "#ea76cb", color14: "#179299", color15: "#6c6f85",
  },
  catppuccin: {
    accent: "#89b4fa", cursor: "#f5e0dc", foreground: "#cdd6f4", background: "#1e1e2e",
    selection_foreground: "#1e1e2e", selection_background: "#f5e0dc",
    color0: "#45475a", color1: "#f38ba8", color2: "#a6e3a1", color3: "#f9e2af",
    color4: "#89b4fa", color5: "#f5c2e7", color6: "#94e2d5", color7: "#bac2de",
    color8: "#585b70", color9: "#f38ba8", color10: "#a6e3a1", color11: "#f9e2af",
    color12: "#89b4fa", color13: "#f5c2e7", color14: "#94e2d5", color15: "#a6adc8",
  },
  ethereal: {
    accent: "#7d82d9", cursor: "#ffcead", foreground: "#ffcead", background: "#060B1E",
    selection_foreground: "#060B1E", selection_background: "#ffcead",
    color0: "#3C486D", color1: "#ED5B5A", color2: "#92a593", color3: "#E9BB4F",
    color4: "#7d82d9", color5: "#c89dc1", color6: "#a3bfd1", color7: "#F99957",
    color8: "#6d7db6", color9: "#faaaa9", color10: "#c4cfc4", color11: "#f7dc9c",
    color12: "#c2c4f0", color13: "#ead7e7", color14: "#dfeaf0", color15: "#ffcead",
  },
  everforest: {
    accent: "#7fbbb3", cursor: "#d3c6aa", foreground: "#d3c6aa", background: "#2d353b",
    selection_foreground: "#2d353b", selection_background: "#d3c6aa",
    color0: "#475258", color1: "#e67e80", color2: "#a7c080", color3: "#dbbc7f",
    color4: "#7fbbb3", color5: "#d699b6", color6: "#83c092", color7: "#d3c6aa",
    color8: "#475258", color9: "#e67e80", color10: "#a7c080", color11: "#dbbc7f",
    color12: "#7fbbb3", color13: "#d699b6", color14: "#83c092", color15: "#d3c6aa",
  },
  "flexoki-light": {
    accent: "#205EA6", cursor: "#100F0F", foreground: "#100F0F", background: "#FFFCF0",
    selection_foreground: "#100F0F", selection_background: "#CECDC3",
    color0: "#DAD8CE", color1: "#D14D41", color2: "#879A39", color3: "#D0A215",
    color4: "#205EA6", color5: "#CE5D97", color6: "#3AA99F", color7: "#B7B5AC",
    color8: "#100F0F", color9: "#D14D41", color10: "#879A39", color11: "#D0A215",
    color12: "#4385BE", color13: "#CE5D97", color14: "#3AA99F", color15: "#CECDC3",
  },
  gruvbox: {
    accent: "#7daea3", cursor: "#bdae93", foreground: "#d4be98", background: "#282828",
    selection_foreground: "#ebdbb2", selection_background: "#d65d0e",
    color0: "#3c3836", color1: "#ea6962", color2: "#a9b665", color3: "#d8a657",
    color4: "#7daea3", color5: "#d3869b", color6: "#89b482", color7: "#d4be98",
    color8: "#3c3836", color9: "#ea6962", color10: "#a9b665", color11: "#d8a657",
    color12: "#7daea3", color13: "#d3869b", color14: "#89b482", color15: "#d4be98",
  },
  hackerman: {
    accent: "#82FB9C", cursor: "#ddf7ff", foreground: "#ddf7ff", background: "#0B0C16",
    selection_foreground: "#0B0C16", selection_background: "#ddf7ff",
    color0: "#3E4058", color1: "#50f872", color2: "#4fe88f", color3: "#50f7d4",
    color4: "#829dd4", color5: "#86a7df", color6: "#7cf8f7", color7: "#85E1FB",
    color8: "#6a6e95", color9: "#85ff9d", color10: "#9cf7c2", color11: "#a4ffec",
    color12: "#c4d2ed", color13: "#cddbf4", color14: "#d1fffe", color15: "#ddf7ff",
  },
  kanagawa: {
    accent: "#7e9cd8", cursor: "#c8c093", foreground: "#dcd7ba", background: "#1f1f28",
    selection_foreground: "#c8c093", selection_background: "#2d4f67",
    color0: "#090618", color1: "#c34043", color2: "#76946a", color3: "#c0a36e",
    color4: "#7e9cd8", color5: "#957fb8", color6: "#6a9589", color7: "#c8c093",
    color8: "#727169", color9: "#e82424", color10: "#98bb6c", color11: "#e6c384",
    color12: "#7fb4ca", color13: "#938aa9", color14: "#7aa89f", color15: "#dcd7ba",
  },
  "last-horizon": {
    accent: "#b59790", active_border_color: "#d6d3de", active_tab_background: "#a5a0b6",
    cursor: "#e2dddc", foreground: "#FAFCFB", background: "#0c0b0c",
    selection_foreground: "#0c0b0c", selection_background: "#FAFCFB",
    color0: "#0c0b0c", color1: "#c38b7b", color2: "#87a9b0", color3: "#6B5E73",
    color4: "#b59790", color5: "#c4d8e2", color6: "#a5a0b6", color7: "#cfd3cd",
    color8: "#584e51", color9: "#c38b7b", color10: "#87a9b0", color11: "#6B5E73",
    color12: "#b59790", color13: "#c4d8e2", color14: "#a5a0b6", color15: "#e2dddc",
  },
  lumon: {
    accent: "#8bc9eb", active_border_color: "#f2fcff", active_tab_background: "#6fb8e3",
    cursor: "#f2fcff", foreground: "#d6e2ee", background: "#16242d",
    selection_foreground: "#1b2d40", selection_background: "#4d9ed3",
    color0: "#1b2d40", color1: "#4d86b0", color2: "#5e95bc", color3: "#6fa4c9",
    color4: "#6fb8e3", color5: "#8bc9eb", color6: "#b4e4f6", color7: "#d6e2ee",
    color8: "#304860", color9: "#73a6cb", color10: "#86b7d8", color11: "#9dcae5",
    color12: "#f2fcff", color13: "#b1d8ee", color14: "#d1eef8", color15: "#ffffff",
  },
  "matte-black": {
    accent: "#e68e0d", cursor: "#eaeaea", foreground: "#bebebe", background: "#121212",
    selection_foreground: "#bebebe", selection_background: "#515151",
    color0: "#333333", color1: "#D35F5F", color2: "#FFC107", color3: "#b91c1c",
    color4: "#e68e0d", color5: "#D35F5F", color6: "#bebebe", color7: "#bebebe",
    color8: "#8a8a8d", color9: "#B91C1C", color10: "#FFC107", color11: "#b90a0a",
    color12: "#f59e0b", color13: "#B91C1C", color14: "#eaeaea", color15: "#ffffff",
  },
  miasma: {
    accent: "#78824b", cursor: "#c7c7c7", foreground: "#c2c2b0", background: "#222222",
    selection_foreground: "#c2c2b0", selection_background: "#78824b",
    color0: "#000000", color1: "#685742", color2: "#5f875f", color3: "#b36d43",
    color4: "#78824b", color5: "#bb7744", color6: "#c9a554", color7: "#d7c483",
    color8: "#666666", color9: "#685742", color10: "#5f875f", color11: "#b36d43",
    color12: "#78824b", color13: "#bb7744", color14: "#c9a554", color15: "#d7c483",
  },
  nord: {
    accent: "#81a1c1", cursor: "#d8dee9", foreground: "#d8dee9", background: "#2e3440",
    selection_foreground: "#d8dee9", selection_background: "#4c566a",
    color0: "#3b4252", color1: "#bf616a", color2: "#a3be8c", color3: "#ebcb8b",
    color4: "#81a1c1", color5: "#b48ead", color6: "#88c0d0", color7: "#e5e9f0",
    color8: "#4c566a", color9: "#bf616a", color10: "#a3be8c", color11: "#ebcb8b",
    color12: "#81a1c1", color13: "#b48ead", color14: "#8fbcbb", color15: "#eceff4",
  },
  "osaka-jade": {
    accent: "#509475", cursor: "#D7C995", foreground: "#C1C497", background: "#111c18",
    selection_foreground: "#111C18", selection_background: "#C1C497",
    color0: "#23372B", color1: "#FF5345", color2: "#549e6a", color3: "#459451",
    color4: "#509475", color5: "#D2689C", color6: "#2DD5B7", color7: "#F6F5DD",
    color8: "#53685B", color9: "#db9f9c", color10: "#63b07a", color11: "#E5C736",
    color12: "#ACD4CF", color13: "#75bbb3", color14: "#8CD3CB", color15: "#9eebb3",
  },
  "retro-82": {
    accent: "#faa968", active_border_color: "#faa968", active_tab_background: "#faa968",
    cursor: "#f6dcac", foreground: "#f6dcac", background: "#05182e",
    selection_foreground: "#00172e", selection_background: "#faa968",
    color0: "#303442", color1: "#f85525", color2: "#028391", color3: "#e97b3c",
    color4: "#faa968", color5: "#3f8f8a", color6: "#8cbfb8", color7: "#a7c9c6",
    color8: "#134e5a", color9: "#f85525", color10: "#028391", color11: "#e97b3c",
    color12: "#faa968", color13: "#3f8f8a", color14: "#8cbfb8", color15: "#f6dcac",
  },
  ristretto: {
    accent: "#f38d70", cursor: "#c3b7b8", foreground: "#e6d9db", background: "#2c2525",
    selection_foreground: "#e6d9db", selection_background: "#403e41",
    color0: "#72696a", color1: "#fd6883", color2: "#adda78", color3: "#f9cc6c",
    color4: "#f38d70", color5: "#a8a9eb", color6: "#85dacc", color7: "#e6d9db",
    color8: "#948a8b", color9: "#ff8297", color10: "#c8e292", color11: "#fcd675",
    color12: "#f8a788", color13: "#bebffd", color14: "#9bf1e1", color15: "#f1e5e7",
  },
  "rose-pine": {
    accent: "#56949f", cursor: "#cecacd", foreground: "#575279", background: "#faf4ed",
    selection_foreground: "#575279", selection_background: "#dfdad9",
    color0: "#f2e9e1", color1: "#b4637a", color2: "#286983", color3: "#ea9d34",
    color4: "#56949f", color5: "#907aa9", color6: "#d7827e", color7: "#575279",
    color8: "#9893a5", color9: "#b4637a", color10: "#286983", color11: "#ea9d34",
    color12: "#56949f", color13: "#907aa9", color14: "#d7827e", color15: "#575279",
  },
  solitude: {
    accent: "#798186", active_border_color: "#a8adb0", active_tab_background: "#798186",
    cursor: "#cacccc", foreground: "#cacccc", background: "#101315",
    selection_foreground: "#101315", selection_background: "#798186",
    color0: "#101315", color1: "#565d60", color2: "#9fa5a9", color3: "#d9dbdc",
    color4: "#798186", color5: "#aeaeae", color6: "#707070", color7: "#cbc2be",
    color8: "#4b4e55", color9: "#de6145", color10: "#343d41", color11: "#c9c2b4",
    color12: "#5d6367", color13: "#9a9a9a", color14: "#707070", color15: "#a5aeb4",
  },
  "tokyo-night": {
    accent: "#7aa2f7", cursor: "#c0caf5", foreground: "#a9b1d6", background: "#1a1b26",
    selection_foreground: "#c0caf5", selection_background: "#7aa2f7",
    color0: "#32344a", color1: "#f7768e", color2: "#9ece6a", color3: "#e0af68",
    color4: "#7aa2f7", color5: "#ad8ee6", color6: "#449dab", color7: "#787c99",
    color8: "#444b6a", color9: "#ff7a93", color10: "#b9f27c", color11: "#ff9e64",
    color12: "#7da6ff", color13: "#bb9af7", color14: "#0db9d7", color15: "#acb0d0",
  },
  vantablack: {
    accent: "#8d8d8d", cursor: "#ffffff", foreground: "#ffffff", background: "#000000",
    selection_foreground: "#000000", selection_background: "#ffffff",
    color0: "#404040", color1: "#a4a4a4", color2: "#b6b6b6", color3: "#cecece",
    color4: "#8d8d8d", color5: "#9b9b9b", color6: "#b0b0b0", color7: "#ececec",
    color8: "#5c5c5c", color9: "#a4a4a4", color10: "#b6b6b6", color11: "#cecece",
    color12: "#8d8d8d", color13: "#9b9b9b", color14: "#b0b0b0", color15: "#ffffff",
  },
  white: {
    accent: "#6e6e6e", cursor: "#000000", foreground: "#000000", background: "#ffffff",
    selection_foreground: "#ffffff", selection_background: "#1a1a1a",
    color0: "#c0c0c0", color1: "#2a2a2a", color2: "#3a3a3a", color3: "#4a4a4a",
    color4: "#1a1a1a", color5: "#2e2e2e", color6: "#3e3e3e", color7: "#000000",
    color8: "#c0c0c0", color9: "#2a2a2a", color10: "#3a3a3a", color11: "#4a4a4a",
    color12: "#1a1a1a", color13: "#2e2e2e", color14: "#3e3e3e", color15: "#000000",
  },
} satisfies Record<string, OmarchyPalette>;

const DEFAULT_THEME = "tokyo-night";

const aliases: Record<string, keyof typeof omarchyPalettes> = {
  latte: "catppuccin-latte",
};

export const themeNames = Object.keys(omarchyPalettes);

export const themes: Record<string, Theme> = Object.fromEntries(
  [...themeNames, ...Object.keys(aliases)].map((name) => [name, deriveTheme(omarchyPalettes[resolveThemeName(name)]!)]),
);

/** The live, mutable active theme. Components read this at render time. */
export const theme: Theme = { ...themes[DEFAULT_THEME]! };

/** Resolve old/local aliases to canonical Omarchy theme names. */
export function resolveThemeName(name: string | undefined): keyof typeof omarchyPalettes {
  if (!name) return DEFAULT_THEME;
  if (name in omarchyPalettes) return name as keyof typeof omarchyPalettes;
  return aliases[name] ?? DEFAULT_THEME;
}

/** Swap the active palette in place. Returns true if the name was known. */
export function applyTheme(name: string): boolean {
  const resolved = resolveKnownThemeName(name);
  if (!resolved) return false;
  Object.assign(theme, themes[resolved]);
  return true;
}

/** Next theme name after `name`, wrapping around. */
export function nextThemeName(name: string): string {
  const resolved = resolveThemeName(name);
  const i = themeNames.indexOf(resolved);
  return themeNames[(i + 1) % themeNames.length]!;
}

/** Explicit OpenTUI input/textarea colors; their defaults assume dark themes. */
export function fieldThemeProps(): FieldThemeProps {
  return {
    backgroundColor: theme.bg,
    focusedBackgroundColor: theme.bg,
    textColor: theme.fg,
    focusedTextColor: theme.fg,
    placeholderColor: theme.dim,
    cursorColor: theme.accent,
  };
}

function resolveKnownThemeName(name: string): keyof typeof omarchyPalettes | undefined {
  if (name in omarchyPalettes) return name as keyof typeof omarchyPalettes;
  return aliases[name];
}

function deriveTheme(p: OmarchyPalette): Theme {
  return {
    fg: p.foreground,
    dim: p.color8,
    accent: p.accent,
    accent2: p.active_tab_background ?? p.color13,
    green: p.color2,
    yellow: p.color3,
    red: p.color1,
    cyan: p.color6,
    bg: p.background,
    panel: p.color0,
    selBg: p.selection_background,
    selFg: p.selection_foreground,
    border: p.active_border_color ?? p.color8,
    quoteFg: p.foreground,
    quoteMeta: p.accent,
    quoteBar: p.accent,
  };
}
